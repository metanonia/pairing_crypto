import 'dart:ffi' as ffi;
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

// C 구조체 정의 (wrappers/c/src/dtos.rs 대응)
base class ByteArray extends ffi.Struct {
  @ffi.IntPtr()
  external int length;
  external ffi.Pointer<ffi.Uint8> data;
}

// ffi_support의 ExternError 대응
base class ExternError extends ffi.Struct {
  @ffi.Int32()
  external int code;
  external ffi.Pointer<Utf8> message;
}

// ffi_support의 ByteBuffer 대응
base class ByteBuffer extends ffi.Struct {
  @ffi.IntPtr()
  external int length;
  external ffi.Pointer<ffi.Uint8> data;
}

typedef InitContextNative = ffi.Uint64 Function(ffi.Pointer<ExternError>);
typedef InitContextDart = int Function(ffi.Pointer<ExternError>);

typedef SetByteArrayNative = ffi.Int32 Function(
    ffi.Uint64 handle, ByteArray value, ffi.Pointer<ExternError> err);
typedef SetByteArrayDart = int Function(
    int handle, ByteArray value, ffi.Pointer<ExternError> err);

typedef FinishSignNative = ffi.Int32 Function(
    ffi.Uint64 handle, ffi.Pointer<ByteBuffer> signature, ffi.Pointer<ExternError> err);
typedef FinishSignDart = int Function(
    int handle, ffi.Pointer<ByteBuffer> signature, ffi.Pointer<ExternError> err);

typedef FinishSimpleNative = ffi.Int32 Function(ffi.Uint64 handle, ffi.Pointer<ExternError> err);
typedef FinishSimpleDart = int Function(int handle, ffi.Pointer<ExternError> err);

typedef FreeBufferNative = ffi.Void Function(ByteBuffer);
typedef FreeBufferDart = void Function(ByteBuffer);

typedef GenerateKeyPairNative = ffi.Int32 Function(
    ByteArray, ByteArray, ffi.Pointer<ByteBuffer>, ffi.Pointer<ByteBuffer>, ffi.Pointer<ExternError>);
typedef GenerateKeyPairDart = int Function(
    ByteArray, ByteArray, ffi.Pointer<ByteBuffer>, ffi.Pointer<ByteBuffer>, ffi.Pointer<ExternError>);

typedef GetProofSizeNative = ffi.Int32 Function(ffi.IntPtr numUndisclosed);
typedef GetProofSizeDart = int Function(int numUndisclosed);

typedef ProofGenAddMsgNative = ffi.Int32 Function(
    ffi.Uint64 handle, ffi.Bool reveal, ByteArray message, ffi.Pointer<ExternError> err);
typedef ProofGenAddMsgDart = int Function(
    int handle, bool reveal, ByteArray message, ffi.Pointer<ExternError> err);

typedef ProofVerifyAddMsgNative = ffi.Int32 Function(
    ffi.Uint64 handle, ffi.IntPtr index, ByteArray message, ffi.Pointer<ExternError> err);
typedef ProofVerifyAddMsgDart = int Function(
    int handle, int index, ByteArray message, ffi.Pointer<ExternError> err);

typedef SetBoolNative = ffi.Int32 Function(ffi.Uint64 handle, ffi.Bool value, ffi.Pointer<ExternError> err);
typedef SetBoolDart = int Function(int handle, bool value, ffi.Pointer<ExternError> err);

class PairingCryptoLib {
  late ffi.DynamicLibrary _lib;

  // Sign API
  late final InitContextDart _bbsSignInit;
  late final SetByteArrayDart _bbsSignSetSk;
  late final SetByteArrayDart _bbsSignSetPk;
  late final SetByteArrayDart _bbsSignSetHeader;
  late final SetByteArrayDart _bbsSignAddMsg;
  late final FinishSignDart _bbsSignFinish;

  // Verify API
  late final InitContextDart _bbsVerifyInit;
  late final SetByteArrayDart _bbsVerifySetPk;
  late final SetByteArrayDart _bbsVerifySetHeader;
  late final SetByteArrayDart _bbsVerifyAddMsg;
  late final SetByteArrayDart _bbsVerifySetSig;
  late final FinishSimpleDart _bbsVerifyFinish;

