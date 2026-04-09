# Go 연동 가이드 (CGO)

`pairing_crypto` Rust 라이브러리의 Go(CGO) 연동 및 Gin 데모 실행 가이드.

---

## 1. 라이브러리 빌드

Go에서 사용하기 위해 Rust 코드를 C 호환 정적/동적 라이브러리로 빌드해야 합니다.

### 환경 준비
- Rust, Go(1.21+), C 컴파일러(gcc/clang) 설치.
- **타겟 추가**:
  ```bash
  rustup target add x86_64-apple-darwin aarch64-apple-darwin # macOS
  rustup target add x86_64-unknown-linux-gnu # Linux
  ```

### 빌드 명령어 (`wrappers/c` 에서 실행)
```bash
# 기본 릴리즈 빌드
cargo build --release
```

> [!IMPORTANT]
> **빌드 결과물**: 프로젝트 루트 `target/release/` 디렉토리에 `libpairing_crypto_c.a` (정적) 또는 `libpairing_crypto_c.dylib` (macOS 동적) 파일이 생성됩니다.

---

## 2. Go 프로젝트 설정

### 모듈 초기화
```bash
cd wrappers/go
go mod tidy
```

### CGO 설정 확인 (`pairing_crypto.go`)
`pairing_crypto.go` 상단의 `#cgo LDFLAGS` 경로가 빌드된 라이브러리 위치와 일치해야 합니다. 기본적으로 `../../target/release`를 참조하도록 설정되어 있습니다.

---

## 3. 상세 API 사용 예제

### BBS+ 서명 및 검증
```go
bbs := pairing_crypto.BLS12381Sha256
kp, _ := bbs.GenerateKeyPair(ikm, keyInfo)
signature, _ := bbs.Sign(sk, pk, header, messages)
valid, _ := bbs.Verify(pk, signature, header, messages)
```

### HD Wallet & ECIES
```go
// HD Wallet
mnemonic, _ := pairing_crypto.GenerateMnemonic()
seed, _ := pairing_crypto.MnemonicToSeed(mnemonic, "")
privKey, _ := pairing_crypto.DerivePrivateKey(seed, "m/44'/60'/0'/0/0")

// ECIES (X25519)
encrypted, _ := pairing_crypto.EciesX25519Encrypt(pubKey, msg)
decrypted, _ := pairing_crypto.EciesX25519Decrypt(privKey, encrypted)
```

---

## 4. Gin 예제 서버 실행 (`wrappers/go/example`)

### 1. 실행 방법
```bash
cd wrappers/go/example
go mod tidy

# 서버 실행
go run main.go
```

### 2. 주요 엔드포인트
- `GET /integration/test`: 5단계 통합 테스트 시나리오 실행 (Ethereum Flow)
- `GET /integration/ed25519-test`: Ed25519 통합 플로우 테스트 실행

---

## 💡 유지보수: 새로운 API 추가 시 주의사항

Rust 코어 라이브러리에 새로운 기능이나 API가 추가될 경우, Go 환경에서 이를 사용하기 위해 다음의 **브릿지 레이어**를 수동으로 업데이트해야 합니다.

1.  **헤더 파일 동기화**: `wrappers/c/include/pairing_crypto.h` 파일을 `wrappers/go/` 디렉토리로 복사합니다.
    ```bash
    cp wrappers/c/include/pairing_crypto.h wrappers/go/pairing_crypto.h
    ```
2.  **Go 래퍼 업데이트**: `wrappers/go/pairing_crypto.go` 파일에 새로운 C 함수를 호출하는 Go 함수를 추가합니다.
3.  **예제 반영**: 필요한 경우 `wrappers/go/example/main.go` 등에 새로운 기능을 테스트하는 엔드포인트를 추가합니다.

---

## 💡 트러블슈팅

### 1. Link Error (Library Not Found)
컴파일러가 `libpairing_crypto_c`를 찾지 못할 경우, 빌드된 결과물의 경로를 `LIBRARY_PATH`로 명시해주어야 합니다.
```bash
LIBRARY_PATH=../../../target/release go run main.go
```

### 2. 포트 충돌 (8080)
```bash
# 8080 포트 점유 프로세스 확인 및 종료
lsof -i :8080
kill -9 <PID>
```
