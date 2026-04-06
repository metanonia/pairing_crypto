# Flutter 연동 및 테스트 가이드

이 문서는 `pairing_crypto` Rust 라이브러리를 Flutter 프로젝트에 연동하고 Android 및 iOS에서 테스트하는 방법을 설명합니다.

## 1. 라이브러리 빌드 (Rust)

먼저 Mac 터미널에서 각 플랫폼용 라이브러리를 빌드합니다.

```bash
cd wrappers/c

# iOS용 빌드 (libpairing_crypto_c.a 생성)
./scripts/build-platform-targets.sh IOS ./out

# Android용 빌드 (libpairing_crypto_c.so 생성)
./scripts/build-platform-targets.sh ANDROID ./out
```

빌드가 완료되면 `./out` 디렉토리에 다음과 같이 파일들이 생성됩니다:
- `out/ios/universal/libpairing_crypto_c.a`
- `out/android/arm64-v8a/libpairing_crypto_c.so` (외 다른 ABI들)

---

## 2. 예제 프로젝트 초기화 및 파일 배치

### 프로젝트 초기화 및 의존성 설치
`wrappers/dart/example` 폴더에는 핵심 소스만 들어있습니다. 먼저 터미널에서 아래 명령어를 실행하여 플랫폼 폴더를 생성하고 의존성을 설치하세요.

```bash
# 1. 플랫폼 폴더 생성 (example 폴더에서 실행)
cd wrappers/dart/example
flutter create --platforms=android,ios .

# 2. 패키지 의존성 설치
flutter pub get

# 3. iOS CocoaPods 설치 (ios 폴더에서 실행)
cd ios
pod install
cd ..
```

### 바이너리 및 Dart 브릿지 복사

**터미널 명령어 (wrappers/c 폴더 기준):**

```bash
# [Android] 디렉토리 생성 및 .so 파일 복사 (모든 CPU 아키텍처 지원)
# 64-bit ARM (최신 실제 기기)
mkdir -p ../dart/example/android/app/src/main/jniLibs/arm64-v8a
cp out/android/arm64-v8a/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/arm64-v8a/

# 32-bit ARM (구형 기기)
mkdir -p ../dart/example/android/app/src/main/jniLibs/armeabi-v7a
cp out/android/armeabi-v7a/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/armeabi-v7a/

# x86_64 (Intel Mac 에뮬레이터 등)
mkdir -p ../dart/example/android/app/src/main/jniLibs/x86_64
cp out/android/x86_64/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/x86_64/

# x86 (구형 에뮬레이터)
mkdir -p ../dart/example/android/app/src/main/jniLibs/x86
cp out/android/x86/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/x86/

# [iOS] 디렉토리 생성 및 .a 파일 복사
mkdir -p ../dart/example/ios/Frameworks
cp out/ios/universal/libpairing_crypto_c.a ../dart/example/ios/Frameworks/

# [Dart] FFI 브릿지 코드 복사 (중요!)
cp ../dart/lib/pairing_crypto_ffi.dart ../dart/example/lib/
```

### iOS 추가 설정 (Xcode)
1. Xcode를 열어 `Runner` 타겟의 **Build Phases > Link Binary With Libraries**에 해당 `.a` 파일을 추가합니다.
2. **Build Settings > Other Linker Flags** 항목에 다음 내용을 추가합니다 (매우 중요):
   ```text
   -Wl,-force_load,$(PROJECT_DIR)/Frameworks/libpairing_crypto_c.a
   ```
   *(이 설정이 없으면 Xcode 링커가 사용되지 않는 함수로 판단하여 암호화 기능들을 삭제해 버립니다.)*

3. **Build Settings > Library Search Paths**에 해당 경로(`$(PROJECT_DIR)/Frameworks`)가 포함되어 있는지 확인합니다.

---

## 3. 종합 테스트 코드 (`main.dart`)

