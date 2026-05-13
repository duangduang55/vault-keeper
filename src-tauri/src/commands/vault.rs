use serde::Serialize;
use tauri::State;

use crate::commands::auth::AppState;
use crate::crypto::keychain::LockState;
use crate::db;
use crate::error::{AppError, AppResult};

/// 列出所有条目
#[tauri::command]
pub async fn list_entries(
    state: State<'_, AppState>,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::list_all(conn.inner())
}

/// 获取单个条目详情
#[tauri::command]
pub async fn get_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<db::entries::Entry, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::get_by_id(conn.inner(), &id)
}

/// 创建新条目
#[tauri::command]
pub async fn create_entry(
    state: State<'_, AppState>,
    params: db::entries::CreateEntryParams,
) -> Result<db::entries::Entry, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::create(conn.inner(), &params)
}

/// 更新条目
#[tauri::command]
pub async fn update_entry(
    state: State<'_, AppState>,
    id: String,
    params: db::entries::UpdateEntryParams,
) -> Result<db::entries::Entry, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::update(conn.inner(), &id, &params)
}

/// 删除条目
#[tauri::command]
pub async fn delete_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<DeleteResult, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::delete(conn.inner(), &id)?;

    Ok(DeleteResult { success: true })
}

/// 搜索条目
#[tauri::command]
pub async fn search_entries(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::search(conn.inner(), &query)
}

/// 按类型过滤条目
#[tauri::command]
pub async fn list_entries_by_type(
    state: State<'_, AppState>,
    entry_type: String,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let key = ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;
    db::EntryRepo::list_by_type(conn.inner(), &entry_type)
}

/// 确保已解锁并返回派生密钥
fn ensure_unlocked(state: &State<'_, AppState>) -> AppResult<[u8; 32]> {
    let lock_state = state.keychain.get_lock_state()?;
    if lock_state != LockState::Unlocked {
        return Err(AppError::LockState("保险箱已锁定".to_string()));
    }
    state.keychain.get_key()
}

#[derive(Serialize)]
pub struct DeleteResult {
    pub success: bool,
}
