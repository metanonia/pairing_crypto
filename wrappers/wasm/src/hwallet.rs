use wasm_bindgen::prelude::*;
use pairing_crypto::hwallet::HWallet;
use bip39::Mnemonic;
use std::str::FromStr;
use crate::utils::set_panic_hook;

#[wasm_bindgen(js_name = hwallet_generate_mnemonic)]
pub fn hwallet_generate_mnemonic() -> Result<String, JsValue> {
    set_panic_hook();
    let mnemonic = HWallet::generate_mnemonic();
    Ok(mnemonic.to_string())
}

#[wasm_bindgen(js_name = hwallet_mnemonic_to_seed)]
pub fn hwallet_mnemonic_to_seed(mnemonic: &str, passphrase: &str) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    let parsed_mnemonic = Mnemonic::from_str(mnemonic)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let seed = HWallet::mnemonic_to_seed(&parsed_mnemonic, passphrase);
    Ok(seed.to_vec())
}

#[wasm_bindgen(js_name = hwallet_derive_private_key)]
pub fn hwallet_derive_private_key(seed: &[u8], path: &str) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    if seed.len() != 64 {
        return Err(JsValue::from_str("Seed must be exactly 64 bytes"));
    }
    let mut seed_arr = [0u8; 64];
    seed_arr.copy_from_slice(seed);

    let priv_key = HWallet::derive_private_key(&seed_arr, path);
    Ok(priv_key)
}
#[wasm_bindgen(js_name = hwallet_eth_address_from_pubkey)]
pub fn hwallet_eth_address_from_pubkey(pubkey: &[u8]) -> Result<String, JsValue> {
    set_panic_hook();
    let address = HWallet::eth_address_from_pubkey(pubkey);
    Ok(address)
}

#[wasm_bindgen(js_name = hwallet_sign_ecdsa_eth)]
pub fn hwallet_sign_ecdsa_eth(privkey: &[u8], message: &[u8]) -> Result<Vec<u8>, JsValue> {
    set_panic_hook();
    HWallet::sign_ecdsa_eth(privkey, message)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen(js_name = hwallet_recover_eth_address)]
pub fn hwallet_recover_eth_address(message: &[u8], signature: &[u8]) -> Result<String, JsValue> {
    set_panic_hook();
    HWallet::recover_eth_address(message, signature)
        .map_err(|e| JsValue::from_str(&e))
}
