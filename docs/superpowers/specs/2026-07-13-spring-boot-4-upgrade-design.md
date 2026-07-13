# Spring Boot 4 업그레이드 설계 — 2026-07-13

## 1. 개요

DumpIt 백엔드를 **Spring Boot 3.4.1 → 4.1.x**로 올린다. 동기는 EOL 대응: 3.4는 2025-12-31, **3.5도 2026-06-30 OSS EOL**이라 지원 라인은 4.x뿐이다(4.1은 2026-06 출시). 감사 결과 현재 악용 가능한 CVE는 0건이므로 "당장의 구멍"이 아니라 미래 보안 패치 확보가 목적이다.

이것은 기능 추가가 아니라 **호환성 마이그레이션**이다. 앱의 아키텍처·동작은 그대로 유지하고, 프레임워크 메이저 업그레이드에 따른 breaking change만 대응한다. 방금 구축한 **API 통합 테스트 278개**가 회귀 안전망이다.

### 확정된 결정 사항

| 결정 | 내용 |
|---|---|
| 목표 버전 | **Spring Boot 4.1.x** (구현 시점 최신 패치로 핀). 3.5는 이미 EOL이라 경유하지 않음 |
| 방법 | **A안: OpenRewrite 공식 Boot 4 마이그레이션 레시피 + 수동 보정** — 기계적 변경(패키지 리네임·설정 키·deprecated API)은 도구가, 의미적 판단(Jackson catch 의미 변화·Security 7·의존성 아티팩트 교체)은 수동 |
| Java | **21 유지**(Boot 4는 17+ 요구, 변경 불필요) |
| 검증 | 3층 — ① 278 테스트 + CI 그린, ② 로컬 실행 스모크(실제 구글 OAuth·AI·캘린더), ③ 배포 후 prod 로그인 스모크 |
| 브랜치 | `feature/spring-boot-4`(dev 분기), 문제 시 revert 용이 |

## 2. 변경 범위 (이 앱에 실제로 걸리는 것)

조사로 확인된, DumpIt에 해당하는 breaking change만 다룬다(3.5→4.0 전체 115건 중 우리 스택에 해당하는 것).

### 2.1 빌드·플랫폼

- **Gradle 8.11.1 → 8.14+ 또는 9** (Boot 4 요구). `gradle-wrapper.properties` 업그레이드.
- **Jakarta EE 10 → 11 (Servlet 6.1)** — Boot BOM이 처리, 명시적 코드 변경은 대개 없음(그러나 jakarta.* import 사용처가 새 API와 어긋나면 보정).
- `io.spring.dependency-management` 플러그인은 Boot 4에서 역할 축소/변경 가능 — Boot 4 gradle 플러그인 규약에 맞춰 조정.

### 2.2 Jackson 2 → 3 (가장 큰 변경)

- 패키지 이동: `com.fasterxml.jackson.databind/core` → **`tools.jackson`** (단 `jackson-annotations`는 `com.fasterxml.jackson.annotation` 유지).
- **예외 계층 변화**: Jackson 2의 `JsonProcessingException extends IOException` → Jackson 3의 `JacksonException extends RuntimeException`. 따라서 **Jackson 호출을 감싼 `catch (IOException)` 블록이 더 이상 Jackson 예외를 못 잡는다** → 시그니처·catch 조정 필요.
- 기본 동작 차이: 커스텀 날짜 포맷, null 필드 처리, BigDecimal 직렬화가 미세하게 다름 — 응답 shape 회귀는 278 테스트가 잡는다.
- **Jackson 직접 사용 파일(8개, 전수 점검 대상)**:
  - `config/SecurityConfig.java` — `ObjectMapper.writeValueAsString` (401/403 응답)
  - `config/AuthenticatedRequestGuardFilter.java` — `ObjectMapper.writeValueAsString` (밴/CSRF 응답)
  - `config/RedisOAuth2AuthorizedClientRepository.java` — **OAuth 토큰 직렬화** (주의: 포맷 변경 시 기존 Redis 세션 역직렬화 실패)
  - `service/impl/OpenAiServiceImpl.java`, `service/OpenAiService.java` — OpenAI 응답 파싱
  - `service/impl/GoogleCalendarServiceImpl.java` — 캘린더 응답 파싱
  - `service/impl/ActivityLogServiceImpl.java` — 활동 로그 직렬화
  - `controller/TaskController.java` — Jackson 타입 사용
  - 테스트: `ApiIntegrationTestBase`(`objectMapper.readTree`) 등 — 테스트 코드도 Jackson 3로 이관

### 2.3 Spring Security 6.4 → 7

- deprecated API 제거. `config/SecurityConfig.java`(람다 DSL·oauth2Login·headers·exceptionHandling·`addFilterAfter`)와 `AuthenticatedRequestGuardFilter`·`RedisOAuth2AuthorizedClientRepository`를 Security 7 API로 보정.
- OAuth2 client(`spring-boot-starter-oauth2-client`) 관련 API 변화 점검 — 실제 로그인 플로우는 테스트 사각지대이므로 ②단계 수동 스모크로 검증.

### 2.4 의존성 아티팩트 교체

- **Sentry**: `io.sentry:sentry-spring-boot-starter-jakarta:8.40.0` → **`io.sentry:sentry-spring-boot-4:8.44.1+`**(구현 시점 최신 핀). `io.sentry.jvm.gradle` 플러그인(6.5.0)도 Boot 4 호환 버전으로 점검·조정.
- 나머지(web/jpa/security/oauth2/redis/session/validation/flyway/postgres/lombok)는 버전 미명시라 Boot 4 BOM이 자동 정렬 — 명시 핀 불필요.

