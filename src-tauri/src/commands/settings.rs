use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::auth::AppState;
use crate::{commands, db, error::AppError};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub auto_lock_seconds: u64,
    pub theme: String,
    pub global_shortcut: String,
    pub lock_shortcut: String,
    pub auto_backup_interval: u64,
    pub last_icloud_backup: u64,
}

/// 获取应用配置
#[tauri::command]
pub async fn get_app_config(
    state: State<'_, AppState>,
) -> Result<AppConfig, AppError> {
    let key = commands::ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;

    let config = read_config_from_db(&conn);
    Ok(config)
}

/// 更新应用配置
#[tauri::command]
pub async fn update_app_config(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    auto_lock_seconds: Option<u64>,
    theme: Option<String>,
    global_shortcut: Option<String>,
    lock_shortcut: Option<String>,
    auto_backup_interval: Option<u64>,
    backup_password: Option<String>,
) -> Result<AppConfig, AppError> {
    let key = commands::ensure_unlocked(&state)?;
    let db_path = db::connection::get_db_path(&state.db_dir);

    let conn = db::Connection::open_with_key(&db_path, &key)?;

    if let Some(seconds) = auto_lock_seconds {
        db::MetadataRepo::set(conn.inner(), "auto_lock_seconds", &seconds.to_string())?;
        state.keychain.set_auto_lock_seconds(seconds)?;
    }

    if let Some(ref t) = theme {
        db::MetadataRepo::set(conn.inner(), "theme", t)?;
    }

    if let Some(ref shortcut) = global_shortcut {
        db::MetadataRepo::set(conn.inner(), "global_shortcut", shortcut)?;

        // 重新注册快捷键
        let mut old = state.current_shortcut.lock().map_err(|e| {
            AppError::Other(format!("获取快捷键锁失败: {}", e))
        })?;
        let _ = app_handle.global_shortcut().unregister(old.as_str());
        let _ = app_handle.global_shortcut().register(shortcut.as_str());
        *old = shortcut.clone();
    }

    if let Some(ref shortcut) = lock_shortcut {
        db::MetadataRepo::set(conn.inner(), "lock_shortcut", shortcut)?;

        let mut old = state.current_lock_shortcut.lock().map_err(|e| {
            AppError::Other(format!("获取锁定快捷键锁失败: {}", e))
        })?;
        let _ = app_handle.global_shortcut().unregister(old.as_str());
        let _ = app_handle.global_shortcut().register(shortcut.as_str());
        *old = shortcut.clone();
    }

    if let Some(interval) = auto_backup_interval {
        db::MetadataRepo::set(conn.inner(), "auto_backup_interval", &interval.to_string())?;
    }

    if let Some(ref pw) = backup_password {
        db::MetadataRepo::set(conn.inner(), "backup_password", pw)?;
    }

    // 返回更新后的配置
    Ok(read_config_from_db(&conn))
}

/// 从数据库连接读取完整配置（纯函数，无锁/状态依赖）
fn read_config_from_db(conn: &db::Connection) -> AppConfig {
    let auto_lock_str = db::MetadataRepo::get(conn.inner(), "auto_lock_seconds")
        .ok().flatten().unwrap_or_else(|| "300".to_string());
    let theme = db::MetadataRepo::get(conn.inner(), "theme")
        .ok().flatten().unwrap_or_else(|| "dark".to_string());
    let shortcut = db::MetadataRepo::get(conn.inner(), "global_shortcut")
        .ok().flatten().unwrap_or_else(|| "CmdOrCtrl+Shift+V".to_string());
    let lock_shortcut = db::MetadataRepo::get(conn.inner(), "lock_shortcut")
        .ok().flatten().unwrap_or_else(|| "CmdOrCtrl+Shift+L".to_string());
    let backup_interval = db::MetadataRepo::get(conn.inner(), "auto_backup_interval")
        .ok().flatten().unwrap_or_else(|| "0".to_string());
    let last_backup = db::MetadataRepo::get(conn.inner(), "last_icloud_backup")
        .ok().flatten().unwrap_or_else(|| "0".to_string());

    AppConfig {
        auto_lock_seconds: auto_lock_str.parse().unwrap_or(300),
        theme,
        global_shortcut: shortcut,
        lock_shortcut,
        auto_backup_interval: backup_interval.parse().unwrap_or(0),
        last_icloud_backup: last_backup.parse().unwrap_or(0),
    }
}
