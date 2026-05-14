use secrecy::{ExposeSecret, Secret};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::crypto::{self, hasher, keychain::LockState};
use crate::db;
use crate::error::{AppError, AppResult};

/// 应用共享状态
pub struct AppState {
    pub keychain: crypto::keychain::Keychain,
    pub db_dir: std::path::PathBuf,
    pub current_shortcut: std::sync::Mutex<String>,
    pub current_lock_shortcut: std::sync::Mutex<String>,
}

/// 存储在加密库外的明文配置文件（仅含非敏感验证数据）
#[derive(Debug, Serialize, Deserialize)]
struct VaultConfig {
    master_salt: String,
    master_hash: String,
}

impl VaultConfig {
    fn path(db_dir: &std::path::Path) -> std::path::PathBuf {
        db_dir.join("vault-config.json")
    }

    fn read(db_dir: &std::path::Path) -> AppResult<Self> {
        let path = Self::path(db_dir);
        let data = std::fs::read_to_string(&path)
            .map_err(|e| AppError::Other(format!("读取配置失败: {}", e)))?;
        serde_json::from_str(&data)
            .map_err(|e| AppError::Other(format!("配置解析失败: {}", e)))
    }

    fn write(db_dir: &std::path::Path, config: &Self) -> AppResult<()> {
        let path = Self::path(db_dir);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let data = serde_json::to_string_pretty(config)?;
        let mut file = std::fs::File::create(&path)?;
        std::io::Write::write_all(&mut file, data.as_bytes())?;
        file.sync_all()?; // 确保数据落盘，防止崩溃时丢失
        Ok(())
    }
}

/// 设置主密码（首次使用）
#[tauri::command]
pub async fn setup(
    state: State<'_, AppState>,
    password: String,
) -> Result<SetupResult, AppError> {
    // 检查必须是未初始化状态
    let lock_state = state.keychain.get_lock_state()?;
    if lock_state != LockState::Uninitialized {
        return Err(AppError::Auth("保险箱已初始化".to_string()));
    }

    let db_path = db::connection::get_db_path(&state.db_dir);

    // 生成随机盐值
    let mut salt = [0u8; 32];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut salt);

    // 派生密钥
    let password_secret = Secret::new(password);
    let derived_key = crypto::derive_key(&password_secret, &salt)?;

    // 计算验证哈希
    let master_hash = hasher::compute_master_hash(&salt, &derived_key);

    // 先创建加密数据库（确保数据库创建+迁移成功后再写配置标记）
    {
        if db_path.exists() {
            std::fs::remove_file(&db_path)?;
        }
        let conn = db::Connection::open_with_key(&db_path, derived_key.expose_secret())?;
        db::migrations::run_migrations(conn.inner())?;

        // 写入应用配置到加密库
        db::MetadataRepo::set(conn.inner(), "auto_lock_seconds", "300")?;
        db::MetadataRepo::set(conn.inner(), "theme", "dark")?;
    }

    // 数据库创建成功后再写入配置文件（含 fsync 确保落盘）
    // 顺序不可颠倒：如果先写配置再建库，崩溃会导致配置标记存在但 DB 不存在
    VaultConfig::write(&state.db_dir, &VaultConfig {
        master_salt: hex::encode(salt),
        master_hash: master_hash.clone(),
    })?;

    // 设置密钥到密钥链
    state.keychain.set_key(derived_key)?;
    state.keychain.mark_initialized()?;

    Ok(SetupResult {
        success: true,
        lock_state: "unlocked".to_string(),
    })
}

/// 解锁保险箱
#[tauri::command]
pub async fn unlock(
    state: State<'_, AppState>,
    password: String,
) -> Result<UnlockResult, AppError> {
    let lock_state = state.keychain.get_lock_state()?;
    // 与 get_lock_state 一致：内存中 Uninitialized 时检查磁盘配置文件
    let is_uninitialized = match lock_state {
        LockState::Uninitialized => !state.db_dir.join("vault-config.json").exists(),
        _ => false,
    };
    if is_uninitialized {
        return Err(AppError::Auth("保险箱尚未初始化，请先设置主密码".to_string()));
    }

    let db_path = db::connection::get_db_path(&state.db_dir);

    // 从配置文件读取 salt 和 hash（加密库外）
    let config = VaultConfig::read(&state.db_dir)?;

    // 解码盐值
    let salt_bytes: [u8; 32] = hex::decode(&config.master_salt)
        .map_err(|e| AppError::Crypto(format!("盐值解码失败: {}", e)))?
        .try_into()
        .map_err(|_| AppError::Crypto("盐值长度不正确".to_string()))?;

    // 派生密钥
    let password_secret = Secret::new(password);
    let derived_key = crypto::derive_key(&password_secret, &salt_bytes)?;

    // 验证哈希
    if !hasher::verify_master_password(&salt_bytes, &derived_key, &config.master_hash) {
        return Err(AppError::Auth("主密码不正确".to_string()));
    }

    // 验证数据库密钥
    let _db = db::Connection::open_with_key(&db_path, derived_key.expose_secret())?;

    // 设置密钥到密钥链
    state.keychain.set_key(derived_key)?;

    Ok(UnlockResult {
        success: true,
        lock_state: "unlocked".to_string(),
    })
}

