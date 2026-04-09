# 플러터 구현 가이드

`pairing_crypto` Rust 라이브러리를 Flutter 프로젝트에 연동하고 Android/iOS에서 사용하는 방법을 설명합니다.

---

## 0. 사전 요구 사항 (Prerequisites)

라이브러리를 성공적으로 빌드하려면 개발 환경에 다음 도구들이 설치되어 있어야 합니다.

- **Rust**: `rustup` 환경 및 타겟(Android, iOS) 설치 필요
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  rustup target add aarch64-apple-ios x86_64-apple-ios
  ```
- **Android NDK**: `cargo-ndk`를 통해 안드로이드 네이티브 코드를 빌드합니다.
  ```bash
  cargo install cargo-ndk
  ```
- **OpenSSL 설정 (중요)**: 모바일 교차 컴파일 시 OpenSSL 라이브러리 미검출 오류를 방지하기 위해, 루트 `Cargo.toml`에 반드시 `vendored` 기능이 활성화되어 있어야 합니다.
  ```toml
  # 루트 Cargo.toml의 [dependencies] 섹션
  openssl = { version = "0.10", features = ["vendored"] }
  ```

---

## 1. 라이브러리 초기화 및 빌드 (Rust)

기존 빌드 결과물로 인한 혼선을 방지하기 위해 먼저 모든 캐시를 삭제하고 새로 빌드합니다.

### 🧹 빌드 초기화
```bash
cd wrappers/c

# 1. Rust 빌드 캐시 삭제
cargo clean

# 2. 기존 출력 폴더 삭제
rm -rf out
```

### 🔨 플랫폼별 빌드
```bash
# iOS용 빌드 (libpairing_crypto_c.a 생성)
./scripts/build-platform-targets.sh IOS ./out

# Android용 빌드 (libpairing_crypto_c.so 생성)
./scripts/build-platform-targets.sh ANDROID ./out
```

### 빌드 결과 심볼 검증
빌드 완료 후 함수 포함 여부를 확인합니다.
```bash
nm -D out/android/arm64-v8a/libpairing_crypto_c.so | grep hwallet
```

---

## 2. 예제 프로젝트 초기화 및 파일 배치

### 프로젝트 초기화 및 의존성 설치
`wrappers/dart/example` 폴더에서 실행합니다.

```bash
cd wrappers/dart/example

# 1. Flutter 프로젝트 청소 및 의존성 설치
flutter clean
flutter pub get

# 2. 플랫폼 폴더 생성 (이미 있다면 스킵)
flutter create --platforms=android,ios .

# 3. iOS CocoaPods 설치 (Mac 전용)
cd ios && pod install && cd ..
```

### 바이너리 및 Dart 브릿지 복사

**터미널 명령어 (wrappers/c 폴더 기준):**

```bash
# [Android] .so 파일 복사 (arm64-v8a, armeabi-v7a, x86_64, x86 모두 대응)
mkdir -p ../dart/example/android/app/src/main/jniLibs/arm64-v8a
cp out/android/arm64-v8a/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/arm64-v8a/

mkdir -p ../dart/example/android/app/src/main/jniLibs/armeabi-v7a
cp out/android/armeabi-v7a/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/armeabi-v7a/

mkdir -p ../dart/example/android/app/src/main/jniLibs/x86_64
cp out/android/x86_64/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/x86_64/

mkdir -p ../dart/example/android/app/src/main/jniLibs/x86
cp out/android/x86/libpairing_crypto_c.so ../dart/example/android/app/src/main/jniLibs/x86/

# [iOS] .a 파일 복사
mkdir -p ../dart/example/ios/Frameworks
cp out/ios/universal/libpairing_crypto_c.a ../dart/example/ios/Frameworks/

