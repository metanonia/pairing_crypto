package pairing_crypto

/*
#cgo darwin,arm64 LDFLAGS: -L${SRCDIR}/../../target/aarch64-apple-darwin/release -L${SRCDIR}/../../target/release -lpairing_crypto_c -lpthread -ldl -lm
#cgo darwin,amd64 LDFLAGS: -L${SRCDIR}/../../target/x86_64-apple-darwin/release -L${SRCDIR}/../../target/release -lpairing_crypto_c -lpthread -ldl -lm
#cgo linux,amd64 LDFLAGS: -L${SRCDIR}/../../target/x86_64-unknown-linux-gnu/release -L${SRCDIR}/../../target/release -lpairing_crypto_c -lpthread -ldl -lm
#cgo windows,amd64 LDFLAGS: -L${SRCDIR}/../../target/x86_64-pc-windows-msvc/release -L${SRCDIR}/../../target/release -lpairing_crypto_c
#include "pairing_crypto.h"
#include <stdlib.h>
*/
import "C"

import (
	"fmt"
	"unsafe"
)

// KeyPair represents a BBS key pair
type KeyPair struct {
	SecretKey []byte `json:"secretKey"`
	PublicKey []byte `json:"publicKey"`
}

// BbsCipherSuite defines the interface for BBS operations
type BbsCipherSuite interface {
	GenerateKeyPair(ikm, keyInfo []byte) (*KeyPair, error)
	Sign(secretKey, publicKey, header []byte, messages [][]byte) ([]byte, error)
	Verify(publicKey, signature, header []byte, messages [][]byte) (bool, error)
	DeriveProof(publicKey, signature, header, presentationHeader []byte, messages []ProofMessage) ([]byte, error)
	VerifyProof(publicKey, proof, header, presentationHeader []byte, messages map[int][]byte) (bool, error)
}

// ProofMessage matches the Rust BbsDeriveProofRevealMessageRequestDto
type ProofMessage struct {
	Value  []byte `json:"value"`
	Reveal bool   `json:"reveal"`
}

type bls12381Sha256 struct{}
type bls12381Shake256 struct{}

var (
	BLS12381Sha256   BbsCipherSuite = &bls12381Sha256{}
	BLS12381Shake256 BbsCipherSuite = &bls12381Shake256{}
)

// Helper: Convert Go []byte to C ByteArray
func toByteArray(data []byte) C.ByteArray {
	if len(data) == 0 {
		return C.ByteArray{length: 0, data: nil}
	}
	return C.ByteArray{
		length: C.size_t(len(data)),
		data:   (*C.uint8_t)(unsafe.Pointer(&data[0])),
	}
}

// Helper: Convert C ByteBuffer to Go []byte and free C memory
func fromByteBuffer(buf C.ByteBuffer) []byte {
	if buf.len == 0 {
		return nil
	}
	defer C.pairing_crypto_byte_buffer_free(buf)
	return C.GoBytes(unsafe.Pointer(buf.data), C.int(buf.len))
}

// Helper: Process ExternError
func handleError(err C.ExternError) error {
	if err.code == 0 {
		return nil
	}
	defer C.ffi_support_free_string(err.message)
	return fmt.Errorf("pairing-crypto error (code %d): %s", err.code, C.GoString(err.message))
}

// --- SHA-256 Implementation ---

