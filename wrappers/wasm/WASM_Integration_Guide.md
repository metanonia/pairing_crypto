# WASM 연동 가이드

이 문서는 `pairing_crypto` Rust 라이브러리를 WASM으로 빌드하여 브라우저 및 Node.js에서 연동하는 방법을 설명합니다.

---

## 1. 라이브러리 빌드 및 준비

WASM 라이브러리를 사용하기 위해서는 먼저 `wasm-pack`을 사용하여 Rust 코드를 컴파일해야 합니다.

### 환경 준비
- [Rust](https://rustup.rs/) 설치 (최신 버전 권장)
- **wasm-pack** 설치: `cargo install wasm-pack` 명령어로 설치하거나, [공식 설치 가이드](https://rustwasm.github.io/wasm-pack/installer/)를 참조하세요.

### 빌드 명령어
`wrappers/wasm` 디렉토리에서 아래 명령어를 실행합니다.

```bash
cd wrappers/wasm

# 1. 의존성 및 wasm-pack 자동 설치 시도
yarn setup

# 2. 릴리즈 모드로 빌드 (lib/ 폴더에 결과물 생성)
yarn build
```

---

## 💡 macOS에서의 빌드 오류 해결 (LLVM 사용)

macOS의 기본 컴파일러(`Apple Clang`)는 WASM 타겟을 지원하지 않아, 빌드 시 `unable to create target...`과 같은 오류가 발생할 수 있습니다. 이 경우 아래와 같이 **Homebrew로 설치한 LLVM**을 사용하는 것이 가장 간편합니다.

1.  **LLVM 설치**: 
    ```bash
    brew install llvm
    ```

2.  **LLVM 버전 Clang을 이용해 빌드**:
    자신의 Mac 사양(Apple Silicon vs Intel)에 맞는 경로를 확인한 후 환경 변수를 지정하여 빌드합니다.

    - **Apple Silicon (M1/M2/M3)**:
      ```bash
      CC=/opt/homebrew/opt/llvm/bin/clang yarn build
      ```
    - **Intel Mac (x86_64)**:
      ```bash
      CC=/usr/local/opt/llvm/bin/clang yarn build
      ```

> [!TIP]
> `emcc` (Emscripten) 설치가 이미 되어 있다면 `CC=emcc yarn build` 명령어로도 동일하게 해결 가능합니다.

빌드가 완료되면 `lib/` 폴더에 다음과 같이 생성됩니다:
- `lib/node/`: Node.js용 (CommonJS)
- `lib/web/`: 웹 브라우저용 (ES Modules)

---

## 2. 프로젝트에 연동하기

### Node.js 환경
`package.json`에 빌드된 패키지를 추가하거나 직접 참조합니다.

```javascript
const { bbs } = require("@mattrglobal/pairing-crypto");
```

### 웹 브라우저 (React, Vue, Plain JS 등)
WASM 모듈은 비동기적으로 로드되거나 별도의 설정이 필요할 수 있습니다.

```javascript
import { bbs } from "@mattrglobal/pairing-crypto";
```

---

## 3. 상세 API 사용 예제 (BBS)

WASM 래퍼는 모든 결과를 `Promise`로 반환하며, 바이너리 데이터는 `Uint8Array`를 사용합니다.

### 🔑 키 쌍 생성 (Key Generation)
BBS 서명에 사용할 공개키와 비밀키 쌍을 생성합니다.

```typescript
const keyPair = await bbs.bls12381_sha256.generateKeyPair({
  ikm: new Uint8Array(32).fill(1), // 32바이트 시드(IKM)
  keyInfo: new Uint8Array(0),      // 선택적 추가 정보
});

console.log("Secret Key:", keyPair.secretKey);
console.log("Public Key:", keyPair.publicKey);
```

### ✍️ 여러 메시지에 대한 서명 생성 (Sign)
동일한 공개키 하에 여러 개의 메시지를 한 번에 서명합니다.

```typescript
const messages = [
  new TextEncoder().encode("메시지 1"),
  new TextEncoder().encode("메시지 2"),
];

const signature = await bbs.bls12381_sha256.sign({
  secretKey: keyPair.secretKey,
  publicKey: keyPair.publicKey,
  messages: messages,
  header: new TextEncoder().encode("공개 헤더"), // 선택 사항
});
```

### ✅ 서명 검증 (Verify)
원본 메시지들과 서명을 사용하여 유효성을 검증합니다.

```typescript
const result = await bbs.bls12381_sha256.verify({
  publicKey: keyPair.publicKey,
  signature: signature,
  messages: messages,
  header: new TextEncoder().encode("공개 헤더"),
});

console.log("검증 결과:", result.verified); // true or false
```

### 🛡️ 선택적 공개 및 증명 생성 (Selective Disclosure)
전체 메시지 중 일부만 공개하면서도 서명이 유효함을 입증하는 증명(Proof)을 생성합니다.

```typescript
// 첫 번째 메시지만 공개하고 두 번째는 숨김
const proofMessages = [
  { value: messages[0], reveal: true },
  { value: messages[1], reveal: false },
];

const proof = await bbs.bls12381_sha256.deriveProof({
  publicKey: keyPair.publicKey,
  signature: signature,
  messages: proofMessages,
  presentationHeader: new TextEncoder().encode("프레젠테이션 헤더"),
});
```

### 🔬 증명 검증 (Verify Proof)
검증자는 공개된 메시지만을 가지고 증명의 유효성을 확인합니다.

```typescript
const result = await bbs.bls12381_sha256.verifyProof({
  publicKey: keyPair.publicKey,
  proof: proof,
  messages: { 0: messages[0] }, // 인덱스 0의 메시지만 공개됨
  presentationHeader: new TextEncoder().encode("프레젠테이션 헤더"),
});

console.log("증명 검증 결과:", result.verified);
```

---

## 4. HD Wallet 및 ECIES 사용 예제

WASM 래퍼를 통해 브라우저나 Node.js에서 HD Wallet 및 ECIES 기능을 사용하는 방법입니다.

### 💳 HD Wallet (BIP32/39/44)
```typescript
import { hwallet_generate_mnemonic, hwallet_mnemonic_to_seed, hwallet_derive_private_key, hwallet_eth_address_from_pubkey, ecies_keypair_from_bytes } from "@mattrglobal/pairing-crypto";

// 1. 니모닉 생성
const mnemonic = await hwallet_generate_mnemonic();

// 2. 시드 유도
const seed = await hwallet_mnemonic_to_seed(mnemonic, "password");

// 3. 개인키 파생 (Ethereum 예시)
const privKey = await hwallet_derive_private_key(seed, "m/44'/60'/0'/0/0");

// 4. 이더리움 주소 생성
const keyPair = await ecies_keypair_from_bytes(privKey);
const address = await hwallet_eth_address_from_pubkey(keyPair.public_key);
console.log("ETH Address:", address);

// 5. ECDSA 서명 및 주소 복구 (ecrecover)
const message = new TextEncoder().encode("Integration test message");
const signature = await hwallet_sign_ecdsa_eth(privKey, message);
const recoveredAddr = await hwallet_recover_eth_address(message, signature);
console.log("Recovered Address:", recoveredAddr);
```

### 🔒 ECIES (secp256k1 암호화)
```typescript
import { ecies_encrypt, ecies_decrypt, ecies_keypair_from_bytes } from "@mattrglobal/pairing-crypto";

// 1. 키쌍 복구 (32바이트 개인키 기준)
const keyPair = await ecies_keypair_from_bytes(privKey);

// 2. 공개키로 암호화
const msg = new TextEncoder().encode("Hello ECIES");
const encrypted = await ecies_encrypt(keyPair.public_key, msg);

// 3. 개인키로 복호화
const decrypted = await ecies_decrypt(keyPair.secret_key, encrypted);
console.log(new TextDecoder().decode(decrypted)); // "Hello ECIES"
```

### 🧬 Ed25519 to X25519 (키 변환 및 ECIES)
Ed25519 서명 키를 X25519 암호화 키로 변환하여 ECIES를 수행하는 방법입니다.

```typescript
import { ed25519_keypair_from_seed, ed25519_sk_to_x25519, ed25519_pk_to_x25519, ecies_x25519_encrypt, ecies_x25519_decrypt } from "@mattrglobal/pairing-crypto";

// 1. Ed25519 키 생성 및 변환
const seed = new Uint8Array(32); // window.crypto.getRandomValues(seed)
const edKp = await ed25519_keypair_from_seed(seed);

const xsk = await ed25519_sk_to_x25519(edKp.secret_key);
const xpk = await ed25519_pk_to_x25519(edKp.public_key);

// 2. 변환된 X25519 키로 ECIES 수행
const msg = new TextEncoder().encode("Hello X25519");
const encrypted = await ecies_x25519_encrypt(xpk, msg);
const decrypted = await ecies_x25519_decrypt(xsk, encrypted);
```

---

## 5. 통합 테스트 시나리오 (Ethereum 기반)

1.  **키 쌍 파생**: 니모닉 시드로부터 BIP44 경로(`m/44'/60'/0'/0/i`)를 따라 3개의 키 쌍 생성.
2.  **ETH 주소 생성**: 각 키 쌍의 공개키로부터 이더리움 표준 주소 도출.
3.  **ECDSA 서명**: 첫 번째 키(index 0)를 사용하여 메시지 서명.
4.  **주소 복구**: 서명과 메시지로부터 이더리움 주소 복구(ecrecover) 및 일치 여부 확인.
5.  **ECIES 통신**: 키 쌍 간 암호화 및 복호화 수행.

> [!TIP]
> 상세 구현 로직은 `wrappers/wasm/example/src/components/bbs-demo.tsx`의 `runIntegrationTest` 함수를 참고하세요.

---

## 6. Ed25519 통합 테스트 플로우

1.  **Ed25519 키 생성**: 랜덤 시드로부터 Ed25519 키 쌍 생성.
2.  **서명 및 검증**: 생성된 키로 메시지 서명 및 유효성 검증.
3.  **X25519 변환**: Ed25519 키를 X25519 키로 변환.
4.  **X25519 ECIES**: 변환된 키를 사용하여 암복호화 수행.

> [!TIP]
> 상세 구현 로직은 `bbs-demo.tsx`의 `runEd25519Flow` 함수를 참고하세요.

---

## 6. 💡 유의 사항 및 팁

1.  **사이퍼슈트(Ciphersuite)**: 이 프로젝트는 `bls12381_sha256`과 `bls12381_shake256` 두 가지 모드를 지원합니다. 연동하려는 다른 시스템과 동일한 방식을 사용해야 합니다.

---

## 7. 🛠️ 트러블슈팅: Next.js 16+ (Turbopack) 빌드 및 경고 메시지

Next.js 16+ 버전에서 발생하는 주요 경고 및 설정 오류에 대한 대응 방법입니다.

### 1. 설정 오류: `invalid experimental key`
`next.config.ts`에 `experimental: { turbopack: { ... } }`와 같은 설정을 추가했을 때 `invalid experimental key` 오류가 발생할 수 있습니다.
- **해결책**: 라이브러리(`@mattrglobal/pairing-crypto/package.json`)의 `browser` 필드 수정이 이미 완료되었으므로, **`next.config.ts`의 모든 커스텀 설정을 제거**하고 기본값으로 사용하세요. 이제 특수 설정 없이도 Turbopack이 라이브러리를 올바르게 인식합니다.

### 2. 경고: `Next.js inferred your workspace root`
파일 구조상 여러 개의 lockfile(`yarn.lock`, `package-lock.json`)이 감지되어 발생하는 경고입니다.
- **원인**: `wrappers/wasm`에 `yarn.lock`이 있고, `example` 폴더에 `package-lock.json`이 있어 Next.js가 어떤 것을 루트로 삼을지 혼란스러워하는 것입니다.
- **해결책**:
    - **단순 경고 무시**: 애플리케이션 동작에는 전혀 지장이 없으므로 무시해도 안전합니다.
    - **경고 제거**: `wrappers/wasm/example`의 `package-lock.json`을 삭제하고 상위 디렉토리의 패키지 매니저(Yarn 등)를 통합하여 사용하거나, `npm run dev -- --turbopack-root .`와 같이 명시적으로 루트를 지정할 수 있습니다.

---

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서만 Node.js 모듈(fs 등)을 무시하도록 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

---

## 7. Next.js 예제 프로젝트

`wrappers/wasm/example` 디렉토리에 Next.js 기반의 예제 프로젝트가 포함되어 있습니다.

### 주요 기능
1.  **BBS 연동**: 키 생성, 서명, 영지식 증명 로직 포함.
2.  **WASM 비동기 로딩**: 클라이언트 사이드에서 WASM 모듈을 로딩하는 구현 패턴 제공.
3.  **통합 테스트 검증**: Ethereum 및 Ed25519 기반 통합 테스트 시나리오 포함.

### 🔗 WASM 라이브러리 연동 원리 (Next.js)

예제 프로젝트가 로컬의 WASM 라이브러리와 연동되는 방식은 크게 두 가지 핵심 포인트로 구성됩니다.

#### 1. 로컬 패키지 참조 (`package.json`)
전용 `package.json` 파일에서 상위 디렉토리의 빌드 결과물을 직접 참조하도록 설정되어 있습니다. 이를 통해 별도의 `npm publish` 과정 없이도 개발 중인 라이브러리를 즉시 테스트할 수 있습니다.

```json
"dependencies": {
  "@mattrglobal/pairing-crypto": "file:../."
}
```

#### 2. 클라이언트 사이드 동적 임포트 (Dynamic Import)
WASM 모듈은 브라우저 환경에서만 동작하는 특징이 있습니다. Next.js의 SSR(Server-Side Rendering) 환경에서 발생할 수 있는 충돌을 방지하기 위해, `useEffect` 훅 내부에서 **비동기 동적 임포트**를 사용하여 클라이언트 사이드에서만 안전하게 라이브러리를 로드합니다.

```typescript
// src/components/bbs-demo.tsx 예시
useEffect(() => {
  const initWasm = async () => {
    // 💡 클라이언트 사이드에서 비동기적으로 WASM 패키지 로드
    const pkg = await import("@mattrglobal/pairing-crypto");
    const bbs = pkg.bbs;
    setIsLoaded(true);
  };
  initWasm();
}, []);
```

---

### 🛠️ 실행 방법
1.  **WASM 라이브러리 빌드**: 
    `wrappers/wasm` 디렉토리에서 `yarn build`를 실행하여 `lib/` 폴더를 준비합니다.
2.  **예제 프로젝트 설정**:
    ```bash
    cd wrappers/wasm/example
    npm install
    ```
3.  **개발 서버 시작**:
    ```bash
    npm run dev
    ```
4.  **확인**: 브라우저에서 `http://localhost:3000`에 접속하여 BBS 암호화 및 **5단계 종합 통합 테스트**의 전 과정을 직접 확인해 보세요.