# [Dart] FFI 브릿지 코드 복사 (중요!)
cp ../dart/lib/pairing_crypto_ffi.dart ../dart/example/lib/
```

### iOS 추가 설정 (Xcode)
1. Xcode에서 `Runner` 타겟의 **Build Phases > Link Binary With Libraries**에 `libpairing_crypto_c.a`를 추가합니다.
2. **Build Settings > Other Linker Flags**에 다음을 추가합니다:
   ```text
   -Wl,-force_load,$(PROJECT_DIR)/Frameworks/libpairing_crypto_c.a
   ```

---

## 3. 통합 테스트 코드 (`main.dart`)

`wrappers/dart/example/lib/main.dart`의 핵심 로직입니다. BBS 테스트와 5단계 통합 테스트(HD Wallet & ECIES)를 포함합니다.

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
  String _integrationStatus = '준비됨';
  late final PairingCryptoLib _sdk;
  Uint8List? _secretKey;
  Uint8List? _publicKey;

  // 테스트용 상수
  static final Uint8List _exampleIkm = Uint8List.fromList('only_for_example_not_A_random_seed_at_Allllllllll'.codeUnits);
  static final Uint8List _exampleKeyInfo = Uint8List.fromList('example-key-info'.codeUnits);
  static final Uint8List _exampleHeader = Uint8List.fromList('example-header'.codeUnits);
  static final List<Uint8List> _exampleMessages = [
    Uint8List.fromList('message-1'.codeUnits),
    Uint8List.fromList('message-2'.codeUnits),
  ];

  @override
  void initState() {
    super.initState();
    try {
      _sdk = PairingCryptoLib();
      final keys = _sdk.generateKeyPair(_exampleIkm, _exampleKeyInfo);
      _secretKey = keys['secretKey'];
      _publicKey = keys['publicKey'];
    } catch (e) {
      _status = 'SDK 초기화 실패: $e';
    }
  }

  void _runBBSTest() {
    setState(() { _status = 'BBS 테스트 실행 중...'; });
    try {
      if (_secretKey == null) throw Exception('키가 생성되지 않았습니다.');
      final signature = _sdk.sign(_secretKey!, _publicKey!, _exampleMessages, _exampleHeader);
      final isVerified = _sdk.verify(_publicKey!, signature, _exampleMessages, _exampleHeader);
      setState(() {
        _status = 'BBS 결과: ${isVerified ? "검증 성공" : "실패"} (${signature.length}바이트)';
      });
    } catch (e) {
      setState(() { _status = '실패: $e'; });
    }
  }

  void _runIntegrationTest() {
    setState(() { _integrationStatus = '통합 테스트 시작 중...'; });
    try {
      // 1. 키 쌍 생성
      final mnemonic = _sdk.generateMnemonic();
      final seed = _sdk.mnemonicToSeed(mnemonic, "");
      final sk = _sdk.derivePrivateKey(seed, "m/44'/60'/0'/0/0");
      
      // 2. ETH 주소 생성
      final kp = _sdk.eciesKeypairFromBytes(sk);
      final addr = _sdk.ethAddressFromPubkey(kp['publicKey']!);
      
      // 3. 메시지 서명
      final message = Uint8List.fromList("Integration test".codeUnits);
      final signature = _sdk.hwalletSignEcdsaEth(sk, message);

      // 4. 주소 복구 (ecrecover)
      final recoveredAddr = _sdk.hwalletRecoverEthAddress(message, signature);
      final step4Success = recoveredAddr == addr;

      // 5. ECIES 암/복호화
      final secretMsg = Uint8List.fromList("Secret Message".codeUnits);
      final encrypted = _sdk.eciesEncrypt(kp['publicKey']!, secretMsg);
      final decrypted = _sdk.eciesDecrypt(sk, encrypted);
      final step5Success = String.fromCharCodes(decrypted) == "Secret Message";

      setState(() {
        _integrationStatus = '--- 5단계 테스트 결과 ---\n'
            '주소: $addr\n'
            '서명복구: ${step4Success ? "성공" : "실패"}\n'
            'ECIES: ${step5Success ? "성공" : "실패"}\n'
            '종합: ${step4Success && step5Success ? "PASS" : "FAIL"}';
      });
    } catch (e) {
      setState(() { _integrationStatus = '실패: $e'; });
    }
  }

  void _runEd25519Flow() {
    setState(() { _edFlowStatus = 'Ed25519 통합 플로우 실행 중...'; });
    try {
      // 1. Ed25519 키 생성 및 변환
      final seed = Uint8List(32);
      final kp = _sdk.ed25519KeypairFromSeed(seed);
      final xsk = _sdk.ed25519SkToX25519(kp['secretKey']!);
      final xpk = _sdk.ed25519PkToX25519(kp['publicKey']!);

      // 2. X25519 ECIES 암복호화
      final msg = Uint8List.fromList("Hello X25519".codeUnits);
      final encrypted = _sdk.eciesX25519Encrypt(xpk, msg);
      final decrypted = _sdk.eciesX25519Decrypt(xsk, encrypted);
      final success = String.fromCharCodes(decrypted) == "Hello X25519";

      setState(() {
        _edFlowStatus = 'Ed25519 결과: ${success ? "성공" : "실패"}';
      });
    } catch (e) {
      setState(() { _edFlowStatus = '실패: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pairing Crypto Test')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildCard('BBS 테스트', _status, _runBBSTest, Colors.indigo),
            const SizedBox(height: 20),
            _buildCard('5단계 통합 테스트', _integrationStatus, _runIntegrationTest, Colors.deepPurple),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(String title, String status, VoidCallback action, Color color) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Text(status),
            const SizedBox(height: 15),
            ElevatedButton(onPressed: action, style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white), child: Text('$title 실행')),
          ],
        ),
      ),
    );
  }
}
```

