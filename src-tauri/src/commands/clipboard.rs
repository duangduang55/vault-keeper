use serde::Serialize;
use tauri::State;

use crate::commands::auth::AppState;
use crate::{commands, db, error::AppError};

/// 复制条目字段值到剪贴板
#[tauri::command]
pub async fn copy_to_clipboard(
	app: tauri::AppHandle,
	state: State<'_, AppState>,
	entry_id: String,
	field_key: String,
) -> Result<ClipboardResult, AppError> {
	let key = commands::ensure_unlocked(&state)?;
	let db_path = db::connection::get_db_path(&state.db_dir);
	let conn = db::Connection::open_with_key(&db_path, &key)?;

	let entry = db::EntryRepo::get_by_id(conn.inner(), &entry_id)?;
	let fields: std::collections::HashMap<String, String> =
		serde_json::from_str(&entry.fields)?;
	let value = fields
		.get(&field_key)
		.ok_or_else(|| AppError::NotFound(format!("字段 {} 不存在", field_key)))?;

	// 使用 Tauri 剪贴板插件写入
	use tauri_plugin_clipboard_manager::ClipboardExt;
	app.clipboard()
		.write_text(value.clone())
		.map_err(|e| AppError::Other(format!("剪贴板写入失败: {}", e)))?;

	// 10 秒后自动清除标记
	let expires_at = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_millis() as i64
		+ 10_000;

	Ok(ClipboardResult {
		copied: true,
		expires_at,
	})
}

#[derive(Debug, Clone, Serialize)]
pub struct ClipboardResult {
	pub copied: bool,
	pub expires_at: i64,
}
