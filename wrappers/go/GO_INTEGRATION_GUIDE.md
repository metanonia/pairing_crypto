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
revealed := map[int][]byte{
    0: messages[0],
}
valid, err := bbs.VerifyProof(kp.PublicKey, proof, header, nil, revealed)
```

---

## 🚀 Gin 프레임워크 예제 서버 실행

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

---

## 💡 유의 사항 (macOS)

CGO 빌드 시 라이브러리 경로 오인 등으로 링크 에러가 발생할 경우, 라이브러리가 빌드된 `target/release` 디렉토리의 절대 경로를 `LDFLAGS`에 명시하거나 `LIBRARY_PATH` 환경 변수를 지정하세요.

```bash
export LIBRARY_PATH=$LIBRARY_PATH:$(pwd)/../../target/release
go run example/main.go
```
