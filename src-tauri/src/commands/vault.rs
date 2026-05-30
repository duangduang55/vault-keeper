use serde::Serialize;
use tauri::State;

use crate::commands;
use crate::commands::auth::AppState;
use crate::db;
use crate::error::AppError;

/// 列出所有条目
#[tauri::command]
pub async fn list_entries(
    state: State<'_, AppState>,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::list_all(conn.inner())
}

/// 获取单个条目详情
#[tauri::command]
pub async fn get_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<db::entries::Entry, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::get_by_id(conn.inner(), &id)
}

/// 创建新条目
#[tauri::command]
pub async fn create_entry(
    state: State<'_, AppState>,
    params: db::entries::CreateEntryParams,
) -> Result<db::entries::Entry, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::create(conn.inner(), &params)
}

/// 更新条目
#[tauri::command]
pub async fn update_entry(
    state: State<'_, AppState>,
    id: String,
    params: db::entries::UpdateEntryParams,
) -> Result<db::entries::Entry, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::update(conn.inner(), &id, &params)
}

/// 删除条目
#[tauri::command]
pub async fn delete_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<DeleteResult, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::delete(conn.inner(), &id)?;

    Ok(DeleteResult { success: true })
}

/// 搜索条目
#[tauri::command]
pub async fn search_entries(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::search(conn.inner(), &query)
}

/// 按类型过滤条目
#[tauri::command]
pub async fn list_entries_by_type(
    state: State<'_, AppState>,
    entry_type: String,
) -> Result<Vec<db::entries::Entry>, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;
    db::EntryRepo::list_by_type(conn.inner(), &entry_type)
}

#[derive(Serialize)]
pub struct DeleteResult {
    pub success: bool,
}
