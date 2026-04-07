# Go 통합 및 사용 가이드 (Gin Framework)

이 문서는 `pairing_crypto` Rust 라이브러리를 Go 언어 환경에서 CGO를 통해 연동하고, Gin 프레임워크를 사용하여 REST API 서버를 구축하는 방법을 설명합니다.

---

## 1. 라이브러리 준비 및 빌드

Go에서 Rust 기능을 사용하려면 먼저 Rust 코드를 C 호환 정적 라이브러리(`.a`)로 빌드해야 합니다.

### 환경 준비
- [Rust](https://rustup.rs/) 설치 (최신 버전 권장)
- [Go](https://go.dev/) 설치 (1.21 이상 권장)
- C 컴파일러 (gcc 또는 clang)
- **Rust 타겟 추가**: 각 플랫폼별 빌드를 위해 필요한 타겟을 추가합니다.
  ```bash
  rustup target add x86_64-apple-darwin aarch64-apple-darwin # macOS
  rustup target add x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu # Linux
  rustup target add x86_64-pc-windows-msvc # Windows
  ```

### 플랫폼별 빌드 명령어
`wrappers/c` 디렉토리에서 대상 OS에 맞는 명령어를 실행하여 정적 라이브러리를 생성합니다.

#### 🍏 macOS (Intel & Apple Silicon)
```bash
# Intel Mac (x86_64)
cargo build --release --target x86_64-apple-darwin

# Apple Silicon (M1/M2/M3)
cargo build --release --target aarch64-apple-darwin

# 기본적인 네이티브 빌드 (현재 아키텍처용)
cargo build --release
```

#### 🐧 Linux (64-bit & ARM)
```bash
# Standard Linux (x64)
cargo build --release --target x86_64-unknown-linux-gnu
# Linux ARM64
cargo build --release --target aarch64-unknown-linux-gnu
```

#### 🪟 Windows (MSVC)
```bash
# Windows 64-bit
cargo build --release --target x86_64-pc-windows-msvc
```

> [!IMPORTANT]
> **빌드 결과물 위치**: 이 프로젝트는 Cargo 워크스페이스를 사용하므로, `target` 폴더는 `wrappers/c` 내부가 아닌 **프로젝트 최상위 루트**에 생성됩니다.
> - **Unix (Mac/Linux)**: `target/<target_name>/release/libpairing_crypto_c.a`
> - **Windows**: `target/<target_name>/release/pairing_crypto_c.lib`

---

## 2. Go 프로젝트 설정 및 CGO 연동

`wrappers/go` 디렉토리에 CGO 바인딩을 위한 설정이 포함되어 있습니다.

### CGO 설정 (`pairing_crypto.go`)
Go 소스 코드 상단에는 각 플랫폼별 빌드 타겟 경로가 **빌드 태그**와 함께 사전 정의되어 있습니다. `${SRCDIR}` 매크로를 사용하여 소스 파일 위치를 기준으로 라이브러리를 정확히 찾습니다.

```go
/*
// macOS Apple Silicon 예시
#cgo darwin,arm64 LDFLAGS: -L${SRCDIR}/../../target/aarch64-apple-darwin/release -lpairing_crypto_c ...
*/
```

> [!TIP]
> 만약 커스텀 타겟을 사용하거나 라이브러리 위치가 다를 경우, `pairing_crypto.go` 상단의 `#cgo LDFLAGS` 경로를 자신의 빌드 결과물 경로에 맞게 수정하세요.

### 모듈 초기화
```bash
cd wrappers/go
go mod tidy
```

---

## 3. 상세 API 사용 예제 (BBS)

Go 래퍼는 `BbsCipherSuite` 인터페이스를 통해 SHA-256 및 SHAKE-256 방식을 모두 지원합니다.

### 🔑 키 쌍 생성 (Key Generation)
```go
import "github.com/mattrglobal/pairing-crypto-go"

bbs := pairing_crypto.BLS12381Sha256
ikm := make([]byte, 32) // 실제 서비스에서는 무작위 바이트 사용
keyInfo := []byte{}

kp, err := bbs.GenerateKeyPair(ikm, keyInfo)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Public Key: %x\n", kp.PublicKey)
```

### ✍️ 서명 생성 (Sign)
```go
messages := [][]byte{
    []byte("메시지 1"),
    []byte("메시지 2"),
}
header := []byte("공개 헤더")

signature, err := bbs.Sign(kp.SecretKey, kp.PublicKey, header, messages)
```

### ✅ 서명 검증 (Verify)
```go
valid, err := bbs.Verify(kp.PublicKey, signature, header, messages)
if valid {
    fmt.Println("서명이 유효합니다.")
}
```

### 🛡️ 영지식 증명 및 선택적 공개 (ZKP & Selective Disclosure)
```go
// 첫 번째 메시지만 공개(Reveal: true)
proofMessages := []pairing_crypto.ProofMessage{
    {Value: messages[0], Reveal: true},
    {Value: messages[1], Reveal: false},
}

proof, err := bbs.DeriveProof(kp.PublicKey, signature, header, nil, proofMessages)
```

### 🔬 증명 검증 (Verify Proof)
```go
```go
revealed := map[int][]byte{
    0: messages[0],
}
valid, err := bbs.VerifyProof(kp.PublicKey, proof, header, nil, revealed)
```

---

## 4. HD Wallet 및 ECIES 사용 예제

신규로 추가된 HD Wallet(BIP32/39/44) 및 ECIES 기능을 Go에서 사용하는 방법입니다.

### 💳 HD Wallet (BIP32/39/44)
```go
// 1. 니모닉 생성
mnemonic, _ := pairing_crypto.GenerateMnemonic()

// 2. 니모닉 + 패스프레이즈로 시드 유도
seed, _ := pairing_crypto.MnemonicToSeed(mnemonic, "my-password")

// 3. BIP44 경로 기반 개인키 파생 (예: Ethereum)
path := "m/44'/60'/0'/0/0"
privKey, _ := pairing_crypto.DerivePrivateKey(seed, path)

// 4. 공개키로부터 이더리움 주소 생성
// (개인키로부터 공개키를 얻는 과정은 ECIES API 활용 가능)
kp, _ := pairing_crypto.EciesKeypairFromBytes(privKey)
address, _ := pairing_crypto.EthAddressFromPubkey(kp.PublicKey)
fmt.Printf("Ethereum Address: %s\n", address)

// 5. ECDSA 서명 및 주소 복구 (ecrecover)
message := []byte("Integration test message")
signature, _ := pairing_crypto.SignEcdsaEth(privKey, message)
recoveredAddr, _ := pairing_crypto.RecoverEthAddress(message, signature)
fmt.Printf("Recovered Address: %s (Match: %v)\n", recoveredAddr, recoveredAddr == address)
```

### 🔒 ECIES (secp256k1 암호화)
```go
// 1. 개인키(32바이트)로부터 ECIES 키쌍 복구
keyPair, _ := pairing_crypto.EciesKeypairFromBytes(privKey)

// 2. 공개키로 암호화
msg := []byte("비밀 메시지")
encrypted, _ := pairing_crypto.EciesEncrypt(keyPair.PublicKey, msg)

// 3. 개인키로 복호화
decrypted, _ := pairing_crypto.EciesDecrypt(keyPair.SecretKey, encrypted)
fmt.Println(string(decrypted)) // "비밀 메시지"
```

---

## 5. 종합 통합 테스트 시나리오 (5-Step)

`pairing_crypto` 라이브러리의 모든 기능(HD Wallet, ECDSA, ECIES)을 유기적으로 연결하여 검증하는 표준 시나리오입니다.

1.  **키 쌍 파생**: 동일한 니모닉 시드로부터 BIP44 경로(m/44'/60'/0'/0/i)를 따라 3개의 키 쌍을 생성합니다.
2.  **ETH 주소 생성**: 각 키 쌍의 공개키로부터 이더리움 표준 주소를 도출합니다.
3.  **ECDSA 서명**: 첫 번째 키(index 0)를 사용하여 임의의 메시지에 서명합니다.
4.  **주소 복구**: 서명과 메시지로부터 이더리움 주소를 복구(ecrecover)하여 2단계에서 생성한 주소와 일치하는지 확인합니다.
5.  **ECIES 통신**: 첫 번째 키(index 0)와 두 번째 키(index 1) 간에 암호화 및 복호화를 수행하여 데이터 무결성을 확인합니다.

> [!TIP]
> 상세 구현 로직은 `wrappers/go/example/main.go`의 `/integration/test` 엔드포인트를 참고하세요.

---

## 6. Gin 프레임워크 예제 서버 실행

`wrappers/go/example` 디렉토리에는 Next.js 데모와 동일한 기능을 수행하는 REST API 서버가 구현되어 있습니다.

### 1. 의존성 설치
```bash
cd wrappers/go/example
go mod tidy
```

### 2. 서버 실행
```bash
go run main.go
```
서버는 기본적으로 `http://localhost:8080`에서 구동됩니다.

### 3. 주요 엔드포인트
- `GET /keys`: BBS 키 쌍 생성
- `POST /sign`: 메시지 서명
- `POST /verify`: 서명 검증
- `POST /proof/derive`: 영지식 증명 생성 (선택적 공개)
- `POST /proof/verify`: 증명 검증
- `GET /integration/test`: 5단계 통합 테스트 시나리오 실행 및 결과 반환

---

---

## 💡 유의 사항 및 트러블슈팅

### 1. 헤더 파일 동기화 (`pairing_crypto.h`)
Cgo는 `wrappers/go/pairing_crypto.h` 파일을 참조합니다. Rust의 C 래퍼(`wrappers/c`)에서 API가 변경되거나 추가된 경우, 반드시 최신 헤더 파일을 Go 래퍼 디렉토리로 복사해야 합니다.
```bash
# 프로젝트 루트에서 실행
cp wrappers/c/include/pairing_crypto.h wrappers/go/pairing_crypto.h
```
만약 `could not determine what C.pairing_crypto_... refers to`와 같은 에러가 발생한다면 헤더 파일이 구버전인지 확인하세요.

### 2. 라이브러리 검색 경로 설정 (`LDFLAGS`)
Go가 빌드된 Rust 라이브러리(`.a` 또는 `.dylib`)를 찾지 못할 경우 `pairing_crypto.go` 파일의 `LDFLAGS` 설정을 확인해야 합니다. 현재 프로젝트는 다음과 같은 경로를 자동으로 탐색하도록 설정되어 있습니다:
- `target/release/` (기본 빌드)
- `target/<arch>-apple-darwin/release/` (타겟 명시 빌드)
- `${SRCDIR}` (Go 래퍼 디렉토리 자체)

**해결 방법**:
빌드된 라이브러리 파일(`libpairing_crypto_c.dylib` 등)을 `wrappers/go` 디렉토리로 직접 복사하거나, `LIBRARY_PATH` 환경 변수를 지정하세요.
```bash
# 방법 1: 라이브러리 파일 복사 (추천)
cp target/release/libpairing_crypto_c.dylib wrappers/go/

# 방법 2: 환경 변수 지정
export LIBRARY_PATH=$LIBRARY_PATH:$(pwd)/../../target/release
```

### 3. 포트 충돌 (`address already in use`)
`go run main.go` 실행 시 `bind: address already in use` 에러가 발생한다면, 이미 8080 포트를 점유 중인 프로세스가 있는 것입니다.
```bash
# 8080 포트 점유 프로세스 확인 및 종료 (macOS)
lsof -i :8080
kill -9 <PID>
```
