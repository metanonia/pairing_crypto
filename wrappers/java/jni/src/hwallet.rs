#![allow(non_snake_case)]

use ffi_support::{ByteBuffer, ExternError};
use jni::JNIEnv;
use jni::objects::{JObject, JString};
use jni::sys::{jbyte, jbyteArray, jint, jstring};
use std::ffi::{CStr, CString};
use pairing_crypto_c::{
    dtos::ByteArray,
    hwallet::{
        pairing_crypto_hwallet_generate_mnemonic,
        pairing_crypto_hwallet_mnemonic_to_seed,
        pairing_crypto_hwallet_derive_private_key,
        pairing_crypto_hwallet_eth_address_from_pubkey,
        pairing_crypto_hwallet_sign_ecdsa_eth,
        pairing_crypto_hwallet_recover_eth_address,
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
pub extern "C" fn Java_pairing_1crypto_HWallet_generateMnemonic(
    env: JNIEnv,
    _: JObject,
) -> jstring {
    let mut error = ExternError::success();
    let mut mnemonic_out = ByteBuffer::from_vec(vec![]);
    
    let result = pairing_crypto_hwallet_generate_mnemonic(&mut mnemonic_out, &mut error);
    if result != 0 {
        return env.new_string("").unwrap().into_inner();
    }
    
    let vec = mnemonic_out.destroy_into_vec();
    let string = String::from_utf8(vec).unwrap_or_default();
    env.new_string(string).unwrap().into_inner()
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_HWallet_mnemonicToSeed(
    env: JNIEnv,
    _: JObject,
    mnemonic: JString,
    passphrase: JString,
    seed_out: jbyteArray,
) -> jint {
    let m = env.get_string(mnemonic).unwrap();
    let p = env.get_string(passphrase).unwrap();

    let m_ptr = m.as_ptr();
    let p_ptr = p.as_ptr();

    unsafe {
        let m_ffi = ffi_support::FfiStr::from_raw(m_ptr);
        let p_ffi = ffi_support::FfiStr::from_raw(p_ptr);
        
        let mut error = ExternError::success();
        let mut seed = ByteBuffer::from_vec(vec![]);
        let result = pairing_crypto_hwallet_mnemonic_to_seed(m_ffi, p_ffi, &mut seed, &mut error);
        
        if result != 0 {
            return result;
        }

        let s: Vec<i8> = seed.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
        copy_to_jni!(env, seed_out, s.as_slice());
        0
    }
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_HWallet_derivePrivateKey(
    env: JNIEnv,
    _: JObject,
    seed: jbyteArray,
    path: JString,
    priv_out: jbyteArray,
) -> jint {
    let seed_vec = match env.convert_byte_array(seed) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let p = env.get_string(path).unwrap();
    let p_ptr = p.as_ptr();

    unsafe {
        let p_ffi = ffi_support::FfiStr::from_raw(p_ptr);
        
        let mut error = ExternError::success();
        let mut out = ByteBuffer::from_vec(vec![]);
        let result = pairing_crypto_hwallet_derive_private_key(ByteArray::from(&seed_vec), p_ffi, &mut out, &mut error);
        
        if result != 0 {
            return result;
        }

        let o: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
        copy_to_jni!(env, priv_out, o.as_slice());
        0
    }
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_HWallet_ethAddressFromPubkey(
    env: JNIEnv,
    _: JObject,
    pubkey: jbyteArray,
) -> jstring {
    let pk_vec = match env.convert_byte_array(pubkey) {
        Err(_) => return env.new_string("").unwrap().into_inner(),
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    let result = pairing_crypto_hwallet_eth_address_from_pubkey(ByteArray::from(&pk_vec), &mut out, &mut error);
    
    if result != 0 {
        return env.new_string("").unwrap().into_inner();
    }

    let vec = out.destroy_into_vec();
    let string = String::from_utf8(vec).unwrap_or_default();
    env.new_string(string).unwrap().into_inner()
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_HWallet_signEcdsaEth(
    env: JNIEnv,
    _: JObject,
    privkey: jbyteArray,
    message: jbyteArray,
    signature_out: jbyteArray,
) -> jint {
    let pk_vec = match env.convert_byte_array(privkey) {
        Err(_) => return 1,
        Ok(s) => s,
    };
    let msg_vec = match env.convert_byte_array(message) {
        Err(_) => return 1,
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    let result = pairing_crypto_hwallet_sign_ecdsa_eth(ByteArray::from(&pk_vec), ByteArray::from(&msg_vec), &mut out, &mut error);
    
    if result != 0 {
        return result;
    }

    let sig: Vec<i8> = out.destroy_into_vec().iter().map(|b| *b as jbyte).collect();
    copy_to_jni!(env, signature_out, sig.as_slice());
    0
}

#[no_mangle]
pub extern "C" fn Java_pairing_1crypto_HWallet_recoverEthAddress(
    env: JNIEnv,
    _: JObject,
    message: jbyteArray,
    signature: jbyteArray,
) -> jstring {
    let msg_vec = match env.convert_byte_array(message) {
        Err(_) => return env.new_string("").unwrap().into_inner(),
        Ok(s) => s,
    };
    let sig_vec = match env.convert_byte_array(signature) {
        Err(_) => return env.new_string("").unwrap().into_inner(),
        Ok(s) => s,
    };

    let mut error = ExternError::success();
    let mut out = ByteBuffer::from_vec(vec![]);
    let result = pairing_crypto_hwallet_recover_eth_address(ByteArray::from(&msg_vec), ByteArray::from(&sig_vec), &mut out, &mut error);
    
    if result != 0 {
        return env.new_string("").unwrap().into_inner();
    }

    let vec = out.destroy_into_vec();
    let string = String::from_utf8(vec).unwrap_or_default();
    env.new_string(string).unwrap().into_inner()
}