func (s *bls12381Sha256) GenerateKeyPair(ikm, keyInfo []byte) (*KeyPair, error) {
	var secretKey, publicKey C.ByteBuffer
	var err C.ExternError
	res := C.bbs_bls12_381_sha_256_generate_key_pair(toByteArray(ikm), toByteArray(keyInfo), &secretKey, &publicKey, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return &KeyPair{
		SecretKey: fromByteBuffer(secretKey),
		PublicKey: fromByteBuffer(publicKey),
	}, nil
}

func (s *bls12381Sha256) Sign(secretKey, publicKey, header []byte, messages [][]byte) ([]byte, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_sha_256_sign_context_init(&err)
	if handle == 0 {
		return nil, handleError(err)
	}

	sk := toByteArray(secretKey)
	C.bbs_bls12_381_sha_256_sign_context_set_secret_key(handle, sk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	pk := toByteArray(publicKey)
	C.bbs_bls12_381_sha_256_sign_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_sha_256_sign_context_set_header(handle, h, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	for _, msg := range messages {
		m := toByteArray(msg)
		C.bbs_bls12_381_sha_256_sign_context_add_message(handle, m, &err)
		if err.code != 0 { return nil, handleError(err) }
	}

	var signature C.ByteBuffer
	res := C.bbs_bls12_381_sha_256_sign_context_finish(handle, &signature, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(signature), nil
}

func (s *bls12381Sha256) Verify(publicKey, signature, header []byte, messages [][]byte) (bool, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_sha_256_verify_context_init(&err)
	if handle == 0 {
		return false, handleError(err)
	}

	pk := toByteArray(publicKey)
	C.bbs_bls12_381_sha_256_verify_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return false, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_sha_256_verify_context_set_header(handle, h, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	for _, msg := range messages {
		m := toByteArray(msg)
		C.bbs_bls12_381_sha_256_verify_context_add_message(handle, m, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	sig := toByteArray(signature)
	C.bbs_bls12_381_sha_256_verify_context_set_signature(handle, sig, &err)
	if err.code != 0 { return false, handleError(err) }

	res := C.bbs_bls12_381_sha_256_verify_context_finish(handle, &err)
	if res != 0 {
		// Verification failed usually returns 1
		return false, nil
	}
	return true, nil
}

func (s *bls12381Sha256) DeriveProof(publicKey, signature, header, presentationHeader []byte, messages []ProofMessage) ([]byte, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_sha_256_proof_gen_context_init(&err)
	if handle == 0 {
		return nil, handleError(err)
	}

	pk := toByteArray(publicKey)
	C.bbs_bls12_381_sha_256_proof_gen_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	sig := toByteArray(signature)
	C.bbs_bls12_381_sha_256_proof_gen_context_set_signature(handle, sig, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_sha_256_proof_gen_context_set_header(handle, h, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	if len(presentationHeader) > 0 {
		ph := toByteArray(presentationHeader)
		C.bbs_bls12_381_sha_256_proof_gen_context_set_presentation_header(handle, ph, &err)
		if err.code != 0 { return nil, handleError(err) }
	}

	for _, pm := range messages {
		m := toByteArray(pm.Value)
		C.bbs_bls12_381_sha_256_proof_gen_context_add_message(handle, C.bool(pm.Reveal), m, &err)
		if err.code != 0 { return nil, handleError(err) }
	}

	var proof C.ByteBuffer
	res := C.bbs_bls12_381_sha_256_proof_gen_context_finish(handle, &proof, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(proof), nil
}

func (s *bls12381Sha256) VerifyProof(publicKey, proof, header, presentationHeader []byte, revealedMessages map[int][]byte) (bool, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_sha_256_proof_verify_context_init(&err)
	if handle == 0 {
		return false, handleError(err)
	}

	pk := toByteArray(publicKey)
	C.bbs_bls12_381_sha_256_proof_verify_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return false, handleError(err) }
	
	prf := toByteArray(proof)
	C.bbs_bls12_381_sha_256_proof_verify_context_set_proof(handle, prf, &err)
	if err.code != 0 { return false, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_sha_256_proof_verify_context_set_header(handle, h, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	if len(presentationHeader) > 0 {
		ph := toByteArray(presentationHeader)
		C.bbs_bls12_381_sha_256_proof_verify_context_set_presentation_header(handle, ph, &err)
		if err.code != 0 { return false, handleError(err) }
	}

	for idx, msg := range revealedMessages {
		m := toByteArray(msg)
		C.bbs_bls12_381_sha_256_proof_verify_context_add_message(handle, C.uintptr_t(idx), m, &err)
		if err.code != 0 { return false, handleError(err) }
	}

	res := C.bbs_bls12_381_sha_256_proof_verify_context_finish(handle, &err)
	if res != 0 {
		return false, nil
	}
	return true, nil
}

// --- SHAKE-256 Implementation (Omitted for brevity in initial draft, but can be added similarly) ---
// Note: User requested ALL APIs, so I should add them if they are in the header.
// To keep it clean, I'll add them now.

func (s *bls12381Shake256) GenerateKeyPair(ikm, keyInfo []byte) (*KeyPair, error) {
	var secretKey, publicKey C.ByteBuffer
	var err C.ExternError
	res := C.bbs_bls12_381_shake_256_generate_key_pair(toByteArray(ikm), toByteArray(keyInfo), &secretKey, &publicKey, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return &KeyPair{
		SecretKey: fromByteBuffer(secretKey),
		PublicKey: fromByteBuffer(publicKey),
	}, nil
}

func (s *bls12381Shake256) Sign(secretKey, publicKey, header []byte, messages [][]byte) ([]byte, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_shake_256_sign_context_init(&err)
	if handle == 0 {
		return nil, handleError(err)
	}
	sk := toByteArray(secretKey)
	C.bbs_bls12_381_shake_256_sign_context_set_secret_key(handle, sk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	pk := toByteArray(publicKey)
	C.bbs_bls12_381_shake_256_sign_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_shake_256_sign_context_set_header(handle, h, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	for _, m := range messages {
		msg := toByteArray(m)
		C.bbs_bls12_381_shake_256_sign_context_add_message(handle, msg, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	var sig C.ByteBuffer
	if res := C.bbs_bls12_381_shake_256_sign_context_finish(handle, &sig, &err); res != 0 { return nil, handleError(err) }
	return fromByteBuffer(sig), nil
}

func (s *bls12381Shake256) Verify(publicKey, signature, header []byte, messages [][]byte) (bool, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_shake_256_verify_context_init(&err)
	if handle == 0 { return false, handleError(err) }
	pk := toByteArray(publicKey)
	C.bbs_bls12_381_shake_256_verify_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return false, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_shake_256_verify_context_set_header(handle, h, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	for _, m := range messages {
		msg := toByteArray(m)
		C.bbs_bls12_381_shake_256_verify_context_add_message(handle, msg, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	sig := toByteArray(signature)
	C.bbs_bls12_381_shake_256_verify_context_set_signature(handle, sig, &err)
	if err.code != 0 { return false, handleError(err) }
	
	if res := C.bbs_bls12_381_shake_256_verify_context_finish(handle, &err); res != 0 { return false, nil }
	return true, nil
}

func (s *bls12381Shake256) DeriveProof(publicKey, signature, header, presentationHeader []byte, messages []ProofMessage) ([]byte, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_shake_256_proof_gen_context_init(&err)
	if handle == 0 { return nil, handleError(err) }
	pk := toByteArray(publicKey)
	C.bbs_bls12_381_shake_256_proof_gen_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	sig := toByteArray(signature)
	C.bbs_bls12_381_shake_256_proof_gen_context_set_signature(handle, sig, &err)
	if err.code != 0 { return nil, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_shake_256_proof_gen_context_set_header(handle, h, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	if len(presentationHeader) > 0 {
		ph := toByteArray(presentationHeader)
		C.bbs_bls12_381_shake_256_proof_gen_context_set_presentation_header(handle, ph, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	for _, pm := range messages {
		m := toByteArray(pm.Value)
		C.bbs_bls12_381_shake_256_proof_gen_context_add_message(handle, C.bool(pm.Reveal), m, &err)
		if err.code != 0 { return nil, handleError(err) }
	}
	var prf C.ByteBuffer
	if res := C.bbs_bls12_381_shake_256_proof_gen_context_finish(handle, &prf, &err); res != 0 { return nil, handleError(err) }
	return fromByteBuffer(prf), nil
}

func (s *bls12381Shake256) VerifyProof(publicKey, proof, header, presentationHeader []byte, revealedMessages map[int][]byte) (bool, error) {
	var err C.ExternError
	handle := C.bbs_bls12_381_shake_256_proof_verify_context_init(&err)
	if handle == 0 { return false, handleError(err) }
	pk := toByteArray(publicKey)
	C.bbs_bls12_381_shake_256_proof_verify_context_set_public_key(handle, pk, &err)
	if err.code != 0 { return false, handleError(err) }
	
	prf := toByteArray(proof)
	C.bbs_bls12_381_shake_256_proof_verify_context_set_proof(handle, prf, &err)
	if err.code != 0 { return false, handleError(err) }
	
	if len(header) > 0 {
		h := toByteArray(header)
		C.bbs_bls12_381_shake_256_proof_verify_context_set_header(handle, h, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	if len(presentationHeader) > 0 {
		ph := toByteArray(presentationHeader)
		C.bbs_bls12_381_shake_256_proof_verify_context_set_presentation_header(handle, ph, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	for idx, m := range revealedMessages {
		msg := toByteArray(m)
		C.bbs_bls12_381_shake_256_proof_verify_context_add_message(handle, C.uintptr_t(idx), msg, &err)
		if err.code != 0 { return false, handleError(err) }
	}
	if res := C.bbs_bls12_381_shake_256_proof_verify_context_finish(handle, &err); res != 0 { return false, nil }
	return true, nil
}

// --- HWallet Implementation ---

func GenerateMnemonic() (string, error) {
	var mnemonicOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_generate_mnemonic(&mnemonicOut, &err)
	if res != 0 {
		return "", handleError(err)
	}
	mnemonicBytes := fromByteBuffer(mnemonicOut)
	return string(mnemonicBytes), nil
}

func MnemonicToSeed(mnemonic, passphrase string) ([]byte, error) {
	cMnemonic := C.CString(mnemonic)
	defer C.free(unsafe.Pointer(cMnemonic))
	cPassphrase := C.CString(passphrase)
	defer C.free(unsafe.Pointer(cPassphrase))

	var seedOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_mnemonic_to_seed(C.FfiStr(cMnemonic), C.FfiStr(cPassphrase), &seedOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(seedOut), nil
}

func DerivePrivateKey(seed []byte, path string) ([]byte, error) {
	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))

	var privOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_derive_private_key(toByteArray(seed), C.FfiStr(cPath), &privOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(privOut), nil
}

func EthAddressFromPubkey(pubkey []byte) (string, error) {
	var addrOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_eth_address_from_pubkey(toByteArray(pubkey), &addrOut, &err)
	if res != 0 {
		return "", handleError(err)
	}
	return string(fromByteBuffer(addrOut)), nil
}

func SignEcdsaEth(privkey, message []byte) ([]byte, error) {
	var sigOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_sign_ecdsa_eth(toByteArray(privkey), toByteArray(message), &sigOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(sigOut), nil
}

func RecoverEthAddress(message, signature []byte) (string, error) {
	var addrOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_hwallet_recover_eth_address(toByteArray(message), toByteArray(signature), &addrOut, &err)
	if res != 0 {
		return "", handleError(err)
	}
	return string(fromByteBuffer(addrOut)), nil
}

// --- ECIES Implementation ---

func EciesKeypairFromBytes(privkey []byte) (*KeyPair, error) {
	var skOut, pkOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_keypair_from_bytes(toByteArray(privkey), &skOut, &pkOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return &KeyPair{
		SecretKey: fromByteBuffer(skOut),
		PublicKey: fromByteBuffer(pkOut),
	}, nil
}

func EciesEncrypt(uncompressedPubkey, msg []byte) ([]byte, error) {
	var encOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_encrypt(toByteArray(uncompressedPubkey), toByteArray(msg), &encOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(encOut), nil
}

func EciesDecrypt(privkey, encryptedMsg []byte) ([]byte, error) {
	var decOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_decrypt(toByteArray(privkey), toByteArray(encryptedMsg), &decOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(decOut), nil
}

// --- Ed25519 Implementation ---

func Ed25519KeypairFromSeed(seed []byte) (*KeyPair, error) {
	var skOut, pkOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ed25519_keypair_from_seed(toByteArray(seed), &skOut, &pkOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return &KeyPair{
		SecretKey: fromByteBuffer(skOut),
		PublicKey: fromByteBuffer(pkOut),
	}, nil
}

func Ed25519Sign(privkey, message []byte) ([]byte, error) {
	var sigOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ed25519_sign(toByteArray(privkey), toByteArray(message), &sigOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(sigOut), nil
}

func Ed25519Verify(pubkey, message, signature []byte) (bool, error) {
	var err C.ExternError
	res := C.pairing_crypto_ed25519_verify(toByteArray(pubkey), toByteArray(message), toByteArray(signature), &err)
	if err.code != 0 {
		return false, handleError(err)
	}
	return res == 0, nil
}

func Ed25519SkToX25519(privkey []byte) ([]byte, error) {
	var skOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ed25519_sk_to_x25519(toByteArray(privkey), &skOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(skOut), nil
}

func Ed25519PkToX25519(pubkey []byte) ([]byte, error) {
	var pkOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ed25519_pk_to_x25519(toByteArray(pubkey), &pkOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(pkOut), nil
}

func EciesX25519KeypairFromBytes(privkey []byte) (*KeyPair, error) {
	var skOut, pkOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_x25519_keypair_from_bytes(toByteArray(privkey), &skOut, &pkOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return &KeyPair{
		SecretKey: fromByteBuffer(skOut),
		PublicKey: fromByteBuffer(pkOut),
	}, nil
}

func EciesX25519Encrypt(pubkey, msg []byte) ([]byte, error) {
	var encOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_x25519_encrypt(toByteArray(pubkey), toByteArray(msg), &encOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(encOut), nil
}

func EciesX25519Decrypt(privkey, encryptedMsg []byte) ([]byte, error) {
	var decOut C.ByteBuffer
	var err C.ExternError
	res := C.pairing_crypto_ecies_x25519_decrypt(toByteArray(privkey), toByteArray(encryptedMsg), &decOut, &err)
	if res != 0 {
		return nil, handleError(err)
	}
	return fromByteBuffer(decOut), nil
}
