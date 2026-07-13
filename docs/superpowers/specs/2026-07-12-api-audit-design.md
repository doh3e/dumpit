# API 전수 테스트 + 쿼리 진단 + 보안 체크 설계 — 2026-07-12

## 1. 개요

배포(main 푸시) 전 마지막 품질 게이트. 세 갈래를 한 사이클로 수행한다.

1. **API 전수 테스트** — 전 엔드포인트(~60개, 19개 컨트롤러)에 재실행 가능한 통합 테스트를 작성해 기능 정상 동작·예외 처리·한글 오류 메시지를 검증하고, 영구 회귀 자산으로 남긴다.
2. **SQL 쿼리 진단** — N+1·슬로우 쿼리를 검거한다. N+1 검출은 쿼리 카운트 assert로 테스트 자산에 통합한다.
3. **보안 체크** — 코드 전수 점검 + EC2 인프라 가벼운 점검.

### 확정된 결정 사항

| 결정 | 내용 |
|---|---|
| 산출물 | 전 엔드포인트 자동 통합 테스트 + CI 자동 실행 (일회성 점검 아님) |
| 발견 문제 처리 | **명백한 버그는 즉시 픽스**(+회귀 테스트), **설계 변경은 리포트**로 모아 사용자 검토 후 결정 |
| 보안 범위 | 코드 전수 + 인프라(EC2)는 nginx TLS·열린 포트·환경변수 관리 수준의 가벼운 점검 |
| 테스트 하네스 | **A안: MockMvc 인프로세스 통합 테스트** — `@SpringBootTest` + `@AutoConfigureMockMvc`, spring-security-test `oauth2Login()`으로 OAuth 세션 인증 재현. 테스트용 로그인 백도어 없음 |
| 테스트 DB | 로컬: 기존 PostgreSQL에 `dumpit_test` DB 신설(개발용 `dumpit` DB 불가침). CI: GitHub Actions postgres 서비스 컨테이너. Docker 로컬 설치 불필요 |

### 산출물 4종

1. 통합 테스트 스위트 — `backend/src/test/java/com/dumpit/api/` 이하, 도메인별 테스트 클래스
2. CI 테스트 자동 실행 — `.github/workflows/ci.yml` 개편
3. 즉시 픽스 커밋들 — 발견 즉시 수정, 해당 테스트가 회귀 방지
4. 진단 리포트 — `docs/superpowers/audits/2026-07-XX-api-audit-report.md` (설계 변경 필요 항목 + 보안 발견사항 심각도별 정리)

## 2. 테스트 인프라

### 2.1 프로파일 분리

- `backend/src/main/resources/application-test.yml` 신설:
  - datasource: `jdbc:postgresql://localhost:5432/dumpit_test` (계정 dumpit/dumpit, 환경변수로 오버라이드 가능 — CI에서 사용)
  - Flyway + `ddl-auto: update`는 local 프로파일과 동일하게 동작(빈 DB에서 스키마 자동 구성, V3의 to_regclass 가드는 빈 DB에서도 안전)
  - Redis 미사용(local과 동일한 degrade 경로), 세션 스토어 none
- 로컬에 `dumpit_test` DB 생성: `CREATE DATABASE dumpit_test OWNER dumpit;` (1회, psql로)
- 기존 `IdeaStickerUpdateIntegrationTest`가 개발용 `dumpit` DB에 직접 붙던 부채를 test 프로파일로 이관한다.
- 기존 단위 테스트(순수 JUnit/Mockito)는 그대로 두고, DB가 필요한 통합 테스트만 test 프로파일을 쓴다.

### 2.2 베이스 클래스 `ApiIntegrationTestBase`

모든 도메인 테스트가 상속하는 공통 기반:

- `@SpringBootTest` + `@AutoConfigureMockMvc` + `@ActiveProfiles("test")`
- **테스트 유저 시드**: `userA`(일반), `userB`(일반, IDOR 상대역), `admin`(관리자 이메일). `@BeforeEach`에서 upsert, 테스트 간 데이터 정리(관련 테이블 삭제 순서 유틸 제공)
- **인증 헬퍼**: 컨트롤러가 `principal.getAttribute("email")`로 유저를 식별하므로, `asUser(email)` 헬퍼가 `oauth2Login().attributes(email=...)` 포스트프로세서를 반환. 미인증 요청은 포스트프로세서 없이 호출
- **한글 오류 메시지 검증 헬퍼** `assertKoreanError(ResultActions)`:
  - 응답 body의 `error` 필드에 한글(가-힣)이 1자 이상 포함
  - 알려진 영어 원문 패턴("not found", "must not", "cannot" 등)이 포함되지 않음
