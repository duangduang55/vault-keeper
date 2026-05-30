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

/// 内部状态（单 Mutex 保护，消除多锁死锁风险）
struct KeychainInner {
    /// 当前持有的派生密钥（Secret 在 Drop 时 zeroize）
    key: Option<Secret<[u8; 32]>>,
    /// 锁定状态
    lock_state: LockState,
    /// 解锁时间
    unlocked_at: Option<Instant>,
    /// 自动锁定超时（秒）
    auto_lock_seconds: u64,
}

/// 密钥管理器 - 管理派生密钥的完整生命周期
pub struct Keychain {
    inner: Mutex<KeychainInner>,
}

impl Keychain {
    /// 创建新的密钥管理器（未初始化状态）
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(KeychainInner {
                key: None,
                lock_state: LockState::Uninitialized,
                unlocked_at: None,
                auto_lock_seconds: DEFAULT_AUTO_LOCK_SECONDS,
            }),
        }
    }

    /// 设置派生密钥（解锁或初始化后调用）
    pub fn set_key(&self, derived_key: Secret<[u8; 32]>) -> AppResult<()> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;
        inner.key = Some(derived_key);
        inner.lock_state = LockState::Unlocked;
        inner.unlocked_at = Some(Instant::now());
        Ok(())
    }

    /// 获取密钥（用于数据库操作等）
    /// 先检查自动锁定，再标记用户活跃
    pub fn get_key(&self) -> AppResult<[u8; 32]> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;

        // 先检查自动锁定
        if inner.lock_state == LockState::Unlocked {
            if let Some(unlocked_time) = inner.unlocked_at {
                if unlocked_time.elapsed() >= Duration::from_secs(inner.auto_lock_seconds) {
                    // 超时锁定
                    inner.key = None;
                    inner.lock_state = LockState::Locked;
                    inner.unlocked_at = None;
                    return Err(AppError::LockState("保险箱已自动锁定".to_string()));
                }
            }
        }

        if inner.lock_state != LockState::Unlocked {
            return Err(AppError::LockState("保险箱已锁定".to_string()));
        }

        // 标记用户活跃（重置自动锁定计时器）
        inner.unlocked_at = Some(Instant::now());

        match inner.key.as_ref() {
            Some(k) => {
                let mut result = [0u8; 32];
                result.copy_from_slice(k.expose_secret());
                Ok(result)
            }
            None => Err(AppError::LockState("密钥未加载".to_string())),
        }
    }

    /// 获取密钥但不重置自动锁定计时器（用于后台任务如自动备份）
    pub fn peek_key(&self) -> AppResult<[u8; 32]> {
        let inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;

        // 检查自动锁定（可能触发锁定），但不标记用户活跃
        if inner.lock_state != LockState::Unlocked {
            return Err(AppError::LockState("保险箱已锁定".to_string()));
        }

        if let Some(unlocked_time) = inner.unlocked_at {
            if unlocked_time.elapsed() >= Duration::from_secs(inner.auto_lock_seconds) {
                // 不能在这里自动锁定（因为持有锁），让调用方重试
                return Err(AppError::LockState("保险箱已自动锁定".to_string()));
            }
        }

        match inner.key.as_ref() {
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
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取密钥锁失败: {}", e))
        })?;
        // 通过设置 None 释放旧密钥（Secret 的 Drop 自动 zeroize）
        inner.key = None;
        inner.lock_state = LockState::Locked;
        inner.unlocked_at = None;
        Ok(())
    }

    /// 获取当前锁定状态
    pub fn get_lock_state(&self) -> AppResult<LockState> {
        let inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        Ok(inner.lock_state.clone())
    }

    /// 设置自动锁定时间（秒）
    pub fn set_auto_lock_seconds(&self, seconds: u64) -> AppResult<()> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取配置锁失败: {}", e))
        })?;
        inner.auto_lock_seconds = seconds;
        Ok(())
    }

    /// 获取自动锁定时间（秒）
    #[allow(dead_code)]
    pub fn get_auto_lock_seconds(&self) -> AppResult<u64> {
        let inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取配置锁失败: {}", e))
        })?;
        Ok(inner.auto_lock_seconds)
    }

    /// 标记为已初始化（首次设置主密码后调用）
    pub fn mark_initialized(&self) -> AppResult<()> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        if inner.lock_state == LockState::Uninitialized {
            inner.lock_state = LockState::Unlocked;
        }
        Ok(())
    }

    /// 检查是否超过自动锁定时间，如果是则自动锁定
    /// 与 mark_activity 分离：本方法只检查不重置计时器
    pub fn check_auto_lock(&self) -> AppResult<()> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;

        // 检查自动锁定条件
        if let Some(unlocked_time) = inner.unlocked_at {
            if unlocked_time.elapsed() >= Duration::from_secs(inner.auto_lock_seconds) {
                inner.key = None;
                inner.lock_state = LockState::Locked;
                inner.unlocked_at = None;
            }
        }

        Ok(())
    }

    /// 标记用户活跃，重置自动锁定计时器
    #[allow(dead_code)]
    pub fn mark_activity(&self) -> AppResult<()> {
        let mut inner = self.inner.lock().map_err(|e| {
            AppError::LockState(format!("获取状态锁失败: {}", e))
        })?;
        if inner.lock_state == LockState::Unlocked {
            inner.unlocked_at = Some(Instant::now());
        }
        Ok(())
    }
}

impl Default for Keychain {
    fn default() -> Self {
        Self::new()
    }
}
