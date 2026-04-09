# WASM 연동 가이드

`pairing_crypto` Rust 라이브러리를 WASM으로 빌드하여 브라우저 및 Node.js에서 사용하는 방법을 설명합니다.

---

## 1. 빌드 준비

### 환경 구축
- **Rust**: [rustup.rs](https://rustup.rs/) (최신 버전)
- **wasm-pack**: `cargo install wasm-pack` 또는 [설치 가이드](https://rustwasm.github.io/wasm-pack/installer/) 참조

### 빌드 실행
`wrappers/wasm` 경로에서 실행:

```bash
cd wrappers/wasm

# 1. 의존성 및 wasm-pack 자동 설치 시도
yarn setup

# 2. 릴리즈 모드로 빌드 (lib/ 폴더에 결과물 생성)
yarn build
```

---

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

## 2. 프로젝트 연동

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

## 3. API 사용 예제 (BBS)

WASM 래퍼는 모든 결과를 `Promise`로 반환하며 데이터는 `Uint8Array`를 사용합니다.

### 🔑 1. 키 쌍 생성 (Key Generation)
BBS 공개키/비밀키 쌍 생성:

```typescript
const keyPair = await bbs.bls12381_sha256.generateKeyPair({
  ikm: new Uint8Array(32).fill(1), // 32바이트 시드(IKM)
  keyInfo: new Uint8Array(0),      // 선택적 추가 정보
});

console.log("Public Key:", keyPair.publicKey);
```

### ✍️ 2. 서명 생성 (Sign)
동일 공개키로 다수 메시지 서명:

```typescript
const messages = [
  new TextEncoder().encode("메시지 1"),
  new TextEncoder().encode("메시지 2"),
];

const signature = await bbs.bls12381_sha256.sign({
  secretKey: keyPair.secretKey,
  publicKey: keyPair.publicKey,
  messages: messages,
});
```

### ✅ 3. 서명 검증 (Verify)
원본 메시지와 서명을 통한 유효성 검증:

```typescript
const result = await bbs.bls12381_sha256.verify({
  publicKey: keyPair.publicKey,
  signature: signature,
  messages: messages,
});
```

### 🛡️ 4. 영지식 증명 (Selective Disclosure)
메시지 일부만 공개하고 서명 유효성을 증명(Proof)함.

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

### 🔬 5. 증명 검증 (Verify Proof)
공개된 메시지로 증명 유효성 확인:

```typescript
const result = await bbs.bls12381_sha256.verifyProof({
  publicKey: keyPair.publicKey,
  proof: proof,
  messages: { 0: messages[0] }, // 인덱스 0의 메시지만 공개됨
  presentationHeader: new TextEncoder().encode("프레젠테이션 헤더"),
});
```

---

## 4. Ed25519 및 X25519 예제

### ✍️ 1. Ed25519 서명
```typescript
import { ed25519_keypair_from_seed, ed25519_sign, ed25519_verify } from "@mattrglobal/pairing-crypto";

const seed = new Uint8Array(32); 
const kp = await ed25519_keypair_from_seed(seed);
const sig = await ed25519_sign(kp.secret_key, new TextEncoder().encode("Hello"));
const valid = await ed25519_verify(kp.public_key, new TextEncoder().encode("Hello"), sig);
```

### 🧬 2. X25519 변환 (Birational Equivalence)
```typescript
import { ed25519_sk_to_x25519, ed25519_pk_to_x25519 } from "@mattrglobal/pairing-crypto";

const xsk = await ed25519_sk_to_x25519(kp.secret_key);
const xpk = await ed25519_pk_to_x25519(kp.public_key);
```

### 🔒 3. X25519 ECIES 암호화
```typescript
import { ecies_x25519_encrypt, ecies_x25519_decrypt } from "@mattrglobal/pairing-crypto";

const encrypted = await ecies_x25519_encrypt(xpk, new TextEncoder().encode("Secret"));
const decrypted = await ecies_x25519_decrypt(xsk, encrypted);
```

## 5. HD Wallet 및 ECIES (k256) 예제

### 💳 1. HD Wallet (Ethereum)
```typescript
import { hwallet_generate_mnemonic, hwallet_mnemonic_to_seed, hwallet_derive_private_key, hwallet_eth_address_from_pubkey } from "@mattrglobal/pairing-crypto";

const mnemonic = await hwallet_generate_mnemonic();
const seed = await hwallet_mnemonic_to_seed(mnemonic, "");
const privKey = await hwallet_derive_private_key(seed, "m/44'/60'/0'/0/0");
const addr = await hwallet_eth_address_from_pubkey((await ecies_keypair_from_bytes(privKey)).public_key);
```

### 🔒 2. ECIES (secp256k1)
```typescript
import { ecies_encrypt, ecies_decrypt } from "@mattrglobal/pairing-crypto";

const encrypted = await ecies_encrypt(publicKey, msg);
const decrypted = await ecies_decrypt(secretKey, encrypted);
```

---

## 6. 통합 테스트 (Ethereum Flow)

Go 예제와 동일한 5단계 표준 통합 테스트 절차입니다.

1.  **키 쌍 파생**: 니모닉 시드로부터 BIP44 경로(`m/44'/60'/0'/0/i`)로 3개 키 유도.
2.  **ETH 주소 생성**: 각 공개키로부터 이더리움 표준 주소 도출.
3.  **ECDSA 서명**: 첫 번째 키(Index 0)로 메시지 서명.
4.  **주소 복구**: 서명과 메시지로부터 `ecrecover`를 통해 주소 일치 여부 확인.
5.  **ECIES 통신**: 두 번째 키(Index 1)의 공개키로 암호화하고 개인키로 복호화.

## 7. 통합 테스트 (Ed25519 Flow)

1.  **Ed25519 키 생성**: 랜덤 시드로 키 쌍 생성.
2.  **서명 및 검증**: Ed25519 서명 후 유효성 검증.
3.  **X25519 변환**: Ed25519 키를 X25519 키로 변환.
4.  **X25519 ECIES**: 변환된 키를 사용하여 암복호화 수행.

---

## 8. 💡 유의 사항 및 팁

1.  **사이퍼슈트(Ciphersuite)**: `bls12381_sha256`과 `bls12381_shake256` 지원. 타 서비스와 동일 모드 사용 필수.

---

## 9. 🛠️ 트러블슈팅: Next.js 16+ (Turbopack)

Next.js 16+ 버전의 경고 및 설정 오류 대응 방법.

### 1. `invalid experimental key` 오류
- **원인**: `next.config.ts`의 `experimental: { turbopack: { ... } }` 설정 충돌.
- **해결**: 라이브러리의 `browser` 필드가 수정되었으므로, **`next.config.ts`의 커스텀 설정을 삭제**하고 기본값으로 사용.

### 2. `Next.js inferred your workspace root` 경고
- **원인**: `wrappers/wasm`(`yarn.lock`)과 `example`(`package-lock.json`)의 lockfile 중복.
- **해결**:
    - **무시**: 동작에 지장 없음.
    - **제거**: `example/package-lock.json` 삭제 후 통합 사용, 또는 `--turbopack-root .` 옵션 사용.

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

## 10. Next.js 예제 프로젝트

`wrappers/wasm/example`에서 Next.js 예제를 확인할 수 있습니다.

### 주요 기능
- **BBS 연동**: 키 생성, 서명, 영지식 증명 구현.
- **WASM 비동기 로딩**: 클라이언트 사이드 로딩 패턴.
- **통합 테스트**: Ethereum 및 Ed25519 시나리오 포함.

### 🔗 WASM 연동 원리 (Next.js)

#### 1. 로컬 패키지 참조 (`package.json`)
상위 디렉토리 빌드 결과물을 `file:../.`로 참조하여 즉시 테스트 가능.

```json
"dependencies": {
  "@mattrglobal/pairing-crypto": "file:../."
}
```

#### 2. 클라이언트 사이드 동적 임포트 (Dynamic Import)
WASM은 브라우저에서만 동작하므로, CSR을 위해 `useEffect` 내에서 **비동기 동적 임포트**를 사용합니다.

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
1.  **WASM 빌드**: `wrappers/wasm`에서 `yarn build` 실행.
2.  **설치 및 시작**:
    ```bash
    cd wrappers/wasm/example
    npm install
    npm run dev
    ```
3.  **확인**: `http://localhost:3000`에서 BBS 및 **5단계 통합 테스트** 결과 확인.

---

## 🛠️ 유지보수: 새로운 API 추가 시 주의사항

Rust 코어 라이브러리에 새로운 기능이나 API가 추가될 경우, WASM 환경에서 이를 사용하기 위해 다음의 **JS 브릿지 레이어**를 수동으로 업데이트해야 합니다.

1.  **`src/js/index.web.js`**: 웹(Web) 환경을 위한 메서드 노출 및 초기화 로직 추가.
2.  **`src/js/index.js`**: Node.js 및 일반 JS 환경을 위한 메서드 노출.
3.  **`src/js/index.d.ts`**: 새로운 API에 대한 TypeScript 타입 정의 추가.

이 파일들을 업데이트한 후, `wrappers/wasm` 경로에서 `npm run build`를 실행하여 `lib/` 디렉토리에 최종 결과물을 반영해야 합니다.
