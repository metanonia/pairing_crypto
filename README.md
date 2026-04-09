# 🛡️ DID용 암호 라이브러리


## 🚀 주요 기능 (Key Features)

본 라이브러리는 탈중앙화 신원증명(DID) 및 개인정보 보호가 강조되는 차세대 웹 환경을 위해 설계되었습니다.

### 1. BBS+ Signatures (Pairing-based)
- **영지식 증명(ZKP)**: 서명된 전체 메시지 중 원하는 메시지만 선택적으로 공개(Selective Disclosure)할 수 있습니다.
- **익명성 보장**: 증명을 통해 서명자의 신원을 보호하면서도 데이터의 무결성을 입증합니다.

### 2. HD Wallet (BIP32/BIP39/BIP44)
- **니모닉 관리**: 12/24단어 니모닉을 통한 마스터 시드 생성 및 복구.
- **계층적 키 유도**: Ethereum 표준 경로(`m/44'/60'/0'/0/i`) 등 다양한 경로로 무한한 키를 파생합니다.

### 3. Advanced ECDSA & Ethereum
- **Ethereum 호환**: 파생된 키로부터 표준 이더리움 주소를 생성합니다.
- **서명 및 복구**: ECDSA 서명과 `ecrecover` 기능을 통한 서명자 주소 복구를 지원합니다.

### 4. Advanced ECIES (Encryption)
- **멀티 엔진 지원**: 기존의 `secp256k1` 엔진뿐만 아니라 현대적인 `X25519` 엔진을 모두 지원하는 하이브리드 암호화 시스템입니다.
- **안전한 데이터 전송**: 공개키 기반으로 데이터를 암호화하여 수신자만 복호화할 수 있도록 합니다.

### 5. Ed25519 & X25519 상호운용성
- **Birational Equivalence**: 서명용 Ed25519 키를 암호화용 X25519 키로 안전하게 변환하여 하나의 시드로 두 가지 목적을 완벽하게 수행합니다.

---

## 📦 플랫폼 지원 및 언어 바인딩

다양한 환경에서 동일한 암호학적 인터페이스를 사용할 수 있도록 최적화된 래퍼(Wrapper)를 제공합니다.

| 플랫폼 | 언어 / 환경 | 연동 방식 | 상세 가이드 |
| :--- | :--- | :--- | :--- |
| **Go** | Gin / Backend | CGO (Go-lib) | [Go 가이드](./wrappers/go/GO_INTEGRATION_GUIDE.md) |
| **Java** | Spring Boot / Android | JNI (Rust Bridge) | [Java 가이드](./wrappers/java/SPRING_INTEGRATION_GUIDE.md) |
| **WASM** | Web / Node.js | WASM / JS | [WASM 가이드](./wrappers/wasm/WASM_Integration_Guide.md) |
| **Dart** | Flutter (AOS/iOS) | Dart FFI | [Dart 가이드](./wrappers/dart/Flutter_Integration_Guide.md) |

---

## 🛠️ 저장소 구조 (Repository Structure)

```text
├── src/                # 라이브러리 코어 (Rust)
│   ├── common/         # 공통 유틸리티
│   ├── curves/         # 타원 곡선 파라미터 (BLS12-381 등)
│   └── schemes/        # BBS+, ECDSA, ECIES, Ed25519 구현체
├── wrappers/           # 언어별 바인딩 및 예제 애플리케이션
│   ├── go/             # Go 래퍼 및 Gin 데모
│   ├── java/           # Java JNI 및 Spring Boot 데모
│   ├── wasm/           # WebAssembly 및 Next.js 데모
│   └── dart/           # Flutter FFI 및 예제 앱
└── tests/              # 통합 테스트 및 교차 플랫폼 검증
```

---

## 🧪 표준 통합 테스트 시나리오

본 프로젝트는 모든 플랫폼에서 동일한 결과를 보장하기 위해 두 가지 핵심 통합 시나리오를 제공합니다.

1.  **Ethereum Flow (5-Step)**: 니모닉 → 키 유도 → 주소 생성 → ECDSA 서명 → ECIES 암호화.
2.  **Modern DID Flow**: Ed25519 생성 → 서명 검증 → X25519 변환 → X25519 ECIES 암호화.

---

<p align="center"><a href="https://mattr.global" target="_blank"><img height="40px" src ="./docs/assets/mattr-logo-tm.svg"></a></p>
<p align="center">Licensed under the Apache License, Version 2.0. <br/>
This project is a fork of and extends <a href="https://github.com/mattrglobal/pairing_crypto">mattrglobal/pairing_crypto</a>, originally developed by MATTR Limited.</p>
