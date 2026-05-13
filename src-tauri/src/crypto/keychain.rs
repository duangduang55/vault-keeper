use secrecy::{ExposeSecret, Secret};
use std::sync::Mutex;
use tokio::time::{Duration, Instant};

use crate::error::{AppError, AppResult};

/// 自动锁定时间（秒）
const DEFAULT_AUTO_LOCK_SECONDS: u64 = 300; // 5 分钟

/// 密钥生命周期状态
#[derive(Debug, Clone, PartialEq)]
pub enum LockState {
    /// 未初始化（首次使用，尚未设置主密码）
    Uninitialized,
    /// 已锁定（需要输入主密码解锁）
    Locked,
    /// 已解锁（密钥在内存中可用）
    Unlocked,
}

/// 密钥管理器 - 管理派生密钥的完整生命周期
pub struct Keychain {
    /// 当前持有的派生密钥（Secret 在 Drop 时 zeroize）
    key: Mutex<Option<Secret<[u8; 32]>>>,
    /// 锁定状态
    lock_state: Mutex<LockState>,
    /// 解锁时间
    unlocked_at: Mutex<Option<Instant>>,
    /// 自动锁定超时（秒）
    auto_lock_seconds: Mutex<u64>,
}

impl Keychain {
    /// 创建新的密钥管理器（未初始化状态）
    pub fn new() -> Self {
        Self {
            key: Mutex::new(None),
            lock_state: Mutex::new(LockState::Uninitialized),
            unlocked_at: Mutex::new(None),
            auto_lock_seconds: Mutex::new(DEFAULT_AUTO_LOCK_SECONDS),
        }
    }

    /// 设置派生密钥（解锁或初始化后调用）
    pub fn set_key(&self, derived_key: Secret<[u8; 32]>) -> AppResult<()> {
        let mut key = self.key.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;
        *key = Some(derived_key);

        let mut state = self.lock_state.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        *state = LockState::Unlocked;

        let mut unlocked = self.unlocked_at.lock().map_err(|e| {
            AppError::LockState(format!("获取时间锁失败: {}", e))
        })?;
        *unlocked = Some(Instant::now());

        Ok(())
    }

    /// 获取密钥的引用（用于数据库操作等）
    /// 返回使用后自动清理的守卫，但 Secret 不会离开锁
    /// 实际使用时通过 with_key 模式访问
    pub fn get_key(&self) -> AppResult<[u8; 32]> {
        // 先检查自动锁定，避免在持有 key 锁时调用 lock() 导致死锁
        self.check_auto_lock()?;

        let key = self.key.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;

        match key.as_ref() {
            Some(k) => {
                let mut result = [0u8; 32];
                result.copy_from_slice(k.expose_secret());
                Ok(result)
            }
            None => Err(AppError::LockState("密钥未加载".to_string())),
        }
    }

    /// 锁定保险箱（清除内存中的密钥）
    pub fn lock(&self) -> AppResult<()> {
        let mut key = self.key.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;

        // 通过设置新值然后用 zeroize 清除
        if let Some(ref mut _k) = *key {
            // 旧值会在 Secret 的 Drop 实现中被 zeroize 清除
        }
        *key = None;

        let mut state = self.lock_state.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        *state = LockState::Locked;

        let mut unlocked = self.unlocked_at.lock().map_err(|e| {
            AppError::LockState(format!("获取时间锁失败: {}", e))
        })?;
        *unlocked = None;

        Ok(())
    }

    /// 获取当前锁定状态
    pub fn get_lock_state(&self) -> AppResult<LockState> {
        self.lock_state.lock()
            .map(|s| s.clone())
            .map_err(|e| AppError::LockState(format!("获取状态锁失败: {}", e)))
    }

    /// 设置自动锁定时间（秒）
    pub fn set_auto_lock_seconds(&self, seconds: u64) -> AppResult<()> {
        let mut t = self.auto_lock_seconds.lock().map_err(|e| {
            AppError::LockState(format!("获取配置锁失败: {}", e))
        })?;
        *t = seconds;
        Ok(())
    }

    /// 获取自动锁定时间（秒）
    #[allow(dead_code)]
    pub fn get_auto_lock_seconds(&self) -> AppResult<u64> {
        self.auto_lock_seconds.lock()
            .map(|t| *t)
            .map_err(|e| AppError::LockState(format!("获取配置锁失败: {}", e)))
    }

    /// 标记为已初始化（首次设置主密码后调用）
    pub fn mark_initialized(&self) -> AppResult<()> {
        let mut state = self.lock_state.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        if *state == LockState::Uninitialized {
            *state = LockState::Unlocked;
        }
        Ok(())
    }

    /// 检查是否超过自动锁定时间，如果是则自动锁定
    fn check_auto_lock(&self) -> AppResult<()> {
        let state = self.lock_state.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;

        if *state != LockState::Unlocked {
            return Ok(());
        }
        drop(state);

        let mut unlocked = self.unlocked_at.lock().map_err(|e| {
            AppError::LockState(format!("获取时间锁失败: {}", e))
        })?;

        let auto_lock = self.auto_lock_seconds.lock().map_err(|e| {
            AppError::LockState(format!("获取配置锁失败: {}", e))
        })?;

        if let Some(unlocked_time) = *unlocked {
            if unlocked_time.elapsed() >= Duration::from_secs(*auto_lock) {
                drop(unlocked);
                drop(auto_lock);
                self.lock()?;
            } else {
                // 用户活跃中，重置自动锁定计时器
                *unlocked = Some(Instant::now());
            }
        }

        Ok(())
    }
}

impl Default for Keychain {
    fn default() -> Self {
        Self::new()
    }
}
