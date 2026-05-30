use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::auth::AppState;
use crate::{commands, db, error::{AppError, AppResult}};
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

/// 验证快捷键格式是否正确
fn validate_shortcut(shortcut: &str) -> AppResult<()> {
    // 检查是否包含修饰键
    let has_mod = shortcut.contains("Cmd")
        || shortcut.contains("Ctrl")
        || shortcut.contains("Alt")
        || shortcut.contains("Shift")
        || shortcut.contains("Super");
    if !has_mod {
        return Err(AppError::Other("快捷键必须至少包含一个修饰键 (Cmd/Ctrl/Alt/Shift/Super)".to_string()));
    }
    // 检查结尾是否有按键名称
    let parts: Vec<&str> = shortcut.split('+').collect();
    if parts.len() < 2 {
        return Err(AppError::Other("快捷键格式错误，格式示例: CmdOrCtrl+Shift+V".to_string()));
    }
    let key = parts.last().unwrap_or(&"");
    if key.is_empty() || key.len() > 20 {
        return Err(AppError::Other("快捷键的按键部分无效".to_string()));
    }
    Ok(())
}

/// 获取应用配置
#[tauri::command]
pub async fn get_app_config(
    state: State<'_, AppState>,
) -> Result<AppConfig, AppError> {
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;

    let config = read_config_from_db(conn);
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
    let db_conn = commands::get_connection(&state)?;
    let conn = db_conn.as_ref().ok_or_else(|| AppError::LockState("数据库连接未初始化".to_string()))?;

    if let Some(seconds) = auto_lock_seconds {
        db::MetadataRepo::set(conn.inner(), "auto_lock_seconds", &seconds.to_string())?;
        state.keychain.set_auto_lock_seconds(seconds)?;
    }

    if let Some(ref t) = theme {
        db::MetadataRepo::set(conn.inner(), "theme", t)?;
    }

    if let Some(ref shortcut) = global_shortcut {
        validate_shortcut(shortcut)?;
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
        validate_shortcut(shortcut)?;
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

    if let Some(mut pw) = backup_password {
        db::MetadataRepo::set(conn.inner(), "backup_password", &pw)?;
        // 立即清除密码内存，防止残留在堆上
        unsafe {
            std::ptr::write_bytes(pw.as_ptr() as *mut u8, 0, pw.len());
        }
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
