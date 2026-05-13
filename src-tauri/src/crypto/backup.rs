use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use secrecy::{ExposeSecret, Secret};
use std::io::{Read, Write};

use argon2::password_hash::PasswordHasher;

use crate::error::{AppError, AppResult};

/// 备份文件加密/解密器
/// 使用 AES-256-GCM (AEAD) 进行认证加密
///
/// 输出格式:
///   salt(32B) || nonce(12B) || ciphertext_with_tag(variable)
///
/// 安全设计:
/// - 使用独立备份密码（不由主密钥派生），用户可设置不同的备份密码
/// - 备份密钥通过 Argon2id 从密码 + 随机盐值派生
/// - AES-256-GCM 提供认证加密，防止篡改

const SALT_SIZE: usize = 32;
const NONCE_SIZE: usize = 12; // 96 位 nonce，AES-GCM 推荐值
const TAG_SIZE: usize = 16;   // GCM 认证标签

/// 从备份密码派生 AES-256 密钥
/// 使用 Argon2id 替代简单哈希，防止暴力破解
fn derive_backup_key(password: &Secret<String>, salt: &[u8; 32]) -> AppResult<Secret<[u8; 32]>> {
    // 复用项目的 Argon2id 参数: 64MB / 3轮 / 4通道
    let params = argon2::Params::new(65536, 3, 4, Some(32))
        .map_err(|e| AppError::Crypto(format!("Argon2 参数错误: {}", e)))?;
    let argon2 = argon2::Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        params,
    );
    let salt_string = argon2::password_hash::SaltString::encode_b64(salt)
        .map_err(|e| AppError::Crypto(format!("盐值编码错误: {}", e)))?;
    let hash = argon2
        .hash_password(password.expose_secret().as_bytes(), &salt_string)
        .map_err(|e| AppError::Crypto(format!("备份密钥派生失败: {}", e)))?;
    let key_bytes: [u8; 32] = hash
        .hash
        .ok_or_else(|| AppError::Crypto("备份密钥派生结果为空".to_string()))?
        .as_bytes()
        .try_into()
        .map_err(|_| AppError::Crypto("备份密钥长度不正确".to_string()))?;
    Ok(Secret::new(key_bytes))
}

