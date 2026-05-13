use secrecy::Secret;
use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

use crate::commands::auth::AppState;
use crate::{commands, crypto, db, error::AppError};

/// 加密导出所有条目到备份文件
#[tauri::command]
pub async fn export_backup(
	state: State<'_, AppState>,
	password: String,
	output_path: Option<String>,
) -> Result<ExportResult, AppError> {
	let key = commands::ensure_unlocked(&state)?;
	let db_path = db::connection::get_db_path(&state.db_dir);
	let conn = db::Connection::open_with_key(&db_path, &key)?;

	let entries = db::EntryRepo::list_all(conn.inner())?;
	let data = serde_json::to_string_pretty(&entries)?;

	let backup_pw = Secret::new(password);
	let encrypted = crypto::backup::encrypt_backup(&backup_pw, data.as_bytes())?;

	let path = output_path
		.map(PathBuf::from)
		.unwrap_or_else(default_backup_path);

	std::fs::write(&path, &encrypted)?;

	Ok(ExportResult {
		path: path.to_string_lossy().to_string(),
		entry_count: entries.len(),
		size_bytes: encrypted.len(),
	})
}

/// 从加密备份文件导入条目
#[tauri::command]
pub async fn import_backup(
	state: State<'_, AppState>,
	password: String,
	input_path: String,
) -> Result<ImportResult, AppError> {
	let key = commands::ensure_unlocked(&state)?;
	let db_path = db::connection::get_db_path(&state.db_dir);
	let conn = db::Connection::open_with_key(&db_path, &key)?;

	let path = PathBuf::from(&input_path);
	if !path.exists() {
		return Err(AppError::Other(format!("文件不存在: {}", input_path)));
	}

	let backup_pw = Secret::new(password);
	let encrypted = std::fs::read(&path)?;
	let decrypted = crypto::backup::decrypt_backup(&backup_pw, &encrypted)?;

	let entries: Vec<db::entries::Entry> = serde_json::from_slice(&decrypted)?;

	let mut imported = 0u64;
	let mut skipped = 0u64;
	for entry in &entries {
		// 检查 ID 是否已存在
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
					entry.id,
					entry.entry_type,
					entry.name,
					entry.fields,
					entry.created_at,
					entry.updated_at,
				],
			)?;
			imported += 1;
		}
	}

	Ok(ImportResult { imported, skipped })
}

/// 默认备份路径：用户主目录（带时间戳）
fn default_backup_path() -> PathBuf {
	let home = std::env::var("HOME")
		.or_else(|_| std::env::var("USERPROFILE"))
		.unwrap_or_else(|_| ".".to_string());
	let ts = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_secs();
	PathBuf::from(home).join(format!("vault-keeper-backup-{}.bin", ts))
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportResult {
	pub path: String,
	pub entry_count: usize,
	pub size_bytes: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
	pub imported: u64,
	pub skipped: u64,
}
