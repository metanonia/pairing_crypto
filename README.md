# DID 관련 암호 라이브러리


## 원본 소스: [https://github.com/mattrglobal/pairing_crypto](https://github.com/mattrglobal/pairing_crypto)
## 각 언어별(Dart, Go, WASM, Java) 상세 연동 가이드는 `wrappers/` 디렉토리를 참조.

### go, flutter, wasm, java(spring) 연동을 위한 추가 작업 및 각 언어별 샘플 예제 작업
### hdwallet, secp256k 서명 기능 추가 및 예제 작업
### ecies 암호화 기능 추가 및 예제 작업

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
