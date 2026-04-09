use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::{PublicKey as K256PublicKey, SecretKey as K256SecretKey};
use x25519_dalek::{StaticSecret, PublicKey as X25519PublicKey};
use rand::{rngs::OsRng, RngCore};
use sha2_v10::Sha256;
use sha2::Sha512;
use generic_array::GenericArray;

// Type alias for ECIES compatibility (16-byte nonce)
use aead::{Aead, KeyInit};
use aes_gcm::AesGcm;
use aes_gcm::aes::Aes256;
use typenum::consts::U16;
use hkdf::Hkdf;

// Type alias for ECIES compatibility (16-byte nonce)
type Aes256Gcm16 = AesGcm<Aes256, U16>;

/// ECIES 암호화 및 복호화 래퍼 (WASM 호환 순수 Rust 구현)
pub struct EciesCipher;

impl EciesCipher {
    /// 공용키(Serialize)를 사용하여 데이터를 암호화합니다.
    /// 포맷: [65바이트 임시 공개키] + [16바이트 IV] + [16바이트 TAG] + [암호문]
    pub fn encrypt_with_pubkey(uncompressed_pubkey: &[u8], msg: &[u8]) -> Result<Vec<u8>, String> {
        let recipient_pk = K256PublicKey::from_sec1_bytes(uncompressed_pubkey).map_err(|e| e.to_string())?;

        // 1. 임시 키 쌍 생성
        let ephemeral_sk = K256SecretKey::random(&mut OsRng);
        let ephemeral_pk = ephemeral_sk.public_key();

        // 2. ECDH 공유 비밀키 생성
        let shared_secret = k256::elliptic_curve::ecdh::diffie_hellman(
            ephemeral_sk.to_nonzero_scalar(),
            recipient_pk.as_affine(),
        );
        let shared_secret_bytes = shared_secret.raw_secret_bytes();

        // 3. KDF (HKDF-SHA256)를 통한 AES 키 유도
        let hk = Hkdf::<Sha256>::new(None, &shared_secret_bytes);
        let mut okm = [0u8; 32];
        hk.expand(&[], &mut okm).map_err(|e| e.to_string())?;

        // 4. 무작위 IV 생성 (16바이트)
        let mut iv = [0u8; 16];
        OsRng.fill_bytes(&mut iv);

        // 5. AES-256-GCM 암호화
        let cipher = Aes256Gcm16::new_from_slice(&okm).map_err(|e| e.to_string())?;
        let nonce = GenericArray::from_slice(&iv);
        
        let ciphertext_with_tag = cipher
            .encrypt(nonce, msg)
            .map_err(|e| e.to_string())?;

        // aes-gcm crate의 encrypt 결과는 [ciphertext || tag] 입니다 (16바이트 tag)
        if ciphertext_with_tag.len() < 16 {
            return Err("Encryption error: result too short".to_string());
        }
        let (ciphertext, tag) = ciphertext_with_tag.split_at(ciphertext_with_tag.len() - 16);

        // 6. 패킷 조립: [65] + [16] + [16] + [N]
        let mut res = Vec::with_capacity(65 + 16 + 16 + ciphertext.len());
        res.extend_from_slice(ephemeral_pk.to_encoded_point(false).as_bytes()); // Uncompressed PK (65 bytes)
        res.extend_from_slice(&iv);
        res.extend_from_slice(tag);
        res.extend_from_slice(ciphertext);
        
        Ok(res)
    }

    /// 개인키(32바이트 Secret Key)를 사용하여 데이터를 복호화합니다.
    pub fn decrypt_with_privkey(privkey_bytes: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        if encrypted_data.len() < 65 + 16 + 16 {
            return Err("Encrypted data too short".to_string());
        }

        // 1. 패킷 분해
        let (ephemeral_pk_bytes, rest) = encrypted_data.split_at(65);
        let (iv_bytes, rest) = rest.split_at(16);
        let (tag, ciphertext) = rest.split_at(16);

        let ephemeral_pk = K256PublicKey::from_sec1_bytes(ephemeral_pk_bytes).map_err(|e| e.to_string())?;
        let recipient_sk = K256SecretKey::from_slice(privkey_bytes).map_err(|e| e.to_string())?;

        // 2. ECDH 공유 비밀키 생성
        let shared_secret = k256::elliptic_curve::ecdh::diffie_hellman(
            recipient_sk.to_nonzero_scalar(),
            ephemeral_pk.as_affine(),
        );
        let shared_secret_bytes = shared_secret.raw_secret_bytes();

        // 3. KDF (HKDF-SHA256)를 통한 AES 키 유도
        let hk = Hkdf::<Sha256>::new(None, &shared_secret_bytes);
        let mut okm = [0u8; 32];
        hk.expand(&[], &mut okm).map_err(|e| e.to_string())?;

        // 4. AES-256-GCM 복호화
        let cipher = Aes256Gcm16::new_from_slice(&okm).map_err(|e| e.to_string())?;
        let nonce = GenericArray::from_slice(iv_bytes);
        
        // aes-gcm crate는 [ciphertext || tag] 형태를 예상하므로 다시 합쳐줍니다.
        let mut combined = Vec::with_capacity(ciphertext.len() + 16);
        combined.extend_from_slice(ciphertext);
        combined.extend_from_slice(tag);

        let decrypted = cipher
            .decrypt(nonce, combined.as_slice())
            .map_err(|e| e.to_string())?;

        Ok(decrypted)
    }

    /// 개인키로부터 (SecretKey, PublicKey) 페어를 생성합니다. (k256)
    pub fn keypair_from_bytes(privkey_bytes: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
        let sk = K256SecretKey::from_slice(privkey_bytes).map_err(|e| e.to_string())?;
        let pk = sk.public_key();
        Ok((sk.to_bytes().to_vec(), pk.to_encoded_point(false).as_bytes().to_vec()))
    }

