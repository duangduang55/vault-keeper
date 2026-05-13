use argon2::{
	Argon2, Params, Version,
	password_hash::{SaltString, PasswordHasher},
};
use secrecy::{ExposeSecret, Secret};
use crate::error::{AppError, AppResult};

/// Argon2id 参数：64MB 内存、3 轮迭代、4 通道并行
const ARGON2_MEMORY: u32 = 65536; // 64 MB in KiB
const ARGON2_ITERATIONS: u32 = 3;
const ARGON2_PARALLELISM: u32 = 4;

/// 从主密码派生 32 字节 AES-256 密钥
/// 使用 Argon2id，参数: 64MB 内存 / 3轮 / 4通道
pub fn derive_key(password: &Secret<String>, salt: &[u8; 32]) -> AppResult<Secret<[u8; 32]>> {
	let params = Params::new(
		ARGON2_MEMORY,
		ARGON2_ITERATIONS,
		ARGON2_PARALLELISM,
		Some(32), // 输出 32 字节
	)
	.map_err(|e| AppError::Crypto(format!("Argon2 参数错误: {}", e)))?;

	let argon2 = Argon2::new(
		argon2::Algorithm::Argon2id,
		Version::V0x13,
		params,
	);

	let salt_string = SaltString::encode_b64(salt)
		.map_err(|e| AppError::Crypto(format!("盐值编码错误: {}", e)))?;

	let hash = argon2
		.hash_password(password.expose_secret().as_bytes(), &salt_string)
		.map_err(|e| AppError::Crypto(format!("密钥派生失败: {}", e)))?;

	// 提取原始 32 字节密钥
	let key_bytes: [u8; 32] = hash
		.hash
		.ok_or_else(|| AppError::Crypto("密钥派生结果为空".to_string()))?
		.as_bytes()
		.try_into()
		.map_err(|_| AppError::Crypto("密钥长度不正确".to_string()))?;

	Ok(Secret::new(key_bytes))
}

#[cfg(test)]
mod tests {
	use super::*;
	use secrecy::Secret;

	#[test]
	fn test_derive_key_deterministic() {
		let password = Secret::new("test-password-123".to_string());
		let salt = [1u8; 32];

		let key1 = derive_key(&password, &salt).unwrap();
		let key2 = derive_key(&password, &salt).unwrap();

		assert_eq!(key1.expose_secret(), key2.expose_secret());
	}

	#[test]
	fn test_derive_key_different_passwords() {
		let salt = [1u8; 32];
		let pw1 = Secret::new("password-abc".to_string());
		let pw2 = Secret::new("password-xyz".to_string());

		let key1 = derive_key(&pw1, &salt).unwrap();
		let key2 = derive_key(&pw2, &salt).unwrap();

		assert_ne!(key1.expose_secret(), key2.expose_secret());
	}
}
