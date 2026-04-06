use crate::dtos::ByteArray;
use ffi_support::{ByteBuffer, ErrorCode, ExternError, FfiStr};
use pairing_crypto::hwallet::HWallet;
use bip39::Mnemonic;
use std::str::FromStr;

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_generate_mnemonic(
    mnemonic_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let mnemonic = HWallet::generate_mnemonic();
    *mnemonic_out = ByteBuffer::from_vec(mnemonic.to_string().into_bytes());
    *err = ExternError::success();
    0
}

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_mnemonic_to_seed(
    mnemonic: FfiStr<'_>,
    passphrase: FfiStr<'_>,
    seed_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let mnemonic_str = mnemonic.into_string();
    let passphrase_str = passphrase.into_string();

    let parsed_mnemonic = match Mnemonic::from_str(&mnemonic_str) {
        Ok(m) => m,
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e.to_string());
            return 1;
        }
    };

    let seed = HWallet::mnemonic_to_seed(&parsed_mnemonic, &passphrase_str);
    *seed_out = ByteBuffer::from_vec(seed.to_vec());
    *err = ExternError::success();
    0
}

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_derive_private_key(
    seed: ByteArray,
    path: FfiStr<'_>,
    priv_key_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let path_str = path.into_string();

    let seed_vec = seed.to_vec();
    if seed_vec.len() != 64 {
        *err = ExternError::new_error(ErrorCode::new(1), "Seed must be exactly 64 bytes".to_string());
        return 1;
    }

    let mut seed_arr = [0u8; 64];
    seed_arr.copy_from_slice(&seed_vec);

    let priv_key = HWallet::derive_private_key(&seed_arr, &path_str);
    *priv_key_out = ByteBuffer::from_vec(priv_key);
    *err = ExternError::success();
    0
}

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_eth_address_from_pubkey(
    pubkey: ByteArray,
    address_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let addr = HWallet::eth_address_from_pubkey(&pk_vec);
    *address_out = ByteBuffer::from_vec(addr.into_bytes());
    *err = ExternError::success();
    0
}

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_sign_ecdsa_eth(
    privkey: ByteArray,
    message: ByteArray,
    signature_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let pk_vec = privkey.to_vec();
    let msg_vec = message.to_vec();

    match HWallet::sign_ecdsa_eth(&pk_vec, &msg_vec) {
        Ok(sig) => {
            *signature_out = ByteBuffer::from_vec(sig);
            *err = ExternError::success();
            0
        }
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e);
            1
        }
    }
}

#[no_mangle]
pub extern "C" fn pairing_crypto_hwallet_recover_eth_address(
    message: ByteArray,
    signature: ByteArray,
    address_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let msg_vec = message.to_vec();
    let sig_vec = signature.to_vec();

    match HWallet::recover_eth_address(&msg_vec, &sig_vec) {
        Ok(addr) => {
            *address_out = ByteBuffer::from_vec(addr.into_bytes());
            *err = ExternError::success();
            0
        }
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e);
            1
        }
    }
}
