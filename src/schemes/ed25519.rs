use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use curve25519_dalek::edwards::CompressedEdwardsY;
use sha2::Sha512;
use digest::Digest;

/// Ed25519 서명 및 검증 스킴 구현
pub struct Ed25519;

impl Ed25519 {
    /// 32바이트 Seed로부터 키쌍(SecretKey, PublicKey)을 생성합니다.
    /// 결과값: (32바이트 SecretKey, 32바이트 PublicKey)
    pub fn keypair_from_seed(seed: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
        if seed.len() != 32 {
            return Err("Seed must be exactly 32 bytes".to_string());
        }
        let seed_bytes: [u8; 32] = seed.try_into().map_err(|_| "Invalid seed length")?;
        let signing_key = SigningKey::from_bytes(&seed_bytes);
        let verifying_key = signing_key.verifying_key();
        
        Ok((
            signing_key.to_bytes().to_vec(),
            verifying_key.to_bytes().to_vec(),
        ))
    }

    /// 개인키(32바이트)를 사용하여 메시지에 서명합니다.
    pub fn sign(privkey: &[u8], message: &[u8]) -> Result<Vec<u8>, String> {
        let privkey_bytes: [u8; 32] = privkey
            .try_into()
            .map_err(|_| "Private key must be exactly 32 bytes".to_string())?;
        let signing_key = SigningKey::from_bytes(&privkey_bytes);
        let signature = signing_key.sign(message);
        Ok(signature.to_bytes().to_vec())
    }

    /// 공용키(32바이트)를 사용하여 서명을 검증합니다.
    pub fn verify(pubkey: &[u8], message: &[u8], signature: &[u8]) -> Result<bool, String> {
        let pubkey_bytes: [u8; 32] = pubkey
            .try_into()
            .map_err(|_| "Public key must be exactly 32 bytes".to_string())?;
        let signature_bytes: [u8; 64] = signature
            .try_into()
            .map_err(|_| "Signature must be exactly 64 bytes".to_string())?;
        
        let verifying_key = VerifyingKey::from_bytes(&pubkey_bytes).map_err(|e| e.to_string())?;
        let signature = Signature::from_bytes(&signature_bytes);
        
        match verifying_key.verify(message, &signature) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// 개인키(Seed)를 X25519 개인키(Scalar)로 변환합니다.
    pub fn privkey_to_x25519(privkey: &[u8]) -> Result<Vec<u8>, String> {
        if privkey.len() != 32 {
            return Err("Private key must be exactly 32 bytes".to_string());
        }
        // Ed25519 시드(32바이트)를 SHA-512 해시하고 앞의 32바이트를 사용
        let mut hasher = Sha512::new();
        hasher.update(privkey);
        let hash = hasher.finalize();
        let mut x25519_sk = [0u8; 32];
        x25519_sk.copy_from_slice(&hash[0..32]);
        
        // x25519-dalek 라이브러리 내부에서 StaticSecret로 변환할 때 clamping이 이루어짐
        Ok(x25519_sk.to_vec())
    }

    /// Ed25519 공용키를 X25519 공용키(Montgomery u-coordinate)로 변환합니다.
    pub fn pubkey_to_x25519(pubkey: &[u8]) -> Result<Vec<u8>, String> {
        if pubkey.len() != 32 {
            return Err("Public key must be exactly 32 bytes".to_string());
        }
        let ed_point = CompressedEdwardsY::from_slice(pubkey)
            .map_err(|e| e.to_string())?
            .decompress()
            .ok_or("Invalid Ed25519 public key point")?;
        
        let x_point = ed_point.to_montgomery();
        Ok(x_point.as_bytes().to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ed25519_round_trip() {
        let seed = [1u8; 32];
        let (sk, pk) = Ed25519::keypair_from_seed(&seed).unwrap();
        assert_eq!(sk.len(), 32);
        assert_eq!(pk.len(), 32);

        let message = b"hello ed25519";
        let signature = Ed25519::sign(&sk, message).unwrap();
        assert_eq!(signature.len(), 64);

        let is_valid = Ed25519::verify(&pk, message, &signature).unwrap();
        assert!(is_valid);

        let is_invalid = Ed25519::verify(&pk, b"other message", &signature).unwrap();
        assert!(!is_invalid);
    }

    #[test]
    fn test_ed25519_to_x25519_conversion() {
        let seed = [1u8; 32];
        let (_, ed_pk) = Ed25519::keypair_from_seed(&seed).unwrap();
        
        let x_sk = Ed25519::privkey_to_x25519(&seed).unwrap();
        let x_pk = Ed25519::pubkey_to_x25519(&ed_pk).unwrap();
        
        assert_eq!(x_sk.len(), 32);
        assert_eq!(x_pk.len(), 32);
        
        // 간단한 일관성 검증 (x25519-dalek 호환성)
        use x25519_dalek::{StaticSecret, PublicKey};
        let x_sk_obj = StaticSecret::from(u8_to_32(&x_sk));
        let x_pk_derived = PublicKey::from(&x_sk_obj);
        
        assert_eq!(x_pk_derived.as_bytes(), x_pk.as_slice());
    }

    fn u8_to_32(bytes: &[u8]) -> [u8; 32] {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(bytes);
        arr
    }
}