  // Proof Gen API
  late final InitContextDart _bbsProofGenInit;
  late final SetByteArrayDart _bbsProofGenSetPk;
  late final SetByteArrayDart _bbsProofGenSetHeader;
  late final SetByteArrayDart _bbsProofGenSetSig;
  late final SetByteArrayDart _bbsProofGenSetPh;
  late final SetBoolDart _bbsProofGenSetVerifySig;
  late final ProofGenAddMsgDart _bbsProofGenAddMsg;
  late final FinishSignDart _bbsProofGenFinish;

  // Proof Verify API
  late final InitContextDart _bbsProofVerifyInit;
  late final SetByteArrayDart _bbsProofVerifySetPk;
  late final SetByteArrayDart _bbsProofVerifySetHeader;
  late final SetByteArrayDart _bbsProofVerifySetProof;
  late final SetByteArrayDart _bbsProofVerifySetPh;
  late final ProofVerifyAddMsgDart _bbsProofVerifyAddMsg;
  late final FinishSimpleDart _bbsProofVerifyFinish;

  // Utils
  late final GenerateKeyPairDart _bbsGenerateKeyPair;
  late final GetProofSizeDart _bbsGetProofSize;
  late final FreeBufferDart _freeBuffer;

  PairingCryptoLib() {
    if (Platform.isAndroid) {
      _lib = ffi.DynamicLibrary.open('libpairing_crypto_c.so');
    } else if (Platform.isIOS) {
      _lib = ffi.DynamicLibrary.process();
    } else {
      throw UnsupportedError('Unsupported platform');
    }

    _bbsSignInit = _lib.lookupFunction<InitContextNative, InitContextDart>('bbs_bls12_381_sha_256_sign_context_init');
    _bbsSignSetSk = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_sign_context_set_secret_key');
    _bbsSignSetPk = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_sign_context_set_public_key');
    _bbsSignSetHeader = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_sign_context_set_header');
    _bbsSignAddMsg = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_sign_context_add_message');
    _bbsSignFinish = _lib.lookupFunction<FinishSignNative, FinishSignDart>('bbs_bls12_381_sha_256_sign_context_finish');

    _bbsVerifyInit = _lib.lookupFunction<InitContextNative, InitContextDart>('bbs_bls12_381_sha_256_verify_context_init');
    _bbsVerifySetPk = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_verify_context_set_public_key');
    _bbsVerifySetHeader = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_verify_context_set_header');
    _bbsVerifyAddMsg = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_verify_context_add_message');
    _bbsVerifySetSig = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_verify_context_set_signature');
    _bbsVerifyFinish = _lib.lookupFunction<FinishSimpleNative, FinishSimpleDart>('bbs_bls12_381_sha_256_verify_context_finish');

    _bbsProofGenInit = _lib.lookupFunction<InitContextNative, InitContextDart>('bbs_bls12_381_sha_256_proof_gen_context_init');
    _bbsProofGenSetPk = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_gen_context_set_public_key');
    _bbsProofGenSetHeader = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_gen_context_set_header');
    _bbsProofGenSetSig = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_gen_context_set_signature');
    _bbsProofGenSetPh = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_gen_context_set_presentation_header');
    _bbsProofGenSetVerifySig = _lib.lookupFunction<SetBoolNative, SetBoolDart>('bbs_bls12_381_sha_256_proof_gen_context_set_verify_signature');
    _bbsProofGenAddMsg = _lib.lookupFunction<ProofGenAddMsgNative, ProofGenAddMsgDart>('bbs_bls12_381_sha_256_proof_gen_context_add_message');
    _bbsProofGenFinish = _lib.lookupFunction<FinishSignNative, FinishSignDart>('bbs_bls12_381_sha_256_proof_gen_context_finish');

    _bbsProofVerifyInit = _lib.lookupFunction<InitContextNative, InitContextDart>('bbs_bls12_381_sha_256_proof_verify_context_init');
    _bbsProofVerifySetPk = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_verify_context_set_public_key');
    _bbsProofVerifySetHeader = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_verify_context_set_header');
    _bbsProofVerifySetProof = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_verify_context_set_proof');
    _bbsProofVerifySetPh = _lib.lookupFunction<SetByteArrayNative, SetByteArrayDart>('bbs_bls12_381_sha_256_proof_verify_context_set_presentation_header');
    _bbsProofVerifyAddMsg = _lib.lookupFunction<ProofVerifyAddMsgNative, ProofVerifyAddMsgDart>('bbs_bls12_381_sha_256_proof_verify_context_add_message');
    _bbsProofVerifyFinish = _lib.lookupFunction<FinishSimpleNative, FinishSimpleDart>('bbs_bls12_381_sha_256_proof_verify_context_finish');

    _bbsGenerateKeyPair = _lib.lookupFunction<GenerateKeyPairNative, GenerateKeyPairDart>('bbs_bls12_381_sha_256_generate_key_pair');
    _bbsGetProofSize = _lib.lookupFunction<GetProofSizeNative, GetProofSizeDart>('bbs_bls12_381_sha_256_get_proof_size');
    _freeBuffer = _lib.lookupFunction<FreeBufferNative, FreeBufferDart>('pairing_crypto_byte_buffer_free');
  }