## 3. 마이그레이션 방법 (A안 상세)

순서는 "도구로 일괄 → 수동 보정 → 테스트 그린 → 스모크"의 반복이다.

1. **선행**: Gradle 래퍼 8.14+/9로 업그레이드, 빌드 통과 확인(현행 3.4.1 상태에서).
2. **OpenRewrite 실행**: Spring 공식 Boot 4 업그레이드 레시피(`rewrite-spring`의 Boot 4.0 UpgradeSpringBoot recipe — 정확한 recipe ID·플러그인 버전은 구현 시 핀)를 gradle 플러그인으로 적용. 기계적 변경 자동화: 플러그인/BOM 버전 범프, Jackson 패키지 리네임, deprecated API 치환, 설정 프로퍼티 키 갱신.
3. **수동 보정**(도구가 못 잡는 것):
   - Jackson `catch (IOException)` → `JacksonException`(RuntimeException) 대응, 필요 시 throws 시그니처 정리.
   - Sentry 아티팩트 교체(`sentry-spring-boot-4`)·플러그인 버전.
   - Security 7 잔여 deprecated·시그니처 변화.
   - `RedisOAuth2AuthorizedClientRepository` Jackson 3 직렬화 확인.
4. **컴파일 통과 → `./gradlew test`** (278개) 그린까지 반복 수정.
5. **로컬 실행 스모크**(§4 ②).
6. 리뷰(코드 리뷰 + 보안 리뷰: auth/OAuth 변경 포함) → dev 머지.

## 4. 검증 전략 (3층)

278 테스트는 **API 계약·직렬화 shape·오류 메시지·인가**를 자동 검증하지만, **실제 OAuth 로그인·토큰 저장은 목이라 사각지대**다.

- **① 자동**: `./gradlew test` 278개 그린 + CI(신규 postgres 컨테이너) 그린. Jackson 3 응답 shape 변화·Security 인가 회귀는 여기서 잡힘.
- **② 로컬 실행 스모크**(수동, 필수 — 테스트 사각지대):
  - 실제 **구글 로그인 → /auth/me → 로그아웃** (Security 7 + OAuth client 검증)
  - **캘린더 연결·이벤트 조회** (구글 Jackson 3 파싱)
  - **브레인덤프/아이디어 AI 추출** (OpenAI Jackson 3 파싱)
  - 401/403 응답이 여전히 한글 JSON (SecurityConfig·가드필터 Jackson 3)
  - 밴/CSRF 가드 필터 동작(방금 추가분)
- **③ 배포 후**(main 푸시 시): prod 로그인 스모크. **기존 Redis OAuth 세션이 Jackson 3 포맷 변경으로 무효화될 수 있음** → 배포 노트에 "재로그인 필요 가능" 명시.

## 5. 리스크·롤백

- **Redis OAuth 세션 무효화**: Jackson 3 직렬화 포맷이 바뀌면 prod Redis에 저장된 기존 OAuth authorized client 역직렬화 실패 → 유저 재로그인(일시적, **데이터 손실 없음**). 허용 가능, 배포 노트 명시.
- **OAuth 로그인 회귀(테스트 사각지대)**: ②단계 수동 스모크로 방어. 스모크 실패 시 머지 보류.
- **롤백**: feature 브랜치 작업이라 dev 머지 전에는 영향 없음. 배포 후 문제 시 이전 main 커밋으로 재배포(Docker 이미지 재빌드).
- **OpenRewrite 과잉 변경**: 도구가 스타일·불필요 변경까지 할 수 있음 → 커밋 diff 리뷰로 걸러냄. OpenRewrite 커밋과 수동 보정 커밋을 분리해 리뷰 용이하게.

## 6. 범위 제외

- Java 25 등 최신 JDK 전환(21 유지 — Boot 4 요구 충족).
- 기능 변경·리팩터링(순수 호환성 마이그레이션에 집중).
- 미적용 인덱스 Low 항목·기타 코드 Medium(별도 사이클).
- 데스크톱(desktop 브랜치)·프론트엔드 변경(백엔드 프레임워크 업그레이드 범위).
- main 배포 자체(안드로이드 전 단계까지 모은 뒤 사용자 확인).

## 7. 성공 기준

- `./gradlew build` + 278 테스트 그린, CI 그린.
- §4 ② 로컬 스모크 전 항목 통과(실제 OAuth·AI·캘린더·오류 메시지).
- 코드 리뷰 + 보안 리뷰(auth 변경) 통과.
- 빌드가 Spring Boot 4.1.x·Jackson 3·Security 7·`sentry-spring-boot-4` 위에서 동작.
- dev 머지 완료(배포는 별도).

## 8. 리스크가 낮은 이유(참고)

- 앱이 Spring 기능을 좁게 사용(web/jpa/security/oauth2/redis/flyway) → 115개 breaking change 중 해당분이 적음.
- OpenAI를 SDK가 아닌 Spring HTTP + Jackson으로 직접 호출 → 서드파티 SDK 호환성 리스크 없음(Jackson 3 적응만).
- 278 테스트 + CI가 방금 신선하게 구축됨 → 회귀 감지 최상.

**참고 출처**: [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide), [Spring Support Policy](https://spring.io/support-policy/), [Sentry sentry-spring-boot-4](https://mvnrepository.com/artifact/io.sentry/sentry-spring-boot-4).