    /// X25519 공용키를 사용하여 데이터를 암호화합니다.
    /// 포맷: [32바이트 임시 공개키] + [16바이트 IV] + [16바이트 TAG] + [암호문]
    pub fn encrypt_x25519(pubkey_bytes: &[u8], msg: &[u8]) -> Result<Vec<u8>, String> {
        if pubkey_bytes.len() != 32 {
            return Err("X25519 Public key must be 32 bytes".to_string());
        }
        let mut pk_arr = [0u8; 32];
        pk_arr.copy_from_slice(pubkey_bytes);
        let recipient_pk = X25519PublicKey::from(pk_arr);

        // 1. 임시 키 쌍 생성
        let ephemeral_sk = StaticSecret::random_from_rng(&mut OsRng);
        let ephemeral_pk = X25519PublicKey::from(&ephemeral_sk);

        // 2. ECDH 공유 비밀키 생성
        let shared_secret = ephemeral_sk.diffie_hellman(&recipient_pk);
        let shared_secret_bytes = shared_secret.as_bytes();

        // 3. KDF (HKDF-SHA256)
        let hk = Hkdf::<Sha256>::new(None, shared_secret_bytes);
        let mut okm = [0u8; 32];
        hk.expand(&[], &mut okm).map_err(|e| e.to_string())?;

        // 4. IV 생성 (16바이트)
        let mut iv = [0u8; 16];
        OsRng.fill_bytes(&mut iv);

        // 5. AES-256-GCM
        let cipher = Aes256Gcm16::new_from_slice(&okm).map_err(|e| e.to_string())?;
        let nonce = GenericArray::from_slice(&iv);
        let ciphertext_with_tag = cipher.encrypt(nonce, msg).map_err(|e| e.to_string())?;

        let (ciphertext, tag) = ciphertext_with_tag.split_at(ciphertext_with_tag.len() - 16);

        // 6. 패킷 조립: [32] + [16] + [16] + [N]
        let mut res = Vec::with_capacity(32 + 16 + 16 + ciphertext.len());
        res.extend_from_slice(ephemeral_pk.as_bytes());
        res.extend_from_slice(&iv);
        res.extend_from_slice(tag);
        res.extend_from_slice(ciphertext);
        Ok(res)
    }

    /// X25519 개인키를 사용하여 데이터를 복호화합니다.
    pub fn decrypt_x25519(privkey_bytes: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        if encrypted_data.len() < 32 + 16 + 16 {
            return Err("Encrypted data too short".to_string());
        }
        if privkey_bytes.len() != 32 {
            return Err("Private key must be 32 bytes".to_string());
        }

        let (ephemeral_pk_bytes, rest) = encrypted_data.split_at(32);
        let (iv_bytes, rest) = rest.split_at(16);
        let (tag, ciphertext) = rest.split_at(16);

        let mut sk_arr = [0u8; 32];
        sk_arr.copy_from_slice(privkey_bytes);
        let recipient_sk = StaticSecret::from(sk_arr);
        
        let mut pk_arr = [0u8; 32];
        pk_arr.copy_from_slice(ephemeral_pk_bytes);
        let ephemeral_pk = X25519PublicKey::from(pk_arr);

        let shared_secret = recipient_sk.diffie_hellman(&ephemeral_pk);
        let shared_secret_bytes = shared_secret.as_bytes();

        let hk = Hkdf::<Sha256>::new(None, shared_secret_bytes);
        let mut okm = [0u8; 32];
        hk.expand(&[], &mut okm).map_err(|e| e.to_string())?;

        let cipher = Aes256Gcm16::new_from_slice(&okm).map_err(|e| e.to_string())?;
        let nonce = GenericArray::from_slice(iv_bytes);
        let mut combined = Vec::with_capacity(ciphertext.len() + 16);
        combined.extend_from_slice(ciphertext);
        combined.extend_from_slice(tag);

        let decrypted = cipher.decrypt(nonce, combined.as_slice()).map_err(|e| e.to_string())?;
        Ok(decrypted)
    }

    /// X25519용 키 페어를 생성합니다.
    pub fn keypair_x25519(privkey_bytes: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
        if privkey_bytes.len() != 32 {
            return Err("Private key must be 32 bytes".to_string());
        }
        let mut sk_arr = [0u8; 32];
        sk_arr.copy_from_slice(privkey_bytes);
        let sk = StaticSecret::from(sk_arr);
        let pk = X25519PublicKey::from(&sk);
        Ok((sk.to_bytes().to_vec(), pk.as_bytes().to_vec()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ecies_round_trip() {
        let sk_bytes = [1u8; 32];
        let (_, pk_bytes) = EciesCipher::keypair_from_bytes(&sk_bytes).unwrap();
        let msg = b"hello world";
        
        let encrypted = EciesCipher::encrypt_with_pubkey(&pk_bytes, msg).unwrap();
        let decrypted = EciesCipher::decrypt_with_privkey(&sk_bytes, &encrypted).unwrap();
        
        assert_eq!(msg.to_vec(), decrypted);
    }

    #[test]
    fn test_ecies_x25519_round_trip() {
        let sk_bytes = [2u8; 32];
        let (_, pk_bytes) = EciesCipher::keypair_x25519(&sk_bytes).unwrap();
        let msg = b"hello x25519 world";
        
        let encrypted = EciesCipher::encrypt_x25519(&pk_bytes, msg).unwrap();
        let decrypted = EciesCipher::decrypt_x25519(&sk_bytes, &encrypted).unwrap();
        
        assert_eq!(msg.to_vec(), decrypted);
    }
}