- **쿼리 카운트 헬퍼**: `hibernate.generate_statistics: true`(test 프로파일) + Statistics의 `getPrepareStatementCount()`를 리셋/측정하는 `assertQueryCountAtMost(n, () -> ...)` 제공

### 2.3 외부 의존성 목 처리

- OpenAI(`OpenAiService` 또는 해당 구현체), 구글 캘린더 서비스, Resend 메일 클라이언트를 `@MockBean`으로 대체 — 테스트에 API 키 불필요, CI 시크릿 불필요
- 목 응답은 실제 응답 형태를 본뜬 최소 스텁(예: inferSchedule은 고정 JSON)
- Redis 부재 시 degrade 경로(캐시 스킵, nudge 스킵)는 그 자체가 테스트 대상 — 예외로 죽지 않아야 함

## 3. API 전수 테스트 매트릭스

### 3.1 표준 검증 세트 (엔드포인트당)

| # | 검증 | 기대 |
|---|---|---|
| V1 | 정상 동작 | 2xx + 응답 필드 shape(핵심 필드 존재·타입) 검증 |
| V2 | 미인증 호출 | 401 + JSON body + 한글 메시지 |
| V3 | 남의 리소스 접근 (IDOR) | userB가 userA 리소스의 id로 호출 → 403 또는 404, userA 데이터가 응답에 없음 |
| V4 | 없는 리소스 | 임의 UUID → 404 + 한글 메시지 |
| V5 | 잘못된 입력 | 필수 필드 누락·범위 초과·잘못된 enum·비정상 JSON → 400 + 한글 메시지 |
| V6 | admin 전용 | 일반 유저(userA) 호출 → 403 + 한글 메시지 |

- V3~V6은 해당되는 엔드포인트에만 적용(예: 목록 조회에는 V3 해당 없음, admin 아닌 API에 V6 없음).
- V1은 도메인 흐름 테스트로 묶어도 됨(예: 태스크 생성→조회→수정→완료→삭제를 한 시나리오로).

### 3.2 도메인 그룹 → 테스트 클래스

| 그룹 | 컨트롤러 | 테스트 클래스 | 특이사항 |
|---|---|---|---|
| Auth·Profile | AuthController, ProfileController | `AuthProfileApiTest` | /auth/me의 equipments 맵, 탈퇴 플로우, 캘린더 연결 해제 |
| Task | TaskController | `TaskApiTest` | CRUD·완료·스티커·noDeadline 등 마감 모드 조합, 코인 지급 |
| Idea | IdeaController | `IdeaApiTest` | 트리(부모-자식) 규칙 3종, 스티커, 태스크 전환 |
| BrainDump·AI | BrainDumpController, AiUsageController | `BrainDumpAiApiTest` | OpenAI 목, AI 사용량 한도(429 + 한글) |
| Routine | RoutineController | `RoutineApiTest` | 반복 규칙 validation 다수(주간/월간/서수) |
| Dashboard·Calendar | DashboardController, CalendarController | `DashboardCalendarApiTest` | 플래닝 응답 구조, 캘린더 목 |
| Pomodoro·Notification | PomodoroController, NotificationController | `PomodoroNotificationApiTest` | 뽀모도로 완료 코인 지급 |
| Shop | ShopController | `ShopApiTest` | 기존 ShopServiceTest와 중복되지 않게 HTTP 계층 중심(구매·장착·해제·카탈로그 owned 플래그) |
| Notice·Inquiry | NoticeController, InquiryController | `NoticeInquiryApiTest` | 읽음 처리, 문의 메일 목 |
| Admin·Health | Admin 4종, HealthController | `AdminApiTest` | 14개 전부 V6(일반 유저 403) 필수, health는 permitAll 확인 |

### 3.3 확보된 즉시 픽스 후보 (테스트로 실증 후 수정)

- `SecurityConfig`의 401/403 핸들러: 하드코딩 한글 JSON이 소스에서 인코딩 깨짐 + `getWriter()` charset 미설정(기본 ISO-8859-1) — V2 테스트가 실증하면 `GlobalExceptionHandler`와 동일한 형식의 응답으로 재작성(ObjectMapper 직렬화 + UTF-8 명시)
- `GlobalExceptionHandler.koreanBadRequestMessage()`의 switch에 누락된 영어 메시지 — V4·V5 테스트가 걸러내는 대로 추가

## 4. SQL 쿼리 진단

### 4.1 N+1 검출 (테스트 자산에 통합)

목록성 API에 쿼리 카운트 상한 assert를 포함한다. 시드 데이터를 "N이 커지면 쿼리도 커지는" 구조로 배치(예: 태스크 10개, 아이디어 부모 3 + 자식 9)한 뒤 상한을 건다.

우선 대상: 대시보드 플래닝, 태스크 목록, 아이디어 목록(트리), 루틴 목록, 공지 목록(읽음 여부), 샵 카탈로그(owned/equipped), admin 유저 목록(유저별 통계 5종 리포지토리 조합 — 유력 용의자).

