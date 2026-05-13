pub mod auth;
pub mod clipboard;
pub mod export_import;
pub mod icloud;
pub mod icon;
pub mod settings;
pub mod vault;

use tauri::State;
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
