use thiserror::Error;

/// 应用统一错误类型
#[derive(Error, Debug)]
pub enum AppError {
	#[error("数据库错误: {0}")]
	Database(#[from] rusqlite::Error),

	#[error("IO 错误: {0}")]
	Io(#[from] std::io::Error),

	#[error("JSON 序列化错误: {0}")]
	Json(#[from] serde_json::Error),

	#[error("加密错误: {0}")]
	Crypto(String),

	#[error("验证失败: {0}")]
	Auth(String),

	#[error("条目不存在: {0}")]
	NotFound(String),

	#[allow(dead_code)]
	#[error("无效输入: {0}")]
	InvalidInput(String),

	#[error("锁状态错误: {0}")]
	LockState(String),

	#[error("{0}")]
	Other(String),
}

impl From<argon2::password_hash::Error> for AppError {
	fn from(e: argon2::password_hash::Error) -> Self {
		AppError::Crypto(e.to_string())
	}
}

impl serde::Serialize for AppError {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::ser::Serializer,
	{
		serializer.serialize_str(self.to_string().as_str())
	}
}

pub type AppResult<T> = Result<T, AppError>;
