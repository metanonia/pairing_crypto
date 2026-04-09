#![allow(non_snake_case)]

use ffi_support::{ByteBuffer, ExternError};
use jni::JNIEnv;
use jni::objects::JObject;
use jni::sys::{jbyte, jbyteArray, jint};
use pairing_crypto_c::{
    dtos::ByteArray,
    ecies::{
        pairing_crypto_ecies_keypair_from_bytes,
        pairing_crypto_ecies_encrypt,
        pairing_crypto_ecies_decrypt,
        pairing_crypto_ecies_x25519_keypair_from_bytes,
        pairing_crypto_ecies_x25519_encrypt,
        pairing_crypto_ecies_x25519_decrypt,
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
pub extern "C" fn Java_pairing_1crypto_Ecies_keypairFromBytes(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    sk_out: jbyteArray,
    pk_out: jbyteArray,
) -> jint {
    let priv_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut sk = ByteBuffer::from_vec(vec![]);
    let mut pk = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_keypair_from_bytes(ByteArray::from(&priv_vec), &mut sk, &mut pk, &mut error);
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
pub extern "C" fn Java_pairing_1crypto_Ecies_encrypt(
    env: JNIEnv,
    _: JObject,
    pubkey: jbyteArray,
    msg: jbyteArray,
    enc_out: jbyteArray,
) -> jint {
    let pk_vec = match env.convert_byte_array(pubkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let msg_vec = match env.convert_byte_array(msg) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_encrypt(ByteArray::from(&pk_vec), ByteArray::from(&msg_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, enc_out, out_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ecies_decrypt(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    cipher: jbyteArray,
    dec_out: jbyteArray,
) -> jint {
    let sk_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let cipher_vec = match env.convert_byte_array(cipher) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_decrypt(ByteArray::from(&sk_vec), ByteArray::from(&cipher_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, dec_out, out_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ecies_keypairX25519FromBytes(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    sk_out: jbyteArray,
    pk_out: jbyteArray,
) -> jint {
    let priv_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut sk = ByteBuffer::from_vec(vec![]);
    let mut pk = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_x25519_keypair_from_bytes(ByteArray::from(&priv_vec), &mut sk, &mut pk, &mut error);
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
pub extern "C" fn Java_pairing_1crypto_Ecies_encryptX25519(
    env: JNIEnv,
    _: JObject,
    pubkey: jbyteArray,
    msg: jbyteArray,
    enc_out: jbyteArray,
) -> jint {
    let pk_vec = match env.convert_byte_array(pubkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let msg_vec = match env.convert_byte_array(msg) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_x25519_encrypt(ByteArray::from(&pk_vec), ByteArray::from(&msg_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, enc_out, out_bytes.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_Ecies_decryptX25519(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    cipher: jbyteArray,
    dec_out: jbyteArray,
) -> jint {
    let sk_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let cipher_vec = match env.convert_byte_array(cipher) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_ecies_x25519_decrypt(ByteArray::from(&sk_vec), ByteArray::from(&cipher_vec), &mut out, &mut error);
    if result != 0 {
        return result;
    }

    let out_bytes: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, dec_out, out_bytes.as_slice());
    0
}
