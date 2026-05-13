use secrecy::{ExposeSecret, Secret};
use sha2::{Sha256, Digest};

/// 计算主密码的验证哈希（salt + derived_key → SHA-256）
pub fn compute_master_hash(salt: &[u8; 32], derived_key: &Secret<[u8; 32]>) -> String {
	let mut hasher = Sha256::new();
	hasher.update(salt);
	hasher.update(derived_key.expose_secret());
	hex::encode(hasher.finalize())
}

/// 验证主密码是否正确
pub fn verify_master_password(
	salt: &[u8; 32],
	derived_key: &Secret<[u8; 32]>,
	stored_hash: &str,
) -> bool {
	let computed = compute_master_hash(salt, derived_key);
	constant_time_eq::constant_time_eq(
		hex::decode(&computed).unwrap_or_default().as_slice(),
		hex::decode(stored_hash).unwrap_or_default().as_slice(),
	)
}

#[cfg(test)]
mod tests {
	use super::*;
	use secrecy::Secret;

	#[test]
	fn test_master_hash_verification() {
		let salt = [0x42u8; 32];
		let key = Secret::new([0xFFu8; 32]);
		let hash = compute_master_hash(&salt, &key);
		assert!(verify_master_password(&salt, &key, &hash));
		let wrong_key = Secret::new([0x00u8; 32]);
		assert!(!verify_master_password(&salt, &wrong_key, &hash));
	}
}