`wrappers/dart/example/lib/main.dart` 파일에 아래 코드를 붙여넣어 BBS의 모든 과정(키 생성, 서명, 검증, 선택적 공개)을 테스트할 수 있습니다. 이 코드는 Rust의 `bbs_simple.rs` 예제와 동일한 데이터 및 흐름을 보여줍니다.

```dart
import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'pairing_crypto_ffi.dart';

void main() {
  runApp(const MaterialApp(home: MyApp()));
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String _status = '준비됨';
  late final PairingCryptoLib _sdk;
  Uint8List? _secretKey;
  Uint8List? _publicKey;

  // bbs_simple.rs와 동일한 테스트 상수
  static final Uint8List _exampleIkm = Uint8List.fromList(
      'only_for_example_not_A_random_seed_at_Allllllllll'.codeUnits);
  static final Uint8List _exampleKeyInfo =
      Uint8List.fromList('example-key-info'.codeUnits);
  static final Uint8List _exampleHeader =
      Uint8List.fromList('example-header'.codeUnits);
  static final Uint8List _examplePresentationHeader =
      Uint8List.fromList('example-presentation-header'.codeUnits);
  static final List<Uint8List> _exampleMessages = [
    Uint8List.fromList('example-message-1'.codeUnits),
    Uint8List.fromList('example-message-2'.codeUnits),
  ];

  @override
  void initState() {
    super.initState();
    try {
      _sdk = PairingCryptoLib();
      // 1. 키 쌍 생성 (Key Generation)
      final keys = _sdk.generateKeyPair(_exampleIkm, _exampleKeyInfo);
      _secretKey = keys['secretKey'];
      _publicKey = keys['publicKey'];
    } catch (e) {
      _status = 'SDK 초기화 또는 키 생성 실패: $e';
    }
  }

  void _runFullTest() {
    setState(() { _status = 'BBS 테스트 실행 중...'; });

    try {
      if (_secretKey == null || _publicKey == null) throw Exception('키가 생성되지 않았습니다.');
      final messages = _exampleMessages;

      // 2. 여러 메시지에 대한 서명 생성 (Signing)
      final signature = _sdk.sign(_secretKey!, _publicKey!, messages, _exampleHeader);
      
      // 3. 서명 검증 (Verification)
      final isVerified = _sdk.verify(_publicKey!, signature, messages, _exampleHeader);
      
      // 4. 선택적 공개를 위한 설정 (Selective Disclosure Setup)
      // 첫 번째 인덱스의 메시지(0)만 공개하도록 설정
      final proofMessages = [
        {'value': messages[0], 'reveal': true},
        {'value': messages[1], 'reveal': false},
      ];

      // 5. 증명 생성 (Proof Generation)
      final proof = _sdk.deriveProof(
        _publicKey!,
        signature,
        proofMessages,
        header: _exampleHeader,
        presentationHeader: _examplePresentationHeader,
      );
      
      // 6. 증명 검증 (Proof Verification)
      final disclosedMessages = [{'index': 0, 'value': messages[0]}];
      final isProofVerified = _sdk.verifyProof(
        _publicKey!,
        proof,
        disclosedMessages,
        header: _exampleHeader,
        presentationHeader: _examplePresentationHeader,
      );

      setState(() {
        _status = '--- BBS 종합 테스트 결과 (bbs_simple.rs 대응) ---\n\n'
            '1. 서명: 성공 (${signature.length}바이트)\n'
            '2. 검증: ${isVerified ? "성공" : "실패"}\n'
            '3. 증명 생성: 성공 (${proof.length}바이트)\n'
            '4. 증명 검증: ${isProofVerified ? "성공" : "실패"}';
      });
    } catch (e) {
      setState(() { _status = '실패: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BBS Demo')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('상태: $_status'),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _runFullTest, child: const Text('BBS 전체 프로세스 테스트')),
          ],
        ),
      ),
    );
  }
}
```

---

## 4. 실행 및 테스트

기기를 연결하거나 시뮬레이터를 실행한 후 다음 명령어로 테스트합니다.

