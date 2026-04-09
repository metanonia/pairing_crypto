use crate::dtos::ByteArray;
use ffi_support::{ByteBuffer, ErrorCode, ExternError};
use pairing_crypto::ecies::EciesCipher;

#[no_mangle]
pub extern "C" fn pairing_crypto_ecies_keypair_from_bytes(
    privkey_bytes: ByteArray,
    sk_out: &mut ByteBuffer,
    pk_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let priv_vec = privkey_bytes.to_vec();
    match EciesCipher::keypair_from_bytes(&priv_vec) {
        Ok((sk, pk)) => {
            *sk_out = ByteBuffer::from_vec(sk);
            *pk_out = ByteBuffer::from_vec(pk);
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
pub extern "C" fn pairing_crypto_ecies_encrypt(
    uncompressed_pubkey: ByteArray,
    msg: ByteArray,
    encrypted_msg_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let pk_vec = uncompressed_pubkey.to_vec();
    let msg_vec = msg.to_vec();

    match EciesCipher::encrypt_with_pubkey(&pk_vec, &msg_vec) {
        Ok(enc) => {
            *encrypted_msg_out = ByteBuffer::from_vec(enc);
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
pub extern "C" fn pairing_crypto_ecies_decrypt(
    privkey_bytes: ByteArray,
    encrypted_data: ByteArray,
    decrypted_msg_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let sk_vec = privkey_bytes.to_vec();
    let enc_vec = encrypted_data.to_vec();

    match EciesCipher::decrypt_with_privkey(&sk_vec, &enc_vec) {
        Ok(dec) => {
            *decrypted_msg_out = ByteBuffer::from_vec(dec);
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
pub extern "C" fn pairing_crypto_ecies_x25519_keypair_from_bytes(
    privkey_bytes: ByteArray,
    sk_out: &mut ByteBuffer,
    pk_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let priv_vec = privkey_bytes.to_vec();
    match EciesCipher::keypair_x25519(&priv_vec) {
        Ok((sk, pk)) => {
            *sk_out = ByteBuffer::from_vec(sk);
            *pk_out = ByteBuffer::from_vec(pk);
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
pub extern "C" fn pairing_crypto_ecies_x25519_encrypt(
    pubkey_bytes: ByteArray,
    msg: ByteArray,
    encrypted_msg_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let pk_vec = pubkey_bytes.to_vec();
    let msg_vec = msg.to_vec();

    match EciesCipher::encrypt_x25519(&pk_vec, &msg_vec) {
        Ok(enc) => {
            *encrypted_msg_out = ByteBuffer::from_vec(enc);
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
pub extern "C" fn pairing_crypto_ecies_x25519_decrypt(
    privkey_bytes: ByteArray,
    encrypted_data: ByteArray,
    decrypted_msg_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let sk_vec = privkey_bytes.to_vec();
    let enc_vec = encrypted_data.to_vec();

    match EciesCipher::decrypt_x25519(&sk_vec, &enc_vec) {
        Ok(dec) => {
            *decrypted_msg_out = ByteBuffer::from_vec(dec);
            *err = ExternError::success();
            0
        }
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e);
            1
        }
    }
}