---

## 4. 실행 및 테스트

```bash
# Android 실행
flutter run

# iOS 실행
flutter run
```

---

## 5. 트러블슈팅: `LateInitializationError` 발생 시
앱 로딩 시 `LateInitializationError: Field '_sdk@...' has not been initialized` 오류가 발생한다면 다음을 확인하세요:

1. **심볼 누락**: 터미널에서 `nm -D ...libpairing_crypto_c.so | grep hwallet`을 실행하여 새 함수들이 포함되어 있는지 확인하세요.
2. **캐시 오염**: `flutter clean`을 실행한 후 다시 빌드하세요.
3. **오타 확인**: `pairing_crypto_ffi.dart`의 함수 이름이 Rust의 `#[no_mangle]` 이름과 정확히 일치하는지 확인하세요.
4. **Android ABI**: 시뮬레이터(x86_64)와 실제 기기(arm64-v8a) 폴더에 각각 맞는 `.so` 파일이 복사되었는지 확인하세요.

---

## 6. 🛠️ 유지보수: 새로운 API 추가 시 주의사항

Rust 코어 라이브러리에 새로운 기능이나 API가 추가될 경우, Flutter 환경에서 이를 사용하기 위해 다음의 **Dart FFI 브릿지 레이어**를 수동으로 업데이트해야 합니다.

1.  **Dart FFI 정의 추가**: `wrappers/dart/lib/pairing_crypto_ffi.dart` 파일에 다음 항목들을 추가합니다:
    *   `typedef ...Native`: C 함수 서명에 대응하는 네이티브 정의.
    *   `typedef ...Dart`: Dart에서 사용할 함수 서명 정의.
    *   `PairingCryptoLib` 클래스 내에 `late final` 필드로 함수 선언.
    *   생성자에서 `_lib.lookupFunction`을 사용하여 네이티브 함수와 연결.
2.  **Dart 래퍼 메서드 구현**: 사용자에게 노출할 고수준 메서드를 작성하여 FFI 함수를 호출하도록 구현합니다.
3.  **재빌드 및 배포**: `wrappers/c`에서 플랫폼별 바이너리(`.so`, `.a`)를 다시 빌드하고, 생성된 파일을 Flutter 프로젝트의 `jniLibs` 또는 `Frameworks` 폴더로 다시 복사해야 합니다.
