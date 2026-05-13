use secrecy::Secret;
use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

use crate::commands::auth::AppState;
use crate::{commands, crypto, db, error::AppError};

/// iCloud Drive 备份目录
pub fn icloud_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join("Library/Mobile Documents/com~apple~CloudDocs/VaultKeeper")
}

/// 检查 iCloud Drive 是否可用
#[tauri::command]
pub async fn get_icloud_status() -> Result<IcloudStatus, AppError> {
    let dir = icloud_dir();
    let available = dir.exists();
    Ok(IcloudStatus {
        available,
        path: dir.to_string_lossy().to_string(),
    })
}

/// 手动备份到 iCloud
#[tauri::command]
pub async fn icloud_backup(
    state: State<'_, AppState>,
    password: String,
) -> Result<IcloudBackupResult, AppError> {
    let key = commands::ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);
    let conn = db::Connection::open_with_key(&db_path, &key)?;

    // 收集所有条目并加密
    let entries = db::EntryRepo::list_all(conn.inner())?;
    let data = serde_json::to_string_pretty(&entries)?;
    let backup_pw = Secret::new(password);
    let encrypted = crypto::backup::encrypt_backup(&backup_pw, data.as_bytes())?;

    // 写入 iCloud Drive
    let dir = icloud_dir();
    std::fs::create_dir_all(&dir)?;

    let now = chrono_now();
    let filename = format!("vault-keeper-backup-{}.bin", now);
    let path = dir.join(&filename);
    std::fs::write(&path, &encrypted)?;

    // 更新上次备份时间戳
    db::MetadataRepo::set(conn.inner(), "last_icloud_backup", &now)?;

    Ok(IcloudBackupResult {
        path: path.to_string_lossy().to_string(),
        filename,
        entry_count: entries.len(),
        size_bytes: encrypted.len(),
    })
}

/// 列出 iCloud 中的备份文件
#[tauri::command]
pub async fn icloud_list_backups() -> Result<Vec<IcloudBackupFile>, AppError> {
    let dir = icloud_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("bin") {
            let metadata = std::fs::metadata(&path)?;
            files.push(IcloudBackupFile {
                filename: path.file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string(),
                size_bytes: metadata.len(),
                modified: metadata.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0),
            });
        }
    }

    // 按修改时间排序（最新的在前）
    files.sort_by_key(|b| std::cmp::Reverse(b.modified));

    Ok(files)
}

/// 从 iCloud 备份中恢复
#[tauri::command]
pub async fn icloud_restore(
    state: State<'_, AppState>,
    password: String,
    filename: String,
) -> Result<IcloudRestoreResult, AppError> {
    let key = commands::ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);
    let conn = db::Connection::open_with_key(&db_path, &key)?;

    let path = icloud_dir().join(&filename);
    if !path.exists() {
        return Err(AppError::Other(format!("备份文件不存在: {}", filename)));
    }

    let backup_pw = Secret::new(password);
    let encrypted = std::fs::read(&path)?;
    let decrypted = crypto::backup::decrypt_backup(&backup_pw, &encrypted)?;

    let entries: Vec<db::entries::Entry> = serde_json::from_slice(&decrypted)?;

    let mut imported = 0u64;
    let mut skipped = 0u64;
    for entry in &entries {
        let exists = conn.inner().query_row(
            "SELECT 1 FROM entries WHERE id = ?1",
            rusqlite::params![entry.id],
            |_| Ok(()),
        ).is_ok();

        if exists {
            skipped += 1;
        } else {
            conn.inner().execute(
                "INSERT INTO entries (id, entry_type, name, fields, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    entry.id, entry.entry_type, entry.name,
                    entry.fields, entry.created_at, entry.updated_at,
                ],
            )?;
            imported += 1;
        }
    }

    Ok(IcloudRestoreResult { imported, skipped })
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    now.to_string()
}

// --- 响应类型 ---

#[derive(Debug, Clone, Serialize)]
pub struct IcloudStatus {
    pub available: bool,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct IcloudBackupResult {
    pub path: String,
    pub filename: String,
    pub entry_count: usize,
    pub size_bytes: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct IcloudBackupFile {
    pub filename: String,
    pub size_bytes: u64,
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct IcloudRestoreResult {
    pub imported: u64,
    pub skipped: u64,
}