### 4.2 슬로우 쿼리·실행 계획

1. 테스트 전체를 SQL 로그 모드(`org.hibernate.SQL: debug`)로 1회 실행해 발행 쿼리 전수 수집
2. 주요 쿼리(플래닝의 deadline 필터, 활동 로그 집계, 통계성 쿼리)를 로컬 DB에서 `EXPLAIN ANALYZE` — 풀스캔·불필요 정렬 확인
3. 현재 인덱스 목록과 대조해 부족분 식별

### 4.3 처리 기준

- **즉시 픽스**: fetch join, `@BatchSize`, 쿼리 병합 등 코드 수준 개선 — 쿼리 카운트 테스트가 회귀 방지
- **리포트**: 인덱스 추가(V4 마이그레이션 = 스키마 변경), 응답 구조 변경이 필요한 개선 — 승인 후 후속 반영

## 5. 보안 체크

### 5.1 코드 전수 (체크리스트)

| 영역 | 점검 내용 | 방법 |
|---|---|---|
| 인가(IDOR) | 모든 리소스 접근이 userId 스코프를 타는지 | 리포지토리 호출 코드 스윕 + §3 V3 테스트로 실증 |
| Admin 경계 | 4개 admin 컨트롤러 전 엔드포인트에 `requireAdmin` 존재·일관성 | 코드 스윕 + V6 테스트 |
| 입력 검증 | `@Valid` 커버리지, 길이 제한 없는 텍스트 필드(대용량 body 방어) | DTO 전수 스윕 |
| 시크릿 노출 | 설정 파일·git 전체 히스토리·프론트 번들(VITE_*)에 키·비밀번호 | 패턴 스캔(api[_-]?key, secret, password 등) |
| 의존성 취약점 | frontend `npm audit`, backend 주요 라이브러리(Spring Boot 3.4.1, spring-security 등) 공개 CVE | npm audit + 어드바이저리 확인 |
| 설정 검토 | CSRF disabled 타당성(세션 쿠키 + SameSite=lax 분석), 쿠키 플래그(secure가 prod에서 켜지는지), CORS 오리진, 보안 헤더, Sentry PII 설정 | 설정 파일 검토 + 응답 헤더 테스트 |

### 5.2 인프라 가벼운 점검 (EC2 SSH)

- nginx: TLS 프로토콜 버전, 보안 헤더 전달, 리다이렉트 구성
- 열린 포트: 5432(PostgreSQL)·6379(Redis)가 외부 공개인지 (`ss -tlnp` + 보안 그룹)
- 컨테이너·환경변수: 시크릿이 이미지에 박혀있지 않은지, .env 파일 권한

### 5.3 처리 기준

발견사항은 심각도(Critical/High/Medium/Low)로 리포트에 정리. Critical/High 중 명백한 버그 성격(예: 인가 누락 엔드포인트)은 즉시 픽스 + 테스트, 정책·구조 변경(예: CSRF 재활성화, rate limiting 도입)은 권고로 리포트.

## 6. CI 연동

`.github/workflows/ci.yml` backend 잡 개편:

- `services: postgres` 추가 (postgres:16, DB `dumpit_test`, 계정 dumpit/dumpit, 헬스체크)
- 빌드 스텝에서 `-x test` 제거, `SPRING_PROFILES_ACTIVE=test` + datasource 환경변수 주입
- 외부 API는 전부 목이므로 CI 시크릿 추가 불필요
- 실패 시 테스트 리포트 확인 가능하도록 `build/reports/tests` 아티팩트 업로드

## 7. 범위 제외

- rate limiting·계정 잠금 등 신규 보안 기능 도입 (리포트에 권고만)
- 부하 테스트(동시 사용자·처리량)
- 프론트엔드 E2E 테스트
- EC2 심층 하드닝(fail2ban, OS 패치 자동화 등)
- 어드민 페이지 프론트 점검

## 8. 리스크

- **테스트 격리**: 테이블 정리 순서(FK)·시퀀스 초기화 실수는 간헐 실패를 만든다 — 베이스 클래스의 정리 유틸을 Task 1에서 확실히 다지고 이후 태스크는 재사용만
- **목 경계**: OpenAI 목이 실제 응답과 다르면 통과해도 실전과 어긋남 — 목 스텁은 실서비스 응답 캡처를 본떠 작성
- **CI 시간**: 통합 테스트 ~10클래스 추가로 backend 잡이 길어짐(예상 +3~5분) — 허용, 병렬화는 필요 시 후속
- **인코딩 픽스**: SecurityConfig 재작성 시 소스 파일 인코딩(UTF-8) 확인 필수 — 같은 실수 반복 방지
