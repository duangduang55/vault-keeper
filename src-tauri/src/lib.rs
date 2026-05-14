mod commands;
mod crypto;
mod db;
mod error;

use std::sync::Mutex;
use commands::auth::AppState;
use tauri::Manager;
use tauri::Emitter;
use time::OffsetDateTime;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// 默认全局快捷键
const DEFAULT_SHORTCUT: &str = "CmdOrCtrl+Shift+V";
/// 默认锁定快捷键
const DEFAULT_LOCK_SHORTCUT: &str = "CmdOrCtrl+Shift+L";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state != ShortcutState::Pressed { return; }
                    let shortcut_str = shortcut.to_string();
                    // 检查是否锁定快捷键
                    if let Some(state) = app.try_state::<AppState>() {
                        if let Ok(lock_shortcut) = state.current_lock_shortcut.lock() {
                            if shortcut_str == *lock_shortcut {
                                let _ = state.keychain.lock();
                                let _ = app.emit("vault-locked", ());
                                return;
                            }
                        }
                    }
                    toggle_main_window(app);
                })
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化应用状态
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));

            app.manage(AppState {
                keychain: crypto::keychain::Keychain::new(),
                db_dir: app_data_dir,
                current_shortcut: Mutex::new(DEFAULT_SHORTCUT.to_string()),
                current_lock_shortcut: Mutex::new(DEFAULT_LOCK_SHORTCUT.to_string()),
            });

            // ========== 关闭到 Dock ==========
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }

            // ========== 状态栏图标和菜单 ==========
            let tray_icon = app.default_window_icon().cloned()
                .unwrap_or_else(|| {
                    let png_bytes = include_bytes!("../icons/32x32.png");
                    let cursor = std::io::Cursor::new(png_bytes as &[u8]);
                    let decoder = png::Decoder::new(cursor);
                    let mut reader = decoder.read_info().expect("读取 PNG 信息失败");
                    let mut rgba = vec![0u8; reader.output_buffer_size()];
                    reader.next_frame(&mut rgba).expect("解码 PNG 失败");
                    tauri::image::Image::new_owned(rgba, reader.info().width, reader.info().height).into()
                });
            let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let backup = MenuItem::with_id(app, "backup_icloud", "备份到 iCloud", true, None::<&str>)?;
            let lock = MenuItem::with_id(app, "lock", "锁定保险箱", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &backup, &lock, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon.clone())
                .tooltip("Vault Keeper")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "backup_icloud" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("trigger-icloud-backup", ());
                            }
                        }
                        "lock" => {
                            if let Some(state) = app.try_state::<AppState>() {
                                let _ = state.keychain.lock();
                            }
                            let _ = app.emit("vault-locked", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ========== 注册默认全局快捷键 ==========
            if let Err(e) = app.global_shortcut().register(DEFAULT_SHORTCUT) {
                eprintln!("注册全局快捷键失败: {}", e);
            }
            if let Err(e) = app.global_shortcut().register(DEFAULT_LOCK_SHORTCUT) {
                eprintln!("注册锁定快捷键失败: {}", e);
            }

            // ========== 后台自动备份定时器 ==========
            // 使用独立线程 + 自建 tokio runtime，因为 setup 阶段尚无全局 tokio runtime
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new()
                    .expect("创建自动备份的 tokio runtime 失败");
                rt.block_on(auto_backup_loop(app_handle));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::setup,
            commands::auth::unlock,
            commands::auth::lock,
            commands::auth::get_lock_state,
            commands::auth::change_master_password,
            commands::icon::get_app_icon,
            commands::vault::list_entries,
            commands::vault::get_entry,
            commands::vault::create_entry,
            commands::vault::update_entry,
            commands::vault::delete_entry,
            commands::vault::search_entries,
            commands::vault::list_entries_by_type,
            commands::settings::get_app_config,
            commands::settings::update_app_config,
            commands::clipboard::copy_to_clipboard,
            commands::export_import::export_backup,
            commands::export_import::import_backup,
            commands::icloud::icloud_backup,
            commands::icloud::icloud_list_backups,
            commands::icloud::icloud_restore,
            commands::icloud::get_icloud_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 切换主窗口显示/隐藏
fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// 后台自动备份循环
/// 每 60 秒检查一次，仅在保险箱解锁时执行
async fn auto_backup_loop(app_handle: tauri::AppHandle) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));

    loop {
        interval.tick().await;

        // 检查是否解锁
        let state = match app_handle.try_state::<AppState>() {
            Some(s) => s,
            None => continue,
        };

        let lock_state = match state.keychain.get_lock_state() {
            Ok(ls) => ls,
            Err(_) => continue,
        };

        if lock_state != crate::crypto::keychain::LockState::Unlocked {
            continue;
        }

        // 读取备份配置（使用 peek_key 以免后台任务重置自动锁定计时器）
        let key = match state.keychain.peek_key() {
            Ok(k) => k,
            Err(_) => continue,
        };

        let db_path = db::connection::get_db_path(&state.db_dir);
        let conn = match db::Connection::open_with_key(&db_path, &key) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let interval_str = match db::MetadataRepo::get(conn.inner(), "auto_backup_interval") {
            Ok(Some(v)) => v,
            _ => continue,
        };

        let interval_secs: u64 = match interval_str.parse() {
            Ok(0) => continue,  // 已禁用
            Ok(n) => n,
            Err(_) => continue,
        };

        let backup_pw_str = match db::MetadataRepo::get(conn.inner(), "backup_password") {
            Ok(Some(p)) => p,
            _ => continue,
        };
        let backup_pw = secrecy::Secret::new(backup_pw_str);

        let last_backup = db::MetadataRepo::get(conn.inner(), "last_icloud_backup")
            .ok()
            .flatten()
            .and_then(|t| t.parse::<u64>().ok())
            .unwrap_or(0);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        if now < last_backup + interval_secs {
            continue; // 还没到时间
        }

        // 执行自动备份
        let entries = match db::EntryRepo::list_all(conn.inner()) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let data = match serde_json::to_string_pretty(&entries) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let encrypted = match crypto::backup::encrypt_backup(&backup_pw, data.as_bytes()) {
            Ok(e) => e,
            Err(_) => continue,
        };

        // 写入 iCloud Drive
        let icloud_dir = commands::icloud::icloud_dir();
        std::fs::create_dir_all(&icloud_dir).ok();

        let ts = OffsetDateTime::now_local()
            .map(|t| format!("{:04}{:02}{:02}{:02}{:02}", t.year(), u8::from(t.month()), t.day(), t.hour(), t.minute()))
            .unwrap_or_else(|_| now.to_string());
        let filename = format!("vault-keeper-backup-{}.bin", ts);
        let path = icloud_dir.join(&filename);
        if let Err(e) = std::fs::write(&path, &encrypted) {
            log::warn!("iCloud 自动备份写入失败: {}", e);
        } else {
            let _ = db::MetadataRepo::set(conn.inner(), "last_icloud_backup", &now.to_string());
        }
    }
}

