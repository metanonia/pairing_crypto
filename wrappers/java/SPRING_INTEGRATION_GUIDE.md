# Spring Boot 통합 및 사용 가이드

이 문서는 `pairing_crypto` Rust 라이브러리를 Java/Spring Boot 환경에서 JNI(Java Native Interface)를 통해 연동하고, REST API 서버를 구축하는 방법을 설명합니다.

---

## 1. 사전 준비 및 빌드

Java에서 Rust 기능을 사용하려면 먼저 Rust 코드를 JNI 호환 라이브러리(`.so`, `.dylib`, `.dll`)로 빌드해야 합니다.

### 환경 준비
- **JDK 17 이상** (Spring Boot 3.x 권장)
- **Rust** 설치
- **Gradle** (프로젝트 빌드용)

### 네이티브 라이브러리 빌드
`wrappers/java` 디렉토리에서 제공되는 스크립트를 사용하여 현재 플랫폼 또는 타겟 OS에 맞는 JNI 라이브러리를 빌드합니다.

```bash
# 기본 사용법: ./scripts/build_all.sh <PLATFORM> <OUTPUT_LOCATION>
cd wrappers/java
```

#### 💻 현재 플랫폼 (Self Build)
현재 개발 중인 OS 환경에 맞춰 즉시 사용 가능한 라이브러리를 빌드합니다.
```bash
./scripts/build_all.sh SELF build/native
```
*결과물: `build/native/release/libpairing_crypto_jni.[so|dylib|dll]`*

#### 🍏 macOS
Intel 및 Apple Silicon 환경을 위한 라이브러리를 빌드합니다.
```bash
./scripts/build_all.sh MACOS build/native
```

#### 🐧 Linux
Linux x86_64 환경을 위한 공유 라이브러리(`.so`)를 빌드합니다.
```bash
./scripts/build_all.sh LINUX build/native
```

#### 🪟 Windows
Windows x86_64 환경을 위한 동적 라이브러리(`.dll`)를 빌드합니다. (MSVC 툴체인 필요)
```bash
./scripts/build_all.sh WINDOWS build/native
```

#### 🤖 Android
Android 앱 개발을 위해 다양한 아키텍처(arm64, v7a, x86 등)용 라이브러리를 한 번에 빌드합니다. (Android NDK 설치 필요)
```bash
./scripts/build_all.sh ANDROID build/native
```

빌드가 완료되면 지정한 `<OUTPUT_LOCATION>` 경로에 각 플랫폼별 바이너리가 생성됩니다.

---

## 2. JNI 브릿지 (`wrappers/java/jni`)의 역할

자바는 다른 언어(Go, Flutter 등)와 달리 별도의 러스트 브릿지 소스코드를 관리합니다. 그 이유는 다음과 같습니다:

1.  **JNI 명명 규칙 준수**: JVM이 네이티브 함수를 식별하려면 `Java_패키지명_클래스명_메소드명`과 같은 엄격한 명명 규칙을 따라야 합니다.
2.  **데이터 타입 변환**: 자바의 `jbyteArray`, `jlong` 등 특수 타입을 러스트의 데이터 구조(`Vec<u8>`, `u64` 등)와 안전하게 매핑하기 위한 계층이 필요합니다.
3.  **공통 API 보호**: 이 브릿지 계층은 오직 자바만을 위한 인터페이스이며, 내부적으로는 **공통 C API (`wrappers/c`)를 호출**하는 구조로 설계되어 있습니다. 따라서 공통 로직을 건드리지 않고도 자바 특유의 요구사항을 처리할 수 있습니다.

---

## 3. 프로젝트 설정 (`settings.gradle` & `build.gradle`)

로컬에 위치한 `pairing_crypto` 프로젝트를 의존성으로 추가하려면 두 가지 설정이 동시 필요합니다. 그레이들은 소스 위치를 자동으로 알지 못하기 때문에 `settings.gradle`에서 위치를 지정해 주어야 합니다.

### `settings.gradle` 설정 (프로젝트 위치 등록)
프로젝트 루트의 `settings.gradle`에서 라이브러리 소스의 실제 경로를 지정합니다.

```gradle
// 'pairing_crypto'라는 이름으로 프로젝트 포함
include(':pairing_crypto')

// 해당 프로젝트의 실제 물리적 위치 지정 (현재 폴더의 상위 디렉토리 예시)
project(':pairing_crypto').projectDir = new File(settingsDir, '..')
```

### `build.gradle` 설정 (의존성 추가)
위에서 등록한 이름을 사용하여 의존성을 추가합니다.

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    
    // settings.gradle에서 정의한 이름을 참조하여 로컬 프로젝트 연결
    implementation project(':pairing_crypto')
}
```

---

## 4. 상세 API 사용 예제 (BBS)

스프링 부트 환경에서의 BBS 활용 예시입니다.

### 🔑 네이티브 라이브러리 로드 및 서비스 구성
Spring의 `@Service`를 사용하여 라이브러리를 싱글톤으로 관리하는 것이 좋습니다.

```java
@Service
public class BbsService {
    private final Bls12381Sha256 bbs = new Bls12381Sha256();

    // 키 생성
    public KeyPair generateKeys(byte[] ikm, byte[] keyInfo) throws Exception {
        return bbs.generateKeyPair(ikm, keyInfo);
    }

    // 서명 생성
    public byte[] sign(byte[] secretKey, byte[] publicKey, byte[] header, byte[][] messages) throws Exception {
        return bbs.sign(secretKey, publicKey, header, messages);
    }
}
```

### 🛡️ 영지식 증명 및 선택적 공개 (ZKP)
특정 인덱스의 메시지만 공개하는 Proof를 생성하고 검증합니다.

```java
// 증명 생성 (1번 메시지만 공개)
HashSet<Integer> disclosedIndices = new HashSet<>();
disclosedIndices.add(1); 
byte[] proof = bbs.createProof(publicKey, header, ph, signature, true, disclosedIndices, messages);

// 증명 검증
HashMap<Integer, byte[]> revealedMessages = new HashMap<>();
revealedMessages.put(1, messages[1]);
boolean isValid = bbs.verifyProof(publicKey, header, ph, proof, revealedMessages);
```

---

## 5. 예제 서버 실행 (`wrappers/java/example`)

제공된 예제 프로젝트를 통해 실제 동작을 확인할 수 있습니다.

### 1. 실행 명령어
JNI 라이브러리 경로를 `java.library.path`로 지정해야 합니다.

```bash
cd wrappers/java/example
./gradlew bootRun -Djava.library.path=../build/native
```

### 2. 주요 REST 엔드포인트
- `GET /api/bbs/keys`: 신규 키 쌍 생성
- `POST /api/bbs/sign`: 메시지 서명 (JSON body)
- `POST /api/bbs/verify`: 서명 검증
- `POST /api/bbs/proof/derive`: 선택적 공개 증명 생성
- `POST /api/bbs/proof/verify`: 증명 검증

---

## 6. 유의 사항 (JVM)

1.  **Library Path**: `System.loadLibrary("pairing_crypto_jni")`가 호출될 때 해당 라이브러리 파일이 환경 변수나 `java.library.path`에 반드시 존재해야 합니다.
2.  **Thread Safety**: `Bls12381Sha256` 인스턴스는 멀티스레드 환경에서 안전하게 설계되어 있으나, 컨텍스트 기반 연산 시 핸들 관리에 유의하세요.
3.  **Deployment**: 실제 서버 배포 시 대상 OS(Linux 등)용 라이브러리를 빌드하여 포함시켜야 합니다.
