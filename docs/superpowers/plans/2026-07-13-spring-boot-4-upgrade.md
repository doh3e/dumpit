# Spring Boot 4 업그레이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DumpIt 백엔드를 Spring Boot 3.4.1 → 4.1.0으로 올려 EOL을 해소하되, API 통합 테스트 278개를 회귀 안전망으로 삼아 동작을 보존한다.

**Architecture:** 호환성 마이그레이션(기능 불변). OpenRewrite 공식 Boot 4 레시피로 기계적 변경(패키지 리네임·설정 키·deprecated API)을 자동화하고, 의미적 변경(Jackson 3 예외 계층·Security 7·sentry 아티팩트 교체)은 수동 보정한다. 각 단계마다 컴파일·테스트로 검증하며, 테스트가 못 덮는 실제 OAuth/AI/캘린더는 로컬 수동 스모크로 확인한다.

**Tech Stack:** Spring Boot 4.1.0 / Java 21 / Gradle 8.14.x / Jackson 3 / Spring Security 7 / OpenRewrite(rewrite-spring 6.34.0) / sentry-spring-boot-4 8.44.x / PostgreSQL / Flyway

**스펙:** `docs/superpowers/specs/2026-07-13-spring-boot-4-upgrade-design.md`

## Global Constraints

- **브랜치**: `feature/spring-boot-4` (dev@현재 HEAD에서 분기). 착수 전 컨트롤러가 생성.
- **gradle 실행(Git Bash)**: `cd /c/coding/dumpit/backend && JAVA_HOME="C:/Users/o_o91/AppData/Roaming/Code/User/globalStorage/pleiades.java-extension-pack-jdk/java/21" ./gradlew <task>`. 테스트 DB는 로컬 `dumpit_test`(계정 dumpit/dumpit)만 사용.
- **회귀 안전망**: 매 코드 변경 태스크 완료 시 `./gradlew test`(278개) 그린 유지가 성공 조건. 테스트를 수정해 통과시키지 말 것 — 앱 동작이 바뀌면 원인을 규명(의도된 Jackson 3 shape 변화인지, 회귀인지).
- **목표 버전(정확히)**: Spring Boot Gradle 플러그인 `4.1.0`. Jackson·Security·Hibernate 등은 Boot 4.1.0 BOM이 정렬(명시 핀 금지, sentry 제외).
- **Jackson 3 규칙**: `com.fasterxml.jackson.databind.*`/`core.*` → `tools.jackson.*`. **`com.fasterxml.jackson.annotation.*`(예: `JsonIgnoreProperties`)는 그대로 유지**(Jackson 3에서도 동일 좌표). `JsonProcessingException`(checked, IOException 하위) → `tools.jackson.core.JacksonException`(unchecked, RuntimeException 하위).
- **커밋**: `Chore:`/`Fix:`/`Refactor:`/`Docs:` 접두사 + 한글 제목 + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. **OpenRewrite 자동 변경과 수동 보정을 반드시 별도 커밋으로 분리**(리뷰 용이).
- **테스트 사각지대**: 278 테스트는 `oauth2Login()` 목이라 실제 구글 로그인/로그아웃·Redis OAuth 토큰 직렬화를 검증 못 함. Task 8 로컬 수동 스모크가 필수 게이트.
- 자바 소스 UTF-8. MockMvc 경로에 context-path(`/api`) 금지.

## 파일 변경 지도

| 파일 | 변경 성격 |
|---|---|
| `backend/gradle/wrapper/gradle-wrapper.properties` | Gradle 8.14.x |
| `backend/build.gradle` | Boot 플러그인 4.1.0, rewrite 플러그인(임시), sentry 아티팩트 교체, sentry 플러그인 버전 |
| `backend/src/main/java/.../config/SecurityConfig.java` | Jackson import(databind), Security 7 API, writeErrorResponse |
| `backend/src/main/java/.../config/AuthenticatedRequestGuardFilter.java` | Jackson import(databind) |
| `backend/src/main/java/.../config/RedisOAuth2AuthorizedClientRepository.java` | Jackson import(databind+core `JsonProcessingException`→`JacksonException`), OAuth client 직렬화 |
| `backend/src/main/java/.../controller/TaskController.java` | Jackson import(databind) |
| `backend/src/main/java/.../service/impl/OpenAiServiceImpl.java` | Jackson import(databind; annotation 유지) |
| `backend/src/main/java/.../service/impl/GoogleCalendarServiceImpl.java` | Jackson import(databind; annotation 유지) |
| `backend/src/main/java/.../service/impl/ActivityLogServiceImpl.java` | Jackson import(databind+core `JsonProcessingException`) |
| `backend/src/main/java/.../service/OpenAiService.java` | 애노테이션만(변경 없음 예상) |
| `backend/src/test/java/.../api/ApiIntegrationTestBase.java` 등 | Jackson import(databind, `readTree`) |
| `application*.yml` | Boot 4 프로퍼티 키 갱신(레시피가 처리) |

