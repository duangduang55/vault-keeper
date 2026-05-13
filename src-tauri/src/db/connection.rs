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

        // 使用 PRAGMA key 设置加密密钥
        let key_hex = hex::encode(key);
        conn.execute_batch(&format!("PRAGMA key = \"x'{}'\";", key_hex))?;

        // 验证密钥是否正确（尝试读取一条记录）
        match conn.query_row("SELECT COUNT(*) FROM sqlite_master", [], |_| Ok(())) {
            Ok(()) => {
                conn.execute_batch(
                    "PRAGMA cipher_memory_security = ON;
                     PRAGMA journal_mode = WAL;
                     PRAGMA foreign_keys = ON;
                     PRAGMA secure_delete = ON;",
                )?;
                Ok(Self { conn })
            }
            Err(e) => Err(AppError::Auth(format!("数据库密钥验证失败: {}", e))),
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
}

/// 获取应用数据库路径
pub fn get_db_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("vault.db")
}