  Map<String, Uint8List> generateKeyPair(Uint8List ikm, [Uint8List? keyInfo]) {
    final err = calloc<ExternError>();
    final skBuffer = calloc<ByteBuffer>();
    final pkBuffer = calloc<ByteBuffer>();
    final ikmPtr = _mallocByteArray(ikm);
    final kiPtr = _mallocByteArray(keyInfo ?? Uint8List(0));

    try {
      final res = _bbsGenerateKeyPair(ikmPtr.ref, kiPtr.ref, skBuffer, pkBuffer, err);
      _checkError(err);
      if (res == 0) {
        final sk = Uint8List.fromList(skBuffer.ref.data.asTypedList(skBuffer.ref.length));
        final pk = Uint8List.fromList(pkBuffer.ref.data.asTypedList(pkBuffer.ref.length));
        _freeBuffer(skBuffer.ref);
        _freeBuffer(pkBuffer.ref);
        return {'secretKey': sk, 'publicKey': pk};
      }
      throw Exception('Key generation failed: $res');
    } finally {
      _freePtr(ikmPtr);
      _freePtr(kiPtr);
      calloc.free(skBuffer);
      calloc.free(pkBuffer);
      calloc.free(err);
    }
  }

  Uint8List sign(Uint8List secretKey, Uint8List publicKey, List<Uint8List> messages, [Uint8List? header]) {
    final err = calloc<ExternError>();
    final handle = _bbsSignInit(err);
    _checkError(err);

    try {
      _setByteArray(handle, secretKey, _bbsSignSetSk, err);
      _setByteArray(handle, publicKey, _bbsSignSetPk, err);
      if (header != null) _setByteArray(handle, header, _bbsSignSetHeader, err);
      for (final msg in messages) {
        _setByteArray(handle, msg, _bbsSignAddMsg, err);
      }

      final sigBuffer = calloc<ByteBuffer>();
      final res = _bbsSignFinish(handle, sigBuffer, err);
      _checkError(err);
      if (res == 0) {
        final sig = Uint8List.fromList(sigBuffer.ref.data.asTypedList(sigBuffer.ref.length));
        _freeBuffer(sigBuffer.ref);
        calloc.free(sigBuffer);
        return sig;
      }
      throw Exception('Signing failed: $res');
    } finally {
      calloc.free(err);
    }
  }

  bool verify(Uint8List publicKey, Uint8List signature, List<Uint8List> messages, [Uint8List? header]) {
    final err = calloc<ExternError>();
    final handle = _bbsVerifyInit(err);
    _checkError(err);

    try {
      _setByteArray(handle, publicKey, _bbsVerifySetPk, err);
      _setByteArray(handle, signature, _bbsVerifySetSig, err);
      if (header != null) _setByteArray(handle, header, _bbsVerifySetHeader, err);
      for (final msg in messages) {
        _setByteArray(handle, msg, _bbsVerifyAddMsg, err);
      }

      final res = _bbsVerifyFinish(handle, err);
      if (err.ref.code == 0) return res == 0;
      _checkError(err);
      return false;
    } finally {
      calloc.free(err);
    }
  }

