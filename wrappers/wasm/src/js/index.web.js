/*
 * Copyright 2020 - MATTR Limited
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as wasm from './web/index.js';

const DEFAULT_BLS12381_BBS_SIGNATURE_LENGTH = 80;
const DEFAULT_BLS12381_PRIVATE_KEY_LENGTH = 32;
const DEFAULT_BLS12381_PUBLIC_KEY_LENGTH = 96;
const BLS_SIG_BLS12381_G2_PRIVATE_KEY_LENGTH = 32;
const BLS_SIG_BLS12381_G2_PUBLIC_KEY_LENGTH = 48;
const BLS_SIG_BLS12381_G2_KEY_POP_LENGTH = 96;

const throwErrorOnRejectedPromise = async (promise) => {
    try {
        return await promise;
    } catch (ex) {
        if (ex instanceof TypeError && ex.message === 'Reflect.get called on non-object') {
            throw new TypeError("Request object missing required element");
        }
        throw new Error(ex);
    }
};

let initializedModule;
const initialize = async () => {
    if (!initializedModule) {
        if (typeof wasm.default === "function") {
            initializedModule = await wasm.default();
        } else {
            initializedModule = true;
        }
    }
}

const bbs_bls12_381_generate_key_pair = async (request) => {
    await initialize();
    var result = await throwErrorOnRejectedPromise(
        wasm.bbs_bls12_381_generate_key_pair(request ?? {})
    );
    return {
        secretKey: new Uint8Array(result.secretKey),
        publicKey: new Uint8Array(result.publicKey),
    };
};

const bbs_bls12_381_sha_256_sign = async (request) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_sha_256_sign(request)));
};

const bbs_bls12_381_sha_256_verify = async (request) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_sha_256_verify(request));
};

const bbs_bls12_381_sha_256_proof_gen = async (request) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_sha_256_proof_gen(request)));
}

const bbs_bls12_381_sha_256_proof_verify = async (request) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_sha_256_proof_verify(request));
}

const bbs_bls12_381_shake_256_sign = async (request) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_shake_256_sign(request)));
};

const bbs_bls12_381_shake_256_verify = async (request) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_shake_256_verify(request));
};

const bbs_bls12_381_shake_256_proof_gen = async (request) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_shake_256_proof_gen(request)));
}

const bbs_bls12_381_shake_256_proof_verify = async (request) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.bbs_bls12_381_shake_256_proof_verify(request));
}

export const bbs = {
    bls12381_sha256: {
        PRIVATE_KEY_LENGTH: DEFAULT_BLS12381_PRIVATE_KEY_LENGTH,
        PUBLIC_KEY_LENGTH: DEFAULT_BLS12381_PUBLIC_KEY_LENGTH,
        SIGNATURE_LENGTH: DEFAULT_BLS12381_BBS_SIGNATURE_LENGTH,

        generateKeyPair: bbs_bls12_381_generate_key_pair,
        sign: bbs_bls12_381_sha_256_sign,
        verify: bbs_bls12_381_sha_256_verify,
        deriveProof: bbs_bls12_381_sha_256_proof_gen,
        verifyProof: bbs_bls12_381_sha_256_proof_verify
    },
    bls12381_shake256: {
        PRIVATE_KEY_LENGTH: DEFAULT_BLS12381_PRIVATE_KEY_LENGTH,
        PUBLIC_KEY_LENGTH: DEFAULT_BLS12381_PUBLIC_KEY_LENGTH,
        SIGNATURE_LENGTH: DEFAULT_BLS12381_BBS_SIGNATURE_LENGTH,

        generateKeyPair: bbs_bls12_381_generate_key_pair,
        sign: bbs_bls12_381_shake_256_sign,
        verify: bbs_bls12_381_shake_256_verify,
        deriveProof: bbs_bls12_381_shake_256_proof_gen,
        verifyProof: bbs_bls12_381_shake_256_proof_verify
    }
};

export const utilities = {
    convertToRevealMessageArray: (messages, revealedIndicies) => {
        let revealMessages = [];
        let i = 0;
        messages.forEach((element) => {
            if (revealedIndicies.includes(i)) {
                revealMessages.push({ value: element, reveal: true });
            } else {
                revealMessages.push({ value: element, reveal: false });
            }
            i++;
        })
        return revealMessages;
    },
    convertRevealMessageArrayToRevealMap: (messages) => {
        return messages.reduce(
            (map, item, index) => {
                if (item.reveal) {
                    map = {
                        ...map,
                        [index]: item.value,
                    };
                }
                return map;
            },
            {}
        );
    }
};

/** HWallet API */
export const hwallet_generate_mnemonic = async () => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.hwallet_generate_mnemonic());
};

export const hwallet_mnemonic_to_seed = async (mnemonic, passphrase) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.hwallet_mnemonic_to_seed(mnemonic, passphrase)));
};

export const hwallet_derive_private_key = async (seed, path) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.hwallet_derive_private_key(seed, path)));
};

export const hwallet_eth_address_from_pubkey = async (pubkey) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.hwallet_eth_address_from_pubkey(pubkey));
};

export const hwallet_sign_ecdsa_eth = async (privkey, message) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.hwallet_sign_ecdsa_eth(privkey, message)));
};

export const hwallet_recover_eth_address = async (message, signature) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.hwallet_recover_eth_address(message, signature));
};

/** ECIES API */
export const ecies_keypair_from_bytes = async (privkey) => {
    await initialize();
    const result = await throwErrorOnRejectedPromise(wasm.ecies_keypair_from_bytes(privkey));
    return {
        secret_key: new Uint8Array(result.secret_key),
        public_key: new Uint8Array(result.public_key)
    };
};

export const ecies_encrypt = async (uncompressed_pubkey, msg) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ecies_encrypt(uncompressed_pubkey, msg)));
};

export const ecies_decrypt = async (privkey, encrypted_data) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ecies_decrypt(privkey, encrypted_data)));
};

export const ecies_encrypt_with_pubkey = ecies_encrypt;
export const ecies_decrypt_with_privkey = ecies_decrypt;

/** Ed25519 API */
export const ed25519_keypair_from_seed = async (seed) => {
    await initialize();
    const result = await throwErrorOnRejectedPromise(wasm.ed25519_keypair_from_seed(seed));
    return {
        secret_key: new Uint8Array(result.secret_key),
        public_key: new Uint8Array(result.public_key)
    };
};

export const ed25519_sign = async (privkey, msg) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ed25519_sign(privkey, msg)));
};

export const ed25519_verify = async (pubkey, msg, sig) => {
    await initialize();
    return await throwErrorOnRejectedPromise(wasm.ed25519_verify(pubkey, msg, sig));
};

export const ed25519_sk_to_x25519 = async (privkey) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ed25519_sk_to_x25519(privkey)));
};

export const ed25519_pk_to_x25519 = async (pubkey) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ed25519_pk_to_x25519(pubkey)));
};

/** ECIES X25519 API */
export const ecies_x25519_keypair_from_bytes = async (privkey) => {
    await initialize();
    const result = await throwErrorOnRejectedPromise(wasm.ecies_x25519_keypair_from_bytes(privkey));
    return {
        secret_key: new Uint8Array(result.secret_key),
        public_key: new Uint8Array(result.public_key)
    };
};

export const ecies_x25519_encrypt = async (x_pubkey, msg) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ecies_x25519_encrypt(x_pubkey, msg)));
};

export const ecies_x25519_decrypt = async (privkey, encrypted_data) => {
    await initialize();
    return new Uint8Array(await throwErrorOnRejectedPromise(wasm.ecies_x25519_decrypt(privkey, encrypted_data)));
};
