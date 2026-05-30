pub mod auth;
pub mod clipboard;
pub mod export_import;
pub mod icloud;
pub mod icon;
pub mod settings;
pub mod vault;

use tauri::State;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::commands::auth::AppState;
use crate::crypto::keychain::LockState;

/// 确保保险箱已解锁并返回密钥
pub fn ensure_unlocked(state: &State<'_, AppState>) -> AppResult<[u8; 32]> {
    let lock_state = state.keychain.get_lock_state()?;
    if lock_state != LockState::Unlocked {
        return Err(AppError::LockState("保险箱已锁定".to_string()));
    }
    state.keychain.get_key()
}

/// 获取持久化数据库连接（同时检查解锁状态）
pub fn get_connection<'a>(state: &'a State<'_, AppState>) -> AppResult<std::sync::MutexGuard<'a, Option<db::Connection>>> {
    ensure_unlocked(state)?;
    state.db_conn.lock()
        .map_err(|e| AppError::LockState(format!("获取数据库连接锁失败: {}", e)))
}
