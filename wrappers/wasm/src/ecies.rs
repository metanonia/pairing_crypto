use wasm_bindgen::prelude::*;
use pairing_crypto::ecies::EciesCipher;
use crate::utils::set_panic_hook;

#[wasm_bindgen]
pub struct EciesKeyPair {
    secret_key: Vec<u8>,
    public_key: Vec<u8>,
}

#[wasm_bindgen]
impl EciesKeyPair {
    #[wasm_bindgen(getter)]
    pub fn secret_key(&self) -> Vec<u8> {
        self.secret_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }
}

#[wasm_bindgen(js_name = ecies_keypair_from_bytes)]
pub fn ecies_keypair_from_bytes(privkey: &[u8]) -> Result<EciesKeyPair, JsValue> {
    set_panic_hook();
    let (sk, pk) = EciesCipher::keypair_from_bytes(privkey)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(EciesKeyPair {
        secret_key: sk,
        public_key: pk,
    })
}

#[wasm_bindgen(js_name = ecies_encrypt)]
pub fn ecies_encrypt(uncompressed_pubkey: &[u8], msg: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let enc = EciesCipher::encrypt_with_pubkey(uncompressed_pubkey, msg)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(enc)
}

#[wasm_bindgen(js_name = ecies_encrypt_with_pubkey)]
pub fn ecies_encrypt_with_pubkey(uncompressed_pubkey: &[u8], msg: &[u8]) -> Result<Vec<u8>, JsValue> {
    ecies_encrypt(uncompressed_pubkey, msg)
}

#[wasm_bindgen(js_name = ecies_decrypt)]
pub fn ecies_decrypt(privkey: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let dec = EciesCipher::decrypt_with_privkey(privkey, encrypted_data)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(dec)
}

#[wasm_bindgen(js_name = ecies_decrypt_with_privkey)]
pub fn ecies_decrypt_with_privkey(privkey: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    ecies_decrypt(privkey, encrypted_data)
}
