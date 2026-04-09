use crate::dtos::ByteArray;
use ffi_support::{ByteBuffer, ErrorCode, ExternError};
use pairing_crypto::ed25519::Ed25519;

#[no_mangle]
pub extern "C" fn pairing_crypto_ed25519_keypair_from_seed(
    seed: ByteArray,
    sk_out: &mut ByteBuffer,
    pk_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let seed_vec = seed.to_vec();
    match Ed25519::keypair_from_seed(&seed_vec) {
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
pub extern "C" fn pairing_crypto_ed25519_sign(
    privkey: ByteArray,
    message: ByteArray,
    signature_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let sk_vec = privkey.to_vec();
    let msg_vec = message.to_vec();

    match Ed25519::sign(&sk_vec, &msg_vec) {
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
pub extern "C" fn pairing_crypto_ed25519_verify(
    pubkey: ByteArray,
    message: ByteArray,
    signature: ByteArray,
    err: &mut ExternError,
) -> i32 {
    let pk_vec = pubkey.to_vec();
    let msg_vec = message.to_vec();
    let sig_vec = signature.to_vec();

    match Ed25519::verify(&pk_vec, &msg_vec, &sig_vec) {
        Ok(valid) => {
            *err = ExternError::success();
            if valid { 0 } else { 1 }
        }
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e);
            1
        }
    }
}

#[no_mangle]
pub extern "C" fn pairing_crypto_ed25519_sk_to_x25519(
    privkey: ByteArray,
    x25519_sk_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let sk_vec = privkey.to_vec();
    match Ed25519::privkey_to_x25519(&sk_vec) {
        Ok(x_sk) => {
            *x25519_sk_out = ByteBuffer::from_vec(x_sk);
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
pub extern "C" fn pairing_crypto_ed25519_pk_to_x25519(
    pubkey: ByteArray,
    x25519_pk_out: &mut ByteBuffer,
    err: &mut ExternError,
) -> i32 {
    let pk_vec = pubkey.to_vec();
    match Ed25519::pubkey_to_x25519(&pk_vec) {
        Ok(x_pk) => {
            *x25519_pk_out = ByteBuffer::from_vec(x_pk);
            *err = ExternError::success();
            0
        }
        Err(e) => {
            *err = ExternError::new_error(ErrorCode::new(1), e);
            1
        }
    }
}