```bash
# Android 테스트
flutter run -d <android_device_id>

# iOS 테스트
flutter run -d <ios_device_id>
```

---

## 5. 상세 API 레퍼런스

`PairingCryptoLib` 클래스에서 제공하는 주요 함수들에 대한 설명입니다. 모든 바이너리 데이터는 `Uint8List` 형식을 사용합니다.

### 🔑 키 관리 (Key Management)

#### `generateKeyPair(Uint8List ikm, [Uint8List? keyInfo])`
새로운 BBS 키 쌍을 생성합니다.
- **ikm**: 소스 엔트로피 (최소 32바이트 권장). 같은 IKM은 항상 같은 키를 생성합니다.
- **keyInfo**: (선택) 키 생성 시 추가되는 메타데이터.
- **반환값**: `{'secretKey': Uint8List, 'publicKey': Uint8List}`

### ✍️ 서명 (Signature)

#### `sign(Uint8List secretKey, Uint8List publicKey, List<Uint8List> messages, [Uint8List? header])`
여러 개의 메시지에 대해 하나의 BBS 서명을 생성합니다.
- **messages**: 서명할 메시지 리스트.
- **header**: (선택) 서명에 포함될 비공개 헤더 데이터.

#### `verify(Uint8List publicKey, Uint8List signature, List<Uint8List> messages, [Uint8List? header])`
BBS 서명의 유효성을 검증합니다. 모든 메시지가 원본과 일치해야 합니다.

### 🛡️ 선택적 공개 (Selective Disclosure)

BBS의 핵심 기능으로, 서명된 전체 메시지 중 **일부만 골라서** 증명(Proof)을 만들고 검증할 수 있습니다.

#### `deriveProof(Uint8List publicKey, Uint8List signature, List<Map<String, dynamic>> messages, {Uint8List? header, Uint8List? presentationHeader})`
원본 서명으로부터 특정 메시지만 노출하는 **증명(Proof)**을 생성합니다.
- **messages**: `{'value': Uint8List, 'reveal': bool}` 구조의 리스트.
  - `reveal: true`: 해당 메시지를 공개함.
  - `reveal: false`: 메시지 내용은 숨기고 "서명된 적이 있음"만 증명함.

#### `verifyProof(Uint8List publicKey, Uint8List proof, List<Map<String, dynamic>> disclosedMessages, {Uint8List? header, Uint8List? presentationHeader})`
전달받은 증명이 유효한지 검증합니다.
- **disclosedMessages**: 공개된 메시지들만 인덱스와 함께 전달합니다.
  - `{'index': int, 'value': Uint8List}` 구조의 리스트. (index는 원본 메시지 리스트에서의 순서, 0부터 시작)

### 💳 HD Wallet (BIP32/39/44)

#### `generateMnemonic()`
새로운 BIP39 니모닉 문구를 생성합니다.

#### `mnemonicToSeed(String mnemonic, String passphrase)`
니모닉과 패스프레이즈로부터 64바이트 시드를 유도합니다.

#### `derivePrivateKey(Uint8List seed, String path)`
유도된 시드와 파생 경로(예: `m/44'/60'/0'/0/0`)를 사용하여 개인키를 생성합니다.

#### `ethAddressFromPubkey(Uint8List pubkey)`
65바이트 비압축 공개키로부터 이더리움 주소 문자열을 생성합니다.

#### `hwalletSignEcdsaEth(Uint8List privkey, Uint8List message)`
이더리움 표준(Keccak256 해시) ECDSA 서명을 생성합니다. (65바이트 서명 반환)

#### `hwalletRecoverEthAddress(Uint8List message, Uint8List signature)`
서명과 메시지로부터 서명자의 이더리움 주소를 복구(ecrecover)합니다.

### 🔒 ECIES (secp256k1 암호화)

#### `eciesKeypairFromBytes(Uint8List privkey)`
32바이트 개인키로부터 ECIES 연산용 키쌍(`secretKey`, `publicKey`)을 생성합니다.

