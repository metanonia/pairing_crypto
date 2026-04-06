use bip32::{DerivationPath, XPrv};
use bip39::Mnemonic;
use rand::RngCore;
use sha3::{Digest, Keccak256};
use std::str::FromStr;

/// HD Wallet 구현체
pub struct HWallet;

impl HWallet {
    /// 무작위 Mnemonic 생성 (24단어)
    pub fn generate_mnemonic() -> Mnemonic {
        let mut entropy = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut entropy);
        Mnemonic::from_entropy(&entropy).unwrap()
    }

    /// Mnemonic으로부터 시드 생성
    pub fn mnemonic_to_seed(mnemonic: &Mnemonic, passphrase: &str) -> [u8; 64] {
        mnemonic.to_seed(passphrase)
    }

    /// 시드와 경로로부터 개인키 유도 (이더리움 표준 경로: m/44'/60'/0'/0/index)
    pub fn derive_private_key(seed: &[u8; 64], path_str: &str) -> Vec<u8> {
        let path = DerivationPath::from_str(path_str).expect("Invalid derivation path");
        let child_key = XPrv::derive_from_path(seed, &path).expect("Key derivation failed");
        child_key.private_key().to_bytes().as_slice().to_vec()
    }

    /// 공용키(Serialize Uncompressed)로부터 이더리움 주소 생성
    /// 이더리움 주소는 공용키의 Keccak256 해시의 마지막 20바이트입니다.
    pub fn eth_address_from_pubkey(uncompressed_pubkey: &[u8]) -> String {
        // 이더리움 주소는 [0]번 바이트(0x04)를 제외한 나머지 64바이트의 해시를 사용합니다.
        let pubkey_to_hash = if uncompressed_pubkey.len() == 65 && uncompressed_pubkey[0] == 0x04 {
            &uncompressed_pubkey[1..]
        } else {
            uncompressed_pubkey
        };

        let mut hasher = Keccak256::new();
        hasher.update(pubkey_to_hash);
        let result = hasher.finalize();
        
        let address_bytes = &result[result.len() - 20..];
        format!("0x{}", hex::encode(address_bytes))
    }

    /// 이더리움 방식 ECDSA 서명 (65바이트: R(32) + S(32) + V(1))
    pub fn sign_ecdsa_eth(privkey: &[u8], message: &[u8]) -> Result<Vec<u8>, String> {
        let secp = secp256k1::Secp256k1::signing_only();
        let sk = secp256k1::SecretKey::from_slice(privkey).map_err(|e| e.to_string())?;
        
        // 이더리움은 메시지를 Keccak256 해싱한 후 서명합니다.
        let mut hasher = Keccak256::new();
        hasher.update(message);
        let hash = hasher.finalize();
        let msg = secp256k1::Message::from_digest_slice(&hash).map_err(|e| e.to_string())?;

        let sig = secp.sign_ecdsa_recoverable(&msg, &sk);
        let (recovery_id, serialize_sig) = sig.serialize_compact();
        
        let mut result = serialize_sig.to_vec();
        result.push(recovery_id.to_i32() as u8);
        Ok(result)
    }

    /// 서명과 메시지로부터 이더리움 주소 복구
    pub fn recover_eth_address(message: &[u8], signature: &[u8]) -> Result<String, String> {
        if signature.len() != 65 {
            return Err("Invalid signature length, must be 65 bytes".to_string());
        }

        let secp = secp256k1::Secp256k1::new();
        let recovery_id = secp256k1::ecdsa::RecoveryId::from_i32(signature[64] as i32)
            .map_err(|e| e.to_string())?;
        let sig = secp256k1::ecdsa::RecoverableSignature::from_compact(&signature[..64], recovery_id)
            .map_err(|e| e.to_string())?;

        let mut hasher = Keccak256::new();
        hasher.update(message);
        let hash = hasher.finalize();
        let msg = secp256k1::Message::from_digest_slice(&hash).map_err(|e| e.to_string())?;

        let pubkey = secp.recover_ecdsa(&msg, &sig).map_err(|e| e.to_string())?;
        Ok(Self::eth_address_from_pubkey(&pubkey.serialize_uncompressed()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mnemonic_generation() {
        let mnemonic = HWallet::generate_mnemonic();
        assert_eq!(mnemonic.word_count(), 24);
    }

    #[test]
    fn test_eth_address_derivation() {
        // 특정 테스트 벡터를 사용하거나 로직 정합성 확인
        let uncompressed_pk = hex::decode("04d9c490a6e0b7596ad733c7cc397223b24fdbb8d5a7114b35e2392df86095318357a70195a6ec89f074d2899450ced663da525287f34085f1c9c7e098a5ef8c8f").unwrap();
        let address = HWallet::eth_address_from_pubkey(&uncompressed_pk);
        assert!(address.starts_with("0x"));
        assert_eq!(address.len(), 42); // 0x + 40 chars
    }

    #[test]
    fn test_ecdsa_sign_recover() {
        let mnemonic = HWallet::generate_mnemonic();
        let seed = HWallet::mnemonic_to_seed(&mnemonic, "");
        let privkey = HWallet::derive_private_key(&seed, "m/44'/60'/0'/0/0");
        let message = b"hello world";
        
        let sig = HWallet::sign_ecdsa_eth(&privkey, message).unwrap();
        assert_eq!(sig.len(), 65);
        
        let recovered_address = HWallet::recover_eth_address(message, &sig).unwrap();
        
        let (_, pubkey) = crate::schemes::ecies::EciesCipher::keypair_from_bytes(&privkey).unwrap();
        let expected_address = HWallet::eth_address_from_pubkey(&pubkey);
        
        assert_eq!(recovered_address, expected_address);
    }
}