---

### Task 1: Gradle 래퍼 업그레이드 (Boot와 분리)

**Files:** Modify `backend/gradle/wrapper/gradle-wrapper.properties`

**목적**: Boot 4는 Gradle 8.14+/9 요구. Gradle 범프를 Boot 범프와 분리해, 이 단계에서 깨지면 원인이 명확하게.

- [ ] **Step 1: 현행(3.4.1) 기준선 그린 확인**

```bash
cd /c/coding/dumpit/backend && JAVA_HOME="C:/Users/o_o91/AppData/Roaming/Code/User/globalStorage/pleiades.java-extension-pack-jdk/java/21" ./gradlew test -q
```
Expected: BUILD SUCCESSFUL(exit 0). 실패하면 즉시 중단·보고(마이그레이션 전 기준선이 깨진 것).

- [ ] **Step 2: Gradle 래퍼 8.14.x로 업그레이드**

```bash
./gradlew wrapper --gradle-version 8.14.3 --distribution-type bin
```
`8.14.3`이 없다는 오류가 나면 `--gradle-version 8.14` 또는 최신 8.14.x로 대체. `gradle-wrapper.properties`의 `distributionUrl`이 `gradle-8.14.x-bin.zip`으로 바뀌었는지 확인.

- [ ] **Step 3: 새 Gradle로 재빌드·테스트(여전히 Boot 3.4.1)**

```bash
./gradlew test -q
```
Expected: BUILD SUCCESSFUL. Gradle 범프만으로 3.4.1이 그린이어야 함.

- [ ] **Step 4: 커밋**

```bash
git add backend/gradle/wrapper/gradle-wrapper.properties backend/gradlew backend/gradlew.bat
git commit -m "Chore: Gradle 래퍼 8.14.x로 업그레이드 (Boot 4 요구사항 선행)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: OpenRewrite 셋업 + 드라이런 검토

**Files:** Modify `backend/build.gradle` (임시 rewrite 플러그인 블록)

**목적**: 실제 변경 전에 레시피가 무엇을 바꾸는지 미리보기. 이 태스크는 코드를 바꾸지 않는다(dryRun만).

- [ ] **Step 1: build.gradle에 rewrite 플러그인·레시피 추가**

`plugins { }` 블록에 추가:
```groovy
    id 'org.openrewrite.rewrite' version '7.36.0'
```
파일 하단(dependencies 뒤)에 추가:
```groovy
rewrite {
    activeRecipe('org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0')
}
dependencies {
    rewrite('org.openrewrite.recipe:rewrite-spring:6.34.0')
}
```
(플러그인/레시피 버전이 해석 실패하면 `latest.release`로 임시 대체 후 실제 해석된 버전을 리포트에 기록.)

- [ ] **Step 2: 드라이런 실행 → 변경 미리보기 생성**

```bash
./gradlew rewriteDryRun -q
```
Expected: `build/reports/rewrite/rewrite.patch` 생성. 이 패치 파일을 열어 (a) Boot 버전이 4.0.x로 설정되는지, (b) Jackson import 리네임, (c) 설정 프로퍼티 키 변경, (d) deprecated API 치환 범위를 확인.

- [ ] **Step 3: 패치 요약을 리포트에 기록**(적용 아님) — 어떤 파일이 얼마나 바뀌는지, 예상 밖 변경(스타일·무관 파일)이 있는지 메모. 커밋 없음(build.gradle의 rewrite 블록은 Task 3에서 함께 커밋).

---

### Task 3: OpenRewrite 적용 (기계적 변경 일괄)

**Files:** Modify `backend/build.gradle`(Boot 4.1.0 확정), 다수 소스(레시피 자동 변경), `application*.yml`

**Interfaces:** Produces — Boot 4.1.0로 설정된 build.gradle, Jackson `tools.jackson` 리네임된 소스(대부분).

- [ ] **Step 1: 레시피 적용**

```bash
./gradlew rewriteRun -q
```
소스·빌드파일·yml이 일괄 수정됨.

- [ ] **Step 2: Boot 버전을 4.1.0으로 확정**

레시피가 build.gradle의 `org.springframework.boot` 플러그인 버전을 4.0.x로 바꿨을 것. 이를 정확히 `4.1.0`으로 수정:
```groovy
    id 'org.springframework.boot' version '4.1.0'
