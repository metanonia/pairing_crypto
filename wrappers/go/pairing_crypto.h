#ifndef PAIRING_CRYPTO_H
#define PAIRING_CRYPTO_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/* Structures from ffi_support and C wrapper */

typedef struct {
    size_t length;
    const uint8_t *data;
} ByteArray;

typedef struct {
    int64_t len;
    uint8_t *data;
} ByteBuffer;

typedef struct {
    uint32_t code;
    char *message;
} ExternError;

/* Key Generation */
int32_t bbs_bls12_381_sha_256_generate_key_pair(ByteArray ikm, ByteArray key_info, ByteBuffer *secret_key, ByteBuffer *public_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_generate_key_pair(ByteArray ikm, ByteArray key_info, ByteBuffer *secret_key, ByteBuffer *public_key, ExternError *err);

/* Signing Context (SHA-256) */
uint64_t bbs_bls12_381_sha_256_sign_context_init(ExternError *err);
int32_t bbs_bls12_381_sha_256_sign_context_set_secret_key(uint64_t handle, ByteArray secret_key, ExternError *err);
int32_t bbs_bls12_381_sha_256_sign_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_sha_256_sign_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_sha_256_sign_context_add_message(uint64_t handle, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_sha_256_sign_context_finish(uint64_t handle, ByteBuffer *signature, ExternError *err);

/* Signing Context (SHAKE-256) */
uint64_t bbs_bls12_381_shake_256_sign_context_init(ExternError *err);
int32_t bbs_bls12_381_shake_256_sign_context_set_secret_key(uint64_t handle, ByteArray secret_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_sign_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_sign_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_shake_256_sign_context_add_message(uint64_t handle, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_shake_256_sign_context_finish(uint64_t handle, ByteBuffer *signature, ExternError *err);

/* Verification Context (SHA-256) */
uint64_t bbs_bls12_381_sha_256_verify_context_init(ExternError *err);
int32_t bbs_bls12_381_sha_256_verify_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_sha_256_verify_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_sha_256_verify_context_add_message(uint64_t handle, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_sha_256_verify_context_set_signature(uint64_t handle, ByteArray signature, ExternError *err);
int32_t bbs_bls12_381_sha_256_verify_context_finish(uint64_t handle, ExternError *err);

/* Verification Context (SHAKE-256) */
uint64_t bbs_bls12_381_shake_256_verify_context_init(ExternError *err);
int32_t bbs_bls12_381_shake_256_verify_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_verify_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_shake_256_verify_context_add_message(uint64_t handle, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_shake_256_verify_context_set_signature(uint64_t handle, ByteArray signature, ExternError *err);
int32_t bbs_bls12_381_shake_256_verify_context_finish(uint64_t handle, ExternError *err);

/* Proof Generation Context (SHA-256) */
uint64_t bbs_bls12_381_sha_256_proof_gen_context_init(ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_set_signature(uint64_t handle, ByteArray signature, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_set_presentation_header(uint64_t handle, ByteArray presentation_header, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_set_verify_signature(uint64_t handle, bool verify_signature, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_add_message(uint64_t handle, bool reveal, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_gen_context_finish(uint64_t handle, ByteBuffer *proof, ExternError *err);

/* Proof Generation Context (SHAKE-256) */
uint64_t bbs_bls12_381_shake_256_proof_gen_context_init(ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_set_signature(uint64_t handle, ByteArray signature, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_set_presentation_header(uint64_t handle, ByteArray presentation_header, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_set_verify_signature(uint64_t handle, bool verify_signature, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_add_message(uint64_t handle, bool reveal, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_gen_context_finish(uint64_t handle, ByteBuffer *proof, ExternError *err);

/* Proof Verification Context (SHA-256) */
uint64_t bbs_bls12_381_sha_256_proof_verify_context_init(ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_set_proof(uint64_t handle, ByteArray proof, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_set_presentation_header(uint64_t handle, ByteArray presentation_header, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_add_message(uint64_t handle, uint64_t index, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_sha_256_proof_verify_context_finish(uint64_t handle, ExternError *err);

/* Proof Verification Context (SHAKE-256) */
uint64_t bbs_bls12_381_shake_256_proof_verify_context_init(ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_set_public_key(uint64_t handle, ByteArray public_key, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_set_header(uint64_t handle, ByteArray header, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_set_proof(uint64_t handle, ByteArray proof, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_set_presentation_header(uint64_t handle, ByteArray presentation_header, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_add_message(uint64_t handle, uint64_t index, ByteArray message, ExternError *err);
int32_t bbs_bls12_381_shake_256_proof_verify_context_finish(uint64_t handle, ExternError *err);

/* Memory Management */
void pairing_crypto_byte_buffer_free(ByteBuffer buffer);
void ffi_support_free_string(char *s);

#endif /* PAIRING_CRYPTO_H */