#### `eciesEncrypt(Uint8List uncompressedPubkey, Uint8List msg)`
상대방의 비압축 공개키로 메시지를 암호화합니다.

#### `eciesDecrypt(Uint8List privkey, Uint8List encryptedData)`
자신의 개인키로 암호화된 데이터를 복호화합니다.

#### `eciesDecrypt(Uint8List privkey, Uint8List encryptedData)`
자신의 개인키로 암호화된 데이터를 복호화합니다.

---

## 6. 종합 통합 테스트 시나리오 (5-Step)

`pairing_crypto` 라이브러리의 모든 기능(HD Wallet, ECDSA, ECIES)을 유기적으로 연결하여 검증하는 표준 시나리오입니다.

1.  **키 쌍 파생**: 동일한 니모닉 시드로부터 BIP44 경로(`m/44'/60'/0'/0/i`)를 따라 3개의 키 쌍을 생성합니다.
2.  **ETH 주소 생성**: 각 키 쌍의 공개키로부터 이더리움 표준 주소를 도출합니다.
3.  **ECDSA 서명**: 첫 번째 키(index 0)를 사용하여 임의의 메시지에 서명합니다.
4.  **주소 복구**: 서명과 메시지로부터 이더리움 주소를 복구(ecrecover)하여 2단계에서 생성한 주소와 일치하는지 확인합니다.
5.  **ECIES 통신**: 첫 번째 키(index 0)와 두 번째 키(index 1) 간에 암호화 및 복호화를 수행하여 데이터 무결성을 확인합니다.

> [!TIP]
> 상세 구현 로직은 `wrappers/dart/example/lib/main.dart`의 `_runIntegrationTest` 메서드를 참고하세요.

---

## 7. 💡 유의 사항 및 팁

### 📱 Android 테스트 관련 팁
1. **ABI 확인**: 실제 기기는 대부분 `arm64-v8a`를 사용하지만, 시뮬레이터는 macOS의 CPU에 따라 `x86_64`를 사용할 수도 있습니다. 에뮬레이터에서 실행이 안 된다면 `x86_64`용으로도 `.so`를 빌드하여 `jniLibs/x86_64`에 복사해야 합니다.
2. **Logcat 분석**: `pairing_crypto`와 관련된 오류는 터미널 로그 외에도 Android Studio의 **Logcat**에서 `native` 또는 `flutter` 태그로 필터링하여 더 자세히 볼 수 있습니다.
3. **NDK 버전**: 프로젝트의 `android/app/build.gradle`에 정의된 NDK 버전이 라이브러리 빌드 시 사용된 버전과 크게 다를 경우 런타임 오류가 발생할 수 있습니다.

### 🍏 iOS 테스트 관련 팁
1. **Xcode Linker Flags**: `-Wl,-force_load` 설정이 누락되면 서명 파일 검증 단계에서 런타임 오류가 발생할 확률이 높습니다. 반드시 설정해 주세요.
2. **Bitcode**: 최근 Flutter/AppStore 가이드에 따라 라이브러리 빌드 시 Bitcode는 포함하지 않는 것이 일반적입니다.

### ⚙️ 공통 팁
1.  **메모리 관리**: FFI 내부적으로 `calloc`을 사용하여 메모리를 할당하고 `finish` 함수 호출 시 러스트 쪽에서 자동으로 해제되도록 설계되어 있습니다.
2.  **보안**: `secretKey`는 절대 외부로 유출되지 않도록 기기의 Secure Storage 등에 안전하게 보관하세요.
3.  **사이퍼슈트(Ciphersuite) 일치 확인**: 
    - 현재 이 가이드와 브릿지는 전 세계 표준인 **`BLS12-381 SHA-256`** 버전을 사용하고 있습니다. 
    - 연동할 서버나 다른 시스템이 `SHAKE-256` 등 다른 해시 함수를 쓰지 않는지 확인이 필요합니다.