```
`io.spring.dependency-management` 버전이 Boot 4 규약과 충돌하면 레시피 지시대로 조정(대개 유지 가능).

- [ ] **Step 3: rewrite 플러그인·레시피 블록 제거**

Task 2에서 넣은 `id 'org.openrewrite.rewrite'` 플러그인 줄, `rewrite { }` 블록, `rewrite(...)` 의존성을 build.gradle에서 삭제(1회성 도구라 잔류 금지).

- [ ] **Step 4: 컴파일 시도(실패 예상 — 수동 보정 대상 확인)**

```bash
./gradlew compileJava 2>&1 | grep -iE "error:|cannot find|does not" | head -40
```
Expected: sentry 아티팩트·Jackson `JsonProcessingException`·Security 잔여 등으로 컴파일 에러가 남는 것이 정상(Task 4~6에서 해소). 남은 에러 목록을 리포트에 기록.

- [ ] **Step 5: OpenRewrite 자동 변경을 단독 커밋**(수동 보정과 분리)

```bash
git add -A
git commit -m "Chore: OpenRewrite Boot 4 레시피 자동 적용 (기계적 변경, 컴파일 미완)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Co-Authored-By: OpenRewrite <noreply@openrewrite.org>"
```

---

### Task 4: 의존성 수동 보정 (Sentry 아티팩트 교체)

**Files:** Modify `backend/build.gradle`

- [ ] **Step 1: sentry 스타터 아티팩트 교체**

```groovy
// 변경 전: implementation 'io.sentry:sentry-spring-boot-starter-jakarta:8.40.0'
implementation 'io.sentry:sentry-spring-boot-4:8.44.1'
```
(8.44.1이 없으면 Maven Central에서 `sentry-spring-boot-4` 최신 8.x를 확인해 핀. 리포트에 실제 핀 버전 기록.)

- [ ] **Step 2: sentry gradle 플러그인 버전 점검**

`id 'io.sentry.jvm.gradle' version '6.5.0'`이 Sentry 8.44/Boot 4와 호환되는지 확인. 빌드 시 플러그인 비호환 오류가 나면 최신 버전으로 상향(리포트에 기록). 호환되면 유지.

- [ ] **Step 3: 컴파일 재시도**

```bash
./gradlew compileJava 2>&1 | grep -iE "error:|cannot find|sentry" | head -30
```
Expected: sentry 관련 에러 소거. Jackson·Security 에러는 남아있어도 됨.

- [ ] **Step 4: 커밋** `Fix: Sentry를 sentry-spring-boot-4로 교체 (Boot 4 호환)`

---

### Task 5: Jackson 3 수동 보정 (예외 계층)

**Files:** Modify `RedisOAuth2AuthorizedClientRepository.java`, `ActivityLogServiceImpl.java`, 그 외 컴파일 에러가 남은 Jackson 사용처

**배경**: Jackson 3에서 `JsonProcessingException`(checked, IOException 하위) → `tools.jackson.core.JacksonException`(unchecked, RuntimeException 하위). OpenRewrite가 대부분 리네임했더라도 `throws`/`catch`/import가 남을 수 있다.

- [ ] **Step 1: 남은 Jackson 참조 전수 확인**

```bash
grep -rn "JsonProcessingException\|com.fasterxml.jackson.databind\|com.fasterxml.jackson.core" src/main/java src/test/java
```
Expected: `com.fasterxml.jackson.annotation.*`(JsonIgnoreProperties 등)만 남아야 정상. `databind`/`core`/`JsonProcessingException`이 남으면 보정 대상.

- [ ] **Step 2: `RedisOAuth2AuthorizedClientRepository` 보정**

- import `com.fasterxml.jackson.core.JsonProcessingException` → `tools.jackson.core.JacksonException` (또는 제거)
- `ObjectMapper` import → `tools.jackson.databind.ObjectMapper`
- 직렬화 메서드의 `throws JsonProcessingException`/`catch (JsonProcessingException e)`를 `JacksonException`으로 교체. `JacksonException`은 unchecked이므로 checked 전파를 위해 남겨둔 `throws`는 제거 가능(호출부 영향 확인).
- **주의**: OAuth 토큰 직렬화/역직렬화가 여전히 성립해야 함(Task 8 스모크에서 실제 검증).

- [ ] **Step 3: `ActivityLogServiceImpl` 보정** — 동일 패턴(`JsonProcessingException`→`JacksonException`, catch 조정).

- [ ] **Step 4: 나머지 databind import 잔여 보정** — Step 1 grep 목록의 `com.fasterxml.jackson.databind.*`를 `tools.jackson.databind.*`로. 애노테이션은 건드리지 않음.

- [ ] **Step 5: 컴파일 재시도**

```bash
./gradlew compileJava 2>&1 | grep -iE "error:|jackson|cannot find" | head -30
```
Expected: Jackson 관련 에러 소거.

- [ ] **Step 6: 커밋** `Fix: Jackson 3 예외 계층 대응 (JsonProcessingException→JacksonException)`

---

### Task 6: Spring Security 7 수동 보정

**Files:** Modify `SecurityConfig.java`, `AuthenticatedRequestGuardFilter.java`(필요 시)

- [ ] **Step 1: 남은 컴파일 에러 확인**

```bash
./gradlew compileJava 2>&1 | grep -iE "error:|deprecated|cannot find|security" | head -40
```
Security 7에서 시그니처·메서드 변경으로 남은 에러를 목록화.

- [ ] **Step 2: SecurityConfig 보정**

- `writeErrorResponse(...)`의 `throws IOException`는 servlet `getWriter().write()` 때문이므로 유지(Jackson 아님). `objectMapper` import는 `tools.jackson.databind.ObjectMapper`로.
- 람다 DSL(`authorizeHttpRequests`, `oauth2Login`, `headers`, `exceptionHandling`, `logout`, `addFilterAfter`)에서 제거된/변경된 메서드가 있으면 Security 7 API로 교체(에러 메시지가 대체 메서드를 안내). OAuth2 client 관련(`authorizedClientRepository`/`authorizedClientManager` 빈, `OAuth2AuthorizationRequestResolver`) 시그니처 변화 점검.

- [ ] **Step 3: AuthenticatedRequestGuardFilter 확인** — `OncePerRequestFilter`·`SecurityContextHolder`·`OAuth2User` API가 Security 7에서 유지되는지 확인, 변경 시 보정.

- [ ] **Step 4: 전체 컴파일 그린**

```bash
./gradlew compileJava compileTestJava 2>&1 | grep -iE "error:" | head -20; echo "EXIT: ${PIPESTATUS[0]}"
```
Expected: 에러 0(main + test 모두 컴파일).

- [ ] **Step 5: 커밋** `Fix: Spring Security 7 API 변경 대응`

---

### Task 7: 전체 테스트 그린 (회귀 규명)

**Files:** 필요 시 소스(회귀 원인) 또는 테스트(의도된 Jackson 3 shape 변화 반영)

- [ ] **Step 1: 전체 테스트 실행**

```bash
./gradlew test 2>&1 | tail -30
```

- [ ] **Step 2: 실패 분류**

- **Jackson 3 shape 차이**(날짜 포맷·null·BigDecimal): 응답 형식이 의도적으로 바뀐 것이면, 앱을 Jackson 2 동작에 맞추는 설정을 추가(예: `application.yml`의 jackson 설정)해 **기존 API 계약 유지**를 우선. 계약을 유지할 수 없을 때만 테스트 기대값 조정(그 경우 프론트 영향도 함께 확인·리포트).
- **Security/인가 회귀**: 실제 결함이므로 소스 보정.
- **Flyway/Hibernate 동작 변화**: 마이그레이션·매핑 확인.

- [ ] **Step 3: 그린까지 반복 → 전체 278개(+기존) 통과 확인**

```bash
./gradlew test -q; echo "EXIT: ${PIPESTATUS[0]}"
```
Expected: EXIT 0.

- [ ] **Step 4: 커밋** `Fix: Boot 4 회귀 대응, 테스트 전체 그린` (변경 있을 때)

---

### Task 8: 로컬 실행 스모크 (테스트 사각지대 — 컨트롤러 직접 수행)

**주의**: 실제 구글 OAuth·실행 앱이 필요하므로 **컨트롤러가 로컬에서 직접 수행**(서브에이전트 위임 부적합). 백엔드를 로컬 실행하고 아래를 육안 확인.

- [ ] **Step 1: 로컬 백엔드 기동** (local 프로파일, 실제 OAuth/OpenAI/구글 키 필요 — `application-local.yml`)

```bash
./gradlew bootRun
```
기동 로그에 Boot 4.1.0·Jackson 3 관련 오류 없이 컨텍스트가 뜨는지 확인.

- [ ] **Step 2: 스모크 체크리스트**(프론트 dev 서버 연동 또는 직접 호출)

- [ ] 실제 구글 **로그인 → `/auth/me` 200(한글 없이 정상 JSON) → 로그아웃** (Security 7 + OAuth client + Redis 토큰 직렬화)
- [ ] **캘린더 연결·이벤트 조회**(구글 응답 Jackson 3 파싱)
- [ ] **브레인덤프 또는 아이디어 AI 추출**(OpenAI 응답 Jackson 3 파싱)
- [ ] 미인증 요청 → **401 한글 JSON**(SecurityConfig Jackson 3)
- [ ] 상태변경 요청에 X-Requested-With 없이 → **403 한글**(가드 필터)
- [ ] 태스크 생성/수정/완료·아이디어·루틴 기본 흐름 1회

- [ ] **Step 3: 결과 기록** — 각 항목 통과/실패. 실패 시 원인 규명 후 해당 Task로 회귀. 전 항목 통과가 게이트.

---

### Task 9: CI 검증 + 최종 리뷰 준비

**Files:** 없음(푸시·확인)

- [ ] **Step 1: dev가 아닌 feature 브랜치 푸시 후 CI 확인**

```bash
git push -u origin feature/spring-boot-4
```
CI는 push[main,dev]·PR에만 트리거되므로, CI를 돌리려면 `gh pr create --draft --base dev --title "Spring Boot 4 업그레이드" --body "...\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"`로 draft PR 생성 → `pull_request` 트리거로 backend(신규 postgres 컨테이너)·frontend 빌드 실행.

- [ ] **Step 2: CI 그린 확인**

```bash
gh run watch <run-id> --exit-status
```
실패 시 로그 분석(`gh run view --log-failed`) → 원인 수정·재푸시. 로컬 통과가 CI에서 깨지는 경우는 대개 환경(로케일·env) 차이.

- [ ] **Step 3: 스펙 성공 기준 대조** — 빌드가 Boot 4.1.0/Jackson 3/Security 7/sentry-spring-boot-4 위에서 동작, 278 테스트+CI 그린, Task 8 스모크 전 항목 통과. 리포트에 최종 상태 기록.

---

## 실행 순서·의존성

- Task 1(Gradle) → 2·3(OpenRewrite) → 4·5·6(수동 보정, 순차: 의존성→Jackson→Security) → 7(테스트 그린) → 8(스모크) → 9(CI). 컴파일이 통과해야 다음 보정이 의미 있으므로 4~6은 순차.
- Task 8 스모크 실패는 앞 태스크로 회귀. 배포(main 푸시)는 이 계획 범위 밖(사용자 확인).

## 배포 시 주의(리포트에 인계)

- prod Redis의 기존 OAuth authorized client가 Jackson 3 직렬화 포맷 변경으로 역직렬화 실패 가능 → **유저 재로그인 필요(일시적, 데이터 손실 없음)**. 배포 노트 명시.
- 배포 후 prod에서 실제 로그인 스모크 재수행.

## Self-Review 결과

- 스펙 §2(범위)→Task 1(Gradle)·3(Jackson 리네임)·4(sentry)·6(Security), §3(방법 A OpenRewrite+수동)→Task 2·3(도구)+4·5·6(수동), §4(검증 3층)→Task 7(자동)·8(스모크)·9(CI), §5(리스크)→배포 주의 인계. 갭 없음.
- 버전 핀: Boot 4.1.0, Gradle 8.14.x, rewrite 7.36.0/rewrite-spring 6.34.0, 레시피 `org.openrewrite.java.spring.boot4.UpgradeSpringBoot_4_0`, sentry-spring-boot-4 8.44.1 — 전 태스크 일관.
- Jackson 규칙(annotation 유지, databind/core만 tools.jackson, JsonProcessingException→JacksonException) 전 태스크 일관.
- "레시피가 정확히 뭘 바꿀지 미리 알 수 없음"은 마이그레이션 본질 — Task 2 드라이런으로 미리보기 후 Task 3 적용, 이후 컴파일 에러 목록을 실제 보정 근거로 삼는 구조로 명시(플레이스홀더 아님, 도구 출력 기반 절차).
