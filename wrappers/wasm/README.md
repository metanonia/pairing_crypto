# WASM 래퍼 (WASM Wrapper)

이 디렉토리는 "pairing crypto" 크레이트의 WASM 기반 컴파일 결과물과 웹 및 Node.js 환경에서 인터페이스하기 위한 자바스크립트 API를 포함하고 있습니다.

## 참고 (Note)

macOS에서 개발 중인 경우, 빌드 시 컴파일 오류가 발생하지 않도록 [emcc](https://emscripten.org/)를 설치하고 `CC` 환경 변수를 `emcc`로 설정하여 실행해야 할 수 있습니다 (예: `CC=emcc yarn build`).