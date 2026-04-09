use wasm_bindgen::prelude::*;
use pairing_crypto::ed25519::Ed25519;
use crate::utils::set_panic_hook;

#[wasm_bindgen]
pub struct Ed25519KeyPair {
    secret_key: Vec<u8>,
    public_key: Vec<u8>,
}

#[wasm_bindgen]
impl Ed25519KeyPair {
    #[wasm_bindgen(getter)]
    pub fn secret_key(&self) -> Vec<u8> {
        self.secret_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }
}

#[wasm_bindgen(js_name = ed25519_keypair_from_seed)]
pub fn ed25519_keypair_from_seed(seed: &[u8]) -> Result<Ed25519KeyPair, JsValue> {
    set_panic_hook();
    let (sk, pk) = Ed25519::keypair_from_seed(seed)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(Ed25519KeyPair {
        secret_key: sk,
        public_key: pk,
    })
}

#[wasm_bindgen(js_name = ed25519_sign)]
pub fn ed25519_sign(privkey: &[u8], msg: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let sig = Ed25519::sign(privkey, msg)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(sig)
}

#[wasm_bindgen(js_name = ed25519_verify)]
pub fn ed25519_verify(pubkey: &[u8], msg: &[u8], sig: &[u8]) -> Result<bool, JsValue> {
    set_panic_hook();
    let valid = Ed25519::verify(pubkey, msg, sig)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(valid)
}

#[wasm_bindgen(js_name = ed25519_sk_to_x25519)]
pub fn ed25519_sk_to_x25519(privkey: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let x_sk = Ed25519::privkey_to_x25519(privkey)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(x_sk)
}

#[wasm_bindgen(js_name = ed25519_pk_to_x25519)]
pub fn ed25519_pk_to_x25519(pubkey: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let x_pk = Ed25519::pubkey_to_x25519(pubkey)
        .map_err(|e| JsValue::from_str(e.as_str()))?;
    Ok(x_pk)
}
