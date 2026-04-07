# Pairing Cryptography (페어링 기반 암호학 라이브러리)

[![MATTR](./docs/assets/mattr-logo-square.svg)](https://github.com/mattrglobal)

## 원본 소스: [https://github.com/mattrglobal/pairing_crypto](https://github.com/mattrglobal/pairing_crypto)
## 각 언어별(Dart, Go, WASM, Java) 상세 연동 가이드는 `wrappers/` 디렉토리를 참조하세요.

---

이 라이브러리는 [Rust](rust-lang.org)로 작성된 [페어링 기반 암호학(Pairing-based cryptography)](https://en.wikipedia.org/wiki/Pairing-based_cryptography)을 쉽고 간편하게 사용할 수 있도록 제공하는 원스톱 솔루션입니다.

**주의**: 이 라이브러리는 아직 독립적인 구현 보안 감사를 거치지 않았습니다.

## 지원되는 타원 곡선 (Supported Curves)

- [BLS 12-381](https://tools.ietf.org/html/draft-irtf-cfrg-pairing-friendly-curves-09#section-4.2.1)

[CFRG](https://irtf.org/cfrg)에서 발표한 더 상세한 목록은 [여기](https://tools.ietf.org/html/draft-irtf-cfrg-pairing-friendly-curves-09)를 참조하세요.

## 지원되는 서명 알고리즘 (Supported Signature Algorithms)

- [BBS Signatures draft-03](https://www.ietf.org/archive/id/draft-irtf-cfrg-bbs-signatures-03.html)

## 기여 가이드 (Contribution Guide)

이 프로젝트에 기여하고 싶으시다면 [기여 가이드](./docs/CONTRIBUTING.md)를 확인해 주세요 (영문).

## 저장소 구조 (Repository Structure)

프로젝트의 전체적인 구조는 다음과 같습니다:

```
├── src - 주요 소스 코드 폴더
│   ├ common - 공통 기능 및 유틸리티
│   ├ curves - 라이브러리에서 지원하는 다양한 페어링 기반 타원 곡선 정의
│   └ schemes - 라이브러리에서 지원하는 다양한 암호화 스킴 (예: BBS 서명) 정의
│   └ tests - 유닛 테스트
├── tests - 통합 테스트 (스킴의 공개 API 테스트)
├── wrappers - 다른 언어를 위한 바인딩 (Go, WASM, Java, Dart 등)
├── benches - 벤치마크 테스트
```

## 보안 정책 (Security Policy)

보안 관련 문제에 대한 책임 있는 공개 절차 등 상세 내용은 [보안 정책](./SECURITY.md)을 참조하세요.

---

<p align="center"><a href="https://mattr.global" target="_blank"><img height="40px" src ="./docs/assets/mattr-logo-tm.svg"></a></p><p align="center">Copyright © MATTR Limited. <a href="./LICENSE">Some rights reserved.</a><br/>“MATTR”은 뉴질랜드 및 기타 국가에 등록된 MATTR Limited의 상표입니다.</p>