  int getProofSize(int numUndisclosedMessages) {
    return _bbsGetProofSize(numUndisclosedMessages);
  }

  Uint8List deriveProof(Uint8List publicKey, Uint8List signature, List<Map<String, dynamic>> messages,
      {Uint8List? header, Uint8List? presentationHeader, bool verifySignature = true}) {
    final err = calloc<ExternError>();
    final handle = _bbsProofGenInit(err);
    _checkError(err);

    try {
      _setByteArray(handle, publicKey, _bbsProofGenSetPk, err);
      _setByteArray(handle, signature, _bbsProofGenSetSig, err);
      if (header != null) _setByteArray(handle, header, _bbsProofGenSetHeader, err);
      if (presentationHeader != null) _setByteArray(handle, presentationHeader, _bbsProofGenSetPh, err);
      _bbsProofGenSetVerifySig(handle, verifySignature, err);

      for (final msg in messages) {
        final value = msg['value'] as Uint8List;
        final reveal = msg['reveal'] as bool;
        final baPtr = _mallocByteArray(value);
        _bbsProofGenAddMsg(handle, reveal, baPtr.ref, err);
        _freePtr(baPtr);
        _checkError(err);
      }

      final proofBuffer = calloc<ByteBuffer>();
      final res = _bbsProofGenFinish(handle, proofBuffer, err);
      _checkError(err);
      if (res == 0) {
        final proof = Uint8List.fromList(proofBuffer.ref.data.asTypedList(proofBuffer.ref.length));
        _freeBuffer(proofBuffer.ref);
        calloc.free(proofBuffer);
        return proof;
      }
      throw Exception('Proof generation failed: $res');
    } finally {
      calloc.free(err);
    }
  }

  bool verifyProof(Uint8List publicKey, Uint8List proof, List<Map<String, dynamic>> disclosedMessages,
      {Uint8List? header, Uint8List? presentationHeader}) {
    final err = calloc<ExternError>();
    final handle = _bbsProofVerifyInit(err);
    _checkError(err);

    try {
      _setByteArray(handle, publicKey, _bbsProofVerifySetPk, err);
      _setByteArray(handle, proof, _bbsProofVerifySetProof, err);
      if (header != null) _setByteArray(handle, header, _bbsProofVerifySetHeader, err);
      if (presentationHeader != null) _setByteArray(handle, presentationHeader, _bbsProofVerifySetPh, err);

      for (final msg in disclosedMessages) {
        final index = msg['index'] as int;
        final value = msg['value'] as Uint8List;
        final baPtr = _mallocByteArray(value);
        _bbsProofVerifyAddMsg(handle, index, baPtr.ref, err);
        _freePtr(baPtr);
        _checkError(err);
      }

      final res = _bbsProofVerifyFinish(handle, err);
      if (err.ref.code == 0) return res == 0;
      _checkError(err);
      return false;
    } finally {
      calloc.free(err);
    }
  }

  void _setByteArray(int handle, Uint8List data, SetByteArrayDart func, ffi.Pointer<ExternError> err) {
    final baPtr = _mallocByteArray(data);
    func(handle, baPtr.ref, err);
    _checkError(err);
    _freePtr(baPtr);
  }

  ffi.Pointer<ByteArray> _mallocByteArray(Uint8List data) {
    final ptr = calloc<ffi.Uint8>(data.length);
    ptr.asTypedList(data.length).setAll(0, data);
    final ba = calloc<ByteArray>();
    ba.ref.length = data.length;
    ba.ref.data = ptr;
    return ba;
  }

  void _freePtr(ffi.Pointer<ByteArray> ptr) {
    calloc.free(ptr.ref.data);
    calloc.free(ptr);
  }

  void _checkError(ffi.Pointer<ExternError> err) {
    if (err.ref.code != 0) {
      final msg = err.ref.message.toDartString();
      throw Exception('SDK Error ${err.ref.code}: $msg');
    }
  }
}
