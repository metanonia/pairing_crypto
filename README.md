# 🛡️ DID용 암호 라이브러리


## 🚀 주요 기능 (Key Features)

탈중앙화 신원증명(DID)용 암호 라이브러리.

### 1. BBS+ Signatures
- **선택적 공개(Selective Disclosure)**: 원하는 메시지만 선택적 노출.
- **익명성 보장**: 개인정보 보호 및 데이터 무결성 입증.

### 2. HD Wallet (BIP32/39/44)
- **니모닉 관리**: 12/24단어 마스터 시드 생성 및 복구.
- **계층적 키 유도**: Ethereum 등 다양한 경로 자동 파생.

### 3. ECDSA & Ethereum
- **Ethereum 호환**: 표준 이더리움 주소 도출.
- **서명 및 복구**: ECDSA 서명 및 `ecrecover` 지원.

### 4. ECIES (Encryption)
- **멀티 엔진**: `secp256k1` 및 `X25519` 엔진 지원.
- **데이터 암호화**: 공개키 기반 비대칭 암호화.

### 5. Ed25519 - X25519 상호운용성
- **키 변환**: Ed25519 서명 키를 X25519 암호 키로 변환.

---

## 📦 플랫폼 지원

| 플랫폼 | 환경 | 연동 방식 | 가이드 |
| :--- | :--- | :--- | :--- |
| **Go** | Gin Backend | CGO | [Go 가이드](./wrappers/go/GO_INTEGRATION_GUIDE.md) |
| **Java** | Spring / JNI | Rust Bridge | [스프링 구현 가이드](./wrappers/java/SPRING_INTEGRATION_GUIDE.md) |
| **WASM** | Web / Node.js | WASM | [WASM 가이드](./wrappers/wasm/WASM_Integration_Guide.md) |
| **Dart** | Flutter FFI | Dart FFI | [플러터 구현 가이드](./wrappers/dart/Flutter_Integration_Guide.md) |

---

## 🛠️ 저장소 구조

```text
├── src/                # 라이브러리 코어 (Rust)
├── wrappers/           # 언어별 바인딩 및 예제
│   ├── go/             # Go 래퍼 & Gin 데모
│   ├── java/           # Java JNI & Spring 데모
│   ├── wasm/           # WebAssembly & JS 데모
│   └── dart/           # Flutter FFI & 예제 앱
└── tests/              # 통합 테스트
```

---

## 🧪 통합 테스트 시나리오

1.  **Ethereum Flow**: 니모닉 → 키 유도 → 주소 생성 → ECDSA 서명 → ECIES 암호화.
2.  **DID Flow**: Ed25519 생성 → 서명 → X25519 변환 → ECIES 암호화.

---

<p align="center">Licensed under the Apache License, Version 2.0. <br/>
This project is a fork of and extends <a href="https://github.com/mattrglobal/pairing_crypto">mattrglobal/pairing_crypto</a>, originally developed by MATTR Limited.</p>