/// 锁定保险箱
#[tauri::command]
pub async fn lock(state: State<'_, AppState>) -> Result<LockResult, AppError> {
    state.keychain.lock()?;
    Ok(LockResult {
        success: true,
        lock_state: "locked".to_string(),
    })
}

/// 获取锁定状态
#[tauri::command]
pub async fn get_lock_state(state: State<'_, AppState>) -> Result<GetLockStateResult, AppError> {
    // 先检查自动锁定（窗口隐藏后时间到了也应锁定）
    state.keychain.check_auto_lock()?;

    let ls = state.keychain.get_lock_state()?;
    let state_str = match ls {
        LockState::Uninitialized => {
            // 检查磁盘上是否有 vault-config.json，有说明已初始化过
            let config_path = state.db_dir.join("vault-config.json");
            if config_path.exists() {
                // 一致性检查：配置存在但数据库不存在 → 数据已丢失
                let db_path = db::connection::get_db_path(&state.db_dir);
                if !db_path.exists() {
                    let _ = std::fs::remove_file(&config_path);
                    "uninitialized"
                } else {
                    "locked"
                }
            } else {
                "uninitialized"
            }
        }
        LockState::Locked => "locked",
        LockState::Unlocked => "unlocked",
    };

    Ok(GetLockStateResult {
        lock_state: state_str.to_string(),
    })
}

/// 修改主密码
#[tauri::command]
pub async fn change_master_password(
    state: State<'_, AppState>,
    old_password: String,
    new_password: String,
) -> Result<ChangePasswordResult, AppError> {
    // 验证当前已解锁
    let lock_state = state.keychain.get_lock_state()?;
    if lock_state != LockState::Unlocked {
        return Err(AppError::LockState("保险箱已锁定，请先解锁".to_string()));
    }

    let db_path = db::connection::get_db_path(&state.db_dir);

    // 从配置文件读取旧盐值
    let config = VaultConfig::read(&state.db_dir)?;
    let old_salt: [u8; 32] = hex::decode(&config.master_salt)
        .map_err(|e| AppError::Crypto(format!("盐值解码失败: {}", e)))?
        .try_into()
        .map_err(|_| AppError::Crypto("盐值长度不正确".to_string()))?;

    let old_pw = Secret::new(old_password);
    let old_key = crypto::derive_key(&old_pw, &old_salt)?;

    // 生成新盐值和密钥
    let mut new_salt = [0u8; 32];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut new_salt);

    let new_pw = Secret::new(new_password);
    let new_key = crypto::derive_key(&new_pw, &new_salt)?;
    let new_hash = hasher::compute_master_hash(&new_salt, &new_key);

    // 先 rekey 数据库，再更新配置文件
    // 顺序不可颠倒：先写配置再 rekey 会在崩溃时导致新旧密钥都不匹配，永久锁死用户
    {
        let conn = db::Connection::open_with_key(&db_path, old_key.expose_secret())?;
        conn.rekey(new_key.expose_secret())?;
    }

    // 数据库 rekey 成功后再更新配置文件（含 fsync 确保落盘）
    VaultConfig::write(&state.db_dir, &VaultConfig {
        master_salt: hex::encode(new_salt),
        master_hash: new_hash,
    })?;

    // 更新密钥链
    state.keychain.set_key(new_key)?;

    Ok(ChangePasswordResult {
        success: true,
    })
}

// --- 响应类型 ---

#[derive(Serialize)]
pub struct SetupResult {
    pub success: bool,
    pub lock_state: String,
}

#[derive(Serialize)]
pub struct UnlockResult {
    pub success: bool,
    pub lock_state: String,
}

#[derive(Serialize)]
pub struct LockResult {
    pub success: bool,
    pub lock_state: String,
}

#[derive(Serialize)]
pub struct GetLockStateResult {
    pub lock_state: String,
}

#[derive(Serialize)]
pub struct ChangePasswordResult {
    pub success: bool,
}
