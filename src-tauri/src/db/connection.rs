use rusqlite::Connection as SqliteConnection;
use std::path::PathBuf;

use crate::error::{AppError, AppResult};

/// SQLCipher 加密数据库连接管理器
pub struct Connection {
    pub conn: SqliteConnection,
}

impl Connection {
    /// 打开数据库连接（不带加密密钥）
    #[allow(dead_code)]
    pub fn open(db_path: &PathBuf) -> AppResult<Self> {
        // 确保父目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = SqliteConnection::open(db_path)?;

        // 设置 SQLCipher 配置以获得更好的安全性
        conn.execute_batch(
            "PRAGMA cipher_memory_security = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA secure_delete = ON;",
        )?;

        Ok(Self { conn })
    }

    /// 使用密钥打开加密数据库
    pub fn open_with_key(db_path: &PathBuf, key: &[u8; 32]) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = SqliteConnection::open(db_path)?;

        // SQLCipher 要求 cipher 相关 PRAGMA 必须在 PRAGMA key 之前设置
        conn.execute_batch(
            "PRAGMA cipher_memory_security = ON;
             PRAGMA secure_delete = ON;",
        )?;

        // 使用 PRAGMA key 设置加密密钥
        let key_hex = hex::encode(key);
        conn.execute_batch(&format!("PRAGMA key = \"x'{}'\";", key_hex))?;

        // 设置非 cipher PRAGMA（这些可以在 key 之后设置）
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;",
        )?;

        // 验证密钥是否正确（尝试读取一条记录）
        match conn.query_row("SELECT COUNT(*) FROM sqlite_master", [], |_| Ok(())) {
            Ok(()) => Ok(Self { conn }),
            Err(_) => Err(AppError::Auth("主密码验证失败，请确认密码正确".to_string())),
        }
    }

    /// 重新加密数据库（更换密钥）
    pub fn rekey(&self, new_key: &[u8; 32]) -> AppResult<()> {
        let key_hex = hex::encode(new_key);
        self.conn
            .execute_batch(&format!("PRAGMA rekey = \"x'{}'\";", key_hex))?;
        Ok(())
    }

    /// 获取内部连接引用
    pub fn inner(&self) -> &SqliteConnection {
        &self.conn
    }

    /// 获取内部连接的可变引用（用于事务等需要 &mut self 的操作）
    pub fn inner_mut(&mut self) -> &mut SqliteConnection {
        &mut self.conn
    }
}

/// 获取应用数据库路径
pub fn get_db_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("vault.db")
}