/// 加密备份数据
///
/// 参数:
/// - password: 用户提供的独立备份密码
/// - plaintext: 要加密的明文数据
///
/// 返回:
/// - salt(32B) || nonce(12B) || ciphertext_with_tag(variable)
pub fn encrypt_backup(
    password: &Secret<String>,
    plaintext: &[u8],
) -> AppResult<Vec<u8>> {
    // 生成随机盐值和 nonce
    let salt = {
        let mut s = [0u8; SALT_SIZE];
        rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut s);
        s
    };
    let nonce_bytes = {
        let mut n = [0u8; NONCE_SIZE];
        rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut n);
        n
    };

    // 从密码派生密钥
    let key = derive_backup_key(password, &salt)?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(key.expose_secret());
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // AES-256-GCM 加密（自动附加认证标签）
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| AppError::Crypto(format!("AES-GCM 加密失败: {}", e)))?;

    // 输出格式: salt || nonce || ciphertext_with_tag
    let mut result = Vec::with_capacity(SALT_SIZE + NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// 解密备份数据
///
/// 参数:
/// - password: 备份时使用的密码
/// - data: 完整加密数据 (salt || nonce || ciphertext_with_tag)
pub fn decrypt_backup(
    password: &Secret<String>,
    data: &[u8],
) -> AppResult<Vec<u8>> {
    let header_size = SALT_SIZE + NONCE_SIZE;
    if data.len() < header_size + TAG_SIZE {
        return Err(AppError::Crypto(
            "备份数据格式错误: 数据过短".to_string(),
        ));
    }

    let salt: [u8; SALT_SIZE] = data[..SALT_SIZE]
        .try_into()
        .map_err(|_| AppError::Crypto("盐值解析失败".to_string()))?;
    let nonce_bytes: [u8; NONCE_SIZE] = data[SALT_SIZE..header_size]
        .try_into()
        .map_err(|_| AppError::Crypto("Nonce 解析失败".to_string()))?;

    // 从密码派生密钥
    let key = derive_backup_key(password, &salt)?;
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(key.expose_secret());
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // AES-256-GCM 解密（自动验证认证标签）
    let plaintext = cipher
        .decrypt(nonce, &data[header_size..])
        .map_err(|_| AppError::Crypto("备份解密失败: 密码错误或数据已被篡改".to_string()))?;

    Ok(plaintext)
}

/// 加密备份数据并写入文件
pub fn encrypt_backup_to_file(
    password: &Secret<String>,
    plaintext: &[u8],
    output_path: &std::path::Path,
) -> AppResult<()> {
    let encrypted = encrypt_backup(password, plaintext)?;
    let mut file = std::fs::File::create(output_path)?;
    file.write_all(&encrypted)?;
    Ok(())
}

/// 从文件读取并解密备份数据
pub fn decrypt_backup_from_file(
    password: &Secret<String>,
    input_path: &std::path::Path,
) -> AppResult<Vec<u8>> {
    let mut file = std::fs::File::open(input_path)?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)?;
    decrypt_backup(password, &data)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_password() -> Secret<String> {
        Secret::new("my-secure-backup-password-123!".to_string())
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let password = test_password();
        let plaintext = b"This is a test backup containing sensitive data.";

        let encrypted = encrypt_backup(&password, plaintext).unwrap();
        // 加密数据应包含 salt + nonce + ciphertext + tag
        assert!(encrypted.len() > SALT_SIZE + NONCE_SIZE + plaintext.len());

        let decrypted = decrypt_backup(&password, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_salt_each_time() {
        let password = test_password();
        let plaintext = b"test data";

        let encrypted1 = encrypt_backup(&password, plaintext).unwrap();
        let encrypted2 = encrypt_backup(&password, plaintext).unwrap();

        // 每次加密应产生不同的结果（随机 salt + nonce）
        assert_ne!(encrypted1, encrypted2);
    }

    #[test]
    fn test_wrong_password_fails() {
        let password = test_password();
        let wrong_password = Secret::new("wrong-password".to_string());
        let plaintext = b"secret data";

        let encrypted = encrypt_backup(&password, plaintext).unwrap();
        let result = decrypt_backup(&wrong_password, &encrypted);

        // 错误密码应导致解密失败（GCM 认证标签验证失败）
        assert!(result.is_err());
    }

    #[test]
    fn test_tampered_data_fails() {
        let password = test_password();
        let plaintext = b"secret data";

        let mut encrypted = encrypt_backup(&password, plaintext).unwrap();
        // 篡改密文中的一个字节
        let last = encrypted.len() - 1;
        encrypted[last] ^= 0x01;

        let result = decrypt_backup(&password, &encrypted);
        assert!(result.is_err()); // GCM 认证标签不匹配
    }

    #[test]
    fn test_short_data_fails() {
        let password = test_password();
        let too_short = vec![0u8; 10];
        let result = decrypt_backup(&password, &too_short);
        assert!(result.is_err());
    }

    #[test]
    fn test_encrypt_decrypt_file() {
        let password = test_password();
        let plaintext = b"File-based backup test data.";

        let tmp = std::env::temp_dir().join("vault-keeper-test-backup.bin");

        encrypt_backup_to_file(&password, plaintext, &tmp).unwrap();
        let decrypted = decrypt_backup_from_file(&password, &tmp).unwrap();

        assert_eq!(decrypted, plaintext);
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn test_large_data() {
        let password = test_password();
        let plaintext = vec![0xABu8; 100_000]; // 100KB

        let encrypted = encrypt_backup(&password, &plaintext).unwrap();
        let decrypted = decrypt_backup(&password, &encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }
}
