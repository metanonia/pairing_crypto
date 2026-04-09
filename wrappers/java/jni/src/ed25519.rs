#![allow(non_snake_case)]

use ffi_support::{ByteBuffer, ExternError};
use jni::JNIEnv;
use jni::objects::JObject;
use jni::sys::{jbyte, jbyteArray, jint};
use pairing_crypto_c::{
    dtos::ByteArray,
    ed25519::{
        pairing_crypto_ed25519_keypair_from_seed,
        pairing_crypto_ed25519_sign,
        pairing_crypto_ed25519_verify,
        pairing_crypto_ed25519_sk_to_x25519,
        pairing_crypto_ed25519_pk_to_x25519,
    },
};

macro_rules! copy_to_jni {
    ($env:expr, $job_array:expr, $data:expr) => {
        if let Err(_) = $env.set_byte_array_region($job_array, 0, $data) {
            return 1;
        }
    };
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ed25519_keypairFromSeed(
    env: JNIEnv,
    _: JObject,
    seed: jbyteArray,
    sk_out: jbyteArray,
    pk_out: jbyteArray,
) -> jint {
    let seed_vec = match env.convert_byte_array(seed) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut sk = ByteBuffer::from_vec(vec![]);
    let mut pk = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ed25519_keypair_from_seed(ByteArray::from(&seed_vec), &mut sk, &mut pk, &mut error);
    if result != 0 {
        return result;
    }

    let sk_bytes: Vec<i8> = sk.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    let pk_bytes: Vec<i8> = pk.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    
    copy_to_jni!(env, sk_out, sk_bytes.as_slice());
    copy_to_jni!(env, pk_out, pk_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ed25519_sign(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    msg: jbyteArray,
    sig_out: jbyteArray,
) -> jint {
    let sk_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let msg_vec = match env.convert_byte_array(msg) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ed25519_sign(ByteArray::from(&sk_vec), ByteArray::from(&msg_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, sig_out, out_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ed25519_verify(
    env: JNIEnv,
    _: JObject,
    pubkey: jbyteArray,
    msg: jbyteArray,
    sig: jbyteArray,
) -> jint {
    let pk_vec = match env.convert_byte_array(pubkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let msg_vec = match env.convert_byte_array(msg) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let sig_vec = match env.convert_byte_array(sig) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    
    let result = pairing_crypto_ed25519_verify(
        ByteArray::from(&pk_vec), 
        ByteArray::from(&msg_vec), 
        ByteArray::from(&sig_vec), 
        &mut error
    );
    
    result
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ed25519_skToX25519(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    x_sk_out: jbyteArray,
) -> jint {
    let sk_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ed25519_sk_to_x25519(ByteArray::from(&sk_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, x_sk_out, out_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ed25519_pkToX25519(
    env: JNIEnv,
    _: JObject,
    pubkey: jbyteArray,
    x_pk_out: jbyteArray,
) -> jint {
    let pk_vec = match env.convert_byte_array(pubkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ed25519_pk_to_x25519(ByteArray::from(&pk_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, x_pk_out, out_bytes.as_slice());
    0
}
