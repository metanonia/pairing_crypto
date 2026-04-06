use ecies::{encrypt, decrypt};

/// ECIES 암호화 및 복호화 래퍼
pub struct EciesCipher;

impl EciesCipher {
    /// 공용키(Serialize)를 사용하여 데이터를 암호화합니다.
    pub fn encrypt_with_pubkey(uncompressed_pubkey: &[u8], msg: &[u8]) -> Result<Vec<u8>, String> {
        encrypt(uncompressed_pubkey, msg).map_err(|e| e.to_string())
    }

    /// 개인키(32바이트 Secret Key)를 사용하여 데이터를 복호화합니다.
    pub fn decrypt_with_privkey(privkey_bytes: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        decrypt(privkey_bytes, encrypted_data).map_err(|e| e.to_string())
    }

    /// 개인키로부터 (SecretKey, PublicKey) 페어를 생성합니다.
    pub fn keypair_from_bytes(privkey_bytes: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
        let secp = secp256k1::Secp256k1::new();
        let sk = secp256k1::SecretKey::from_slice(privkey_bytes).map_err(|e| e.to_string())?;
        let pk = secp256k1::PublicKey::from_secret_key(&secp, &sk);
        // ECIES는 uncompressed pubkey (65 bytes) 를 사용하므로 이를 반환합니다.
        Ok((sk.secret_bytes().to_vec(), pk.serialize_uncompressed().to_vec()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ecies_round_trip() {
        let secp = secp256k1::Secp256k1::new();
        let (sk, pk) = secp.generate_keypair(&mut rand::thread_rng());
        let msg = b"hello world";
        
        let encrypted = EciesCipher::encrypt_with_pubkey(&pk.serialize_uncompressed(), msg).unwrap();
        let decrypted = EciesCipher::decrypt_with_privkey(&sk.secret_bytes(), &encrypted).unwrap();
        
        assert_eq!(msg.to_vec(), decrypted);
    }
}
