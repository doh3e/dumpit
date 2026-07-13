# DumpIt API 전수 감사 최종 리포트 — 2026-07-13

**사이클**: 배포 전 품질 게이트 ⑤ (브랜치 `feature/api-audit`, dev@b345821에서 분기)
**범위**: 54개 API 엔드포인트(19개 컨트롤러) 전수 통합 테스트 + SQL 쿼리 진단 + 보안 코드 스윕
**스펙/계획**: `docs/superpowers/specs/2026-07-12-api-audit-design.md`, `docs/superpowers/plans/2026-07-13-api-audit.md`

## 요약

- **테스트 자산**: MockMvc 인프로세스 통합 테스트 **278개** 신규 구축(spring-security-test `oauth2Login`으로 OAuth 세션 재현, 전용 `dumpit_test` DB, OpenAI·구글 캘린더·메일 목). 전 엔드포인트에 정상 동작·미인증(401)·IDOR(403)·없는 리소스(404)·잘못된 입력(400)·admin 경계(403)를 표준 검증 세트로 적용. 모든 4xx/5xx가 한글 오류 메시지를 반환하는지 `assertKoreanError`로 통일 검증.
- **픽스**: 감사 중 발견한 **명백한 버그 10종 + 보안 [High] 2건을 이번 사이클에서 수정**(각각 회귀 테스트 포함, per-task 리뷰 + 최종 리뷰 + 보안 전문 리뷰 통과). [High] 2건(밴/탈퇴 세션 게이트·CSRF 커스텀 헤더)은 사용자 지시로 이번 사이클에 포함.
- **N+1**: 목록성 API 7종에 쿼리 카운트 회귀 테스트 고정. `GET /admin/users`의 N+1(요청당 14쿼리)을 GROUP BY 집계로 6쿼리로 축소. 그 외 신규 N+1 없음(SQL 전수 로그 3중 검증).
- **보안**: 인가·입력검증·시크릿·의존성·설정 5개 영역 스윕. **커밋된 시크릿 없음**(305커밋 전체 히스토리). 발견 [High] 2건은 픽스 완료, 잔여 Medium(설계 변경)은 §2에 정리.
- **CI**: `ci.yml`에 postgres 서비스 컨테이너 추가 + `-x test` 제거로 push마다 전체 테스트 실행하도록 전환(로컬 278개 그린, CI 실행 검증은 `gh` 인증 대기 중).

---

## 1. 이번 사이클에서 수정 완료 (즉시 픽스)

| # | 버그 | 영향 | 커밋 |
|---|---|---|---|
| 1 | 401/403 인증 실패 응답의 한글 JSON이 소스 인코딩 손상 + charset 미설정으로 깨져 나감 | 미인증/권한없음 응답이 프로덕션에서 mojibake | `0213371` |
| 2 | admin 계정 탈퇴/밴 시도 시 `IllegalStateException`이 핸들러 없어 **500** | admin 자기밴/탈퇴가 500(+영어 원문) | `5b98298`/`f00ecd2` |
| 3 | `DELETE /me/account` 검증 **전에** OAuth 해지가 먼저 실행 → admin 탈퇴 거부돼도 구글 연동은 이미 끊김 | 데이터 정합성 | `5b98298` |
| 4 | Bean Validation `@Size` 메시지가 JVM 로케일 의존 → 배포 alpine 환경에서 영어 노출 가능 | 한글 계약 위반 | `6308663` |
| 5 | 프로필 수정이 빈 닉네임 허용·bio 초과분 조용히 절삭(400 대신 200) | 입력 검증 누락 | `5b98298` |
| 6 | `POST /tasks/{id}/split` 빈 목록·잘못된 status enum이 영어 원문 노출 | 한글 계약 위반 | `def3546` |
| 7 | `CalendarController` 403 응답이 비표준 형태(`{code,message}`) + mojibake, 죽은 코드 | 응답 계약 불일치 | `0f3b763` |
| 8 | 경로 파라미터 바인딩 실패(잘못된 slot enum·UUID 오형식)가 catch-all로 **500** | 클라이언트 입력 오류가 500 (코인샵 사이클서 이연됐던 부채) | `d9ade78` |
| 9 | 확정 요청 DTO(브레인덤프/아이디어 AI추출)에 `@Size`·재귀 `@Valid` 누락 → 대용량 body 무제한 저장 | 입력 검증 누락 | `d70626e` |
| 10 | `GET /admin/users` N+1 (요청당 14쿼리, 유저별 통계 per-user 조회) | 성능 | `659e79c` |
| 11 | **[High] 밴/탈퇴 유저가 세션 유지 중 API 계속 사용 가능** (Broken Access Control) | 보안 | `c2d69fc`/`e94716d` |
| 12 | **[High] CSRF 비활성+SameSite=None으로 본문 없는 POST 크로스사이트 위조** | 보안 | `c2d69fc`/`e94716d` |

**11·12 — 배포 전 처리 요청(사용자 지시)으로 이번 사이클에서 픽스:** 인증 필터 뒤에 `AuthenticatedRequestGuardFilter`(단일 `OncePerRequestFilter`)를 두어 (1) 인증된 요청의 유저 status가 BANNED/WITHDRAWN이거나 식별 불가면 **401 한글 JSON(fail-closed)**, (2) 상태변경 메서드(POST/PUT/PATCH/DELETE)에 `X-Requested-With` 헤더 없으면 **403 한글 JSON**. 프론트 axios가 기본으로 `X-Requested-With`를 전송(desktop은 프론트 빌드 재사용). `#11`은 [태스크8 Medium] 본문 없는 401까지 동시 해소. 보안 전문 리뷰(opus)에서 **익스플로잇 가능한 우회 없음**으로 통과, 권한 하드닝 3건(필터 이중 등록 제거·예외 경로 정확매칭·null principal fail-closed) 추가 적용. 테스트 278개 그린(밴/탈퇴/CSRF 게이트 전용 `SessionGuardApiTest` 포함).

> **남은 CSRF 잔여(Low·비차단)**: `csrf.disable()` + `/auth/**` 예외로 `POST /auth/logout` 자체는 여전히 CSRF 미방어(강제 로그아웃 = 불편함 수준, 데이터 노출 아님). 필요 시 후속.

---

## 2. 배포 전 처리 권고 (설계 변경 — 사용자 결정 필요)

이 항목들은 **기존 코드의 취약점**으로, 감사가 발견했으나 진짜 설계 변경이 필요해 이번 사이클에서 픽스하지 않았다(위 [High] 2건은 사용자 지시로 §1에서 이미 픽스 완료). **테스트 브랜치 머지는 막지 않지만, main 배포 전 처리 권장.**

### [Medium] AI 사용량 한도가 Redis 장애 시 fail-open

- `AiUsageServiceImpl.consume()`이 `DataAccessException` 시 `REDIS_UNAVAILABLE`로 기록만 하고 **무제한 허용**. 프로덕션 Redis 장애 시 AI 한도가 뚫려 비용 노출.
- **제안**: fail-closed 전환, 또는 Sentry 알림 + DB 폴백 카운터 검토.

### [Medium] Spring Boot 3.4.1 EOL (2025-12-31)

- 3.4.x 라인이 무료 보안 패치 종료. 번들: Spring Framework 6.2.0, Spring Security 6.4.1.
- **현재 코드 경로상 즉시 악용 가능한 CVE는 없음**(확인한 CVE 전부 미사용 기능 — Content-Disposition RFD, `@EnableMethodSecurity` 우회, SAML/X.509 등). 단 EOL이라 향후 기본 활성 기능에서 새 CVE 발견 시 패치 불가.
- **제안**: Spring Boot 3.5.x+ 업그레이드 계획(마이그레이션 범위 큼).

### [Medium] `WebConfig` CORS 오리진이 단일 String — 다중 오리진 미지원

- `allowedOrigins`가 콤마 구분 다중 값을 파싱 못 함(한 문자열로 취급돼 어떤 Origin과도 매치 안 됨). 현재 웹 단일 오리진이라 무해하나, 데스크톱에 fetch 기능 추가 시 두 오리진 동시 허용 불가.
- **제안**: `List<String>` + split 처리.

### [Medium] `PATCH /ideas/{id}`의 parentIdeaId 필드 생략 ≠ 명시적 null 미구분

- `Idea.update()`가 parentIdea만 무조건 덮어써, parentIdeaId를 생략한 부분 수정(예: content만 변경)이 조용히 상위 연결을 끊음. 현재 프론트가 매 PATCH마다 parentIdeaId를 항상 함께 보내 미발현.
- **제안**: `Optional<UUID>` 또는 별도 `clearParent` 플래그로 존재 유무 분리(단순 null 체크로는 불가한 API 계약 결함).

### [npm] 프론트 의존성 취약점 8건 (audit fix로 major 점프 없이 수정 가능)

- axios 1.7.9, react-router-dom 7.0.2, vite 6.0.5(dev 전용) 등. 대부분 이 앱 사용 패턴상 미해당 추정이나 최신화 권장. **후속으로 `npm audit fix` 실행 권장**(회귀 검증 필요해 이번 미실행).

---

## 3. 성능 — 인덱스 제안 (스키마 변경, 미적용)

로컬 실데이터(수~수십 행)에서는 전부 Seq Scan이어도 무해하나, 데이터 증가 시 대비. **V4 마이그레이션으로 적용 결정 필요.**

- **[Medium]** `tasks` 테이블 PK 외 인덱스 전무 — 7개 쿼리가 `user_id, deleted_at`를 공통 술어로 씀:
  `CREATE INDEX idx_tasks_user_id_deleted_at ON tasks (user_id, deleted_at);`
- **[Low]** admin 통계 5테이블 `created_at` 무인덱스(admin 저빈도라 우선순위 낮음):
  `tasks`/`ai_usage_logs`/`routines`/`brain_dumps`/`users`에 `(created_at)` 인덱스(데이터 증가 관찰 후 일괄 적용 권장).
- **[Low]** `LogRetentionScheduler`의 `users.withdrawn_at` 무인덱스:
  `CREATE INDEX idx_users_withdrawn_at ON users (withdrawn_at) WHERE withdrawn_at IS NOT NULL;` (부분 인덱스)
- **[정보]** `notice_reads` NOT EXISTS는 이미 유니크 제약으로 Index Only Scan 최적화됨 — 조치 불필요.
- **[참고]** 나머지 도메인 FK 컬럼(`ideas.user_id` 등)도 무인덱스 — 성장 시 tasks와 동일 `(user_id[, deleted_at])` 패턴 일괄 적용 권장.

---

## 4. 테스트·인프라 관측 (후속 개선)

- **[테스트 인프라 한계]** test 프로파일이 `ddl-auto: update`라 스키마 드리프트를 은폐한다. 프로덕션은 `validate`(엔티티↔마이그레이션 불일치 시 기동 실패)인데, 테스트는 Hibernate가 드리프트를 조용히 패치해 통과시킨다. **단, 단순히 `validate`로 못 바꾼다** — V1이 no-op 베이스라인(`SELECT 1`)이라 기본 테이블을 Flyway가 아닌 ddl-auto가 만들기 때문. 제대로 하려면 모든 테이블을 생성하는 베이스라인 마이그레이션 작성이 필요(별도 태스크). 현 상태의 사각지대로 기록.
- **[테스트 실행 제약]** 격리는 매 테스트 `TRUNCATE ... CASCADE`(공유 `dumpit_test` DB) 전제이므로 **테스트 병렬화 도입 금지** — `maxParallelForks` 등을 켜면 즉시 깨진다. 단일 JVM 순차 실행 유지.
- **[죽은 코드]** (1) `koreanBadRequestMessage`의 루틴 5개 switch case(RoutineServiceImpl이 한글 BadRequestException 직접 던져 번역 경로 미사용), (2) `CalendarController.getEvents`의 `client==null` 분기(authorization_code grant에선 항상 예외라 미도달) — 동작은 정상, 리팩터링 시 정리 대상.
- **[테스트 함정 기록]** spring-security-test `oauth2Login()`이 리플렉션으로 `DefaultOAuth2AuthorizedClientManager`를 하이재킹해 `@RegisteredOAuth2AuthorizedClient` 파라미터 컨트롤러의 스코프별 시나리오 테스트를 막음 — `DashboardCalendarApiTest`는 매니저 자체를 목으로 우회. 유사 컨트롤러 추가 시 재발 주의.
- **[핸들러 잠복 리스크]** `IllegalStateException`/`IllegalArgumentException` 전역 핸들러가 default로 원문을 반환 → 스위치 미등록 케이스는 400+영어 원문 오분류 가능(현재 도달 경로 없음). 향후 해당 예외 throw 추가 시 재확인, 안전목록 방식 검토.

---

## 5. 확인된 안전 사항 (스윕 결과 이상 없음)

- **인가/IDOR**: 모든 도메인 리소스 접근이 userId 스코프 준수(V3 IDOR 403 테스트 전 도메인 통과 + `findById` 호출부 7곳 전수 확인 — 전부 admin 게이트 뒤 또는 소유권 체크 보유).
- **Admin 경계**: 4개 admin 컨트롤러 10개 엔드포인트 전부 일반 유저 호출 시 403(V6 @ParameterizedTest).
- **시크릿**: 작업 트리 + git 히스토리 305커밋 전체 diff 스캔 — **커밋된 시크릿 0건**. 프론트 번들에 `VITE_` 외 하드코딩 키 없음. (로컬 `application-local.yml`에 평문 시크릿 있으나 gitignore·커밋 이력 없음 — 로테이션 불요, `${VAR}` 참조 통일 권장.)
- **Sentry/PII**: `SEND_DEFAULT_PII` 기본 false, `max-request-body-size: small`, 수동 PII 태깅 없음. prod 쿠키 `secure=true` 확인.
- **상태변경 GET**: 부수효과 GET 엔드포인트 0건(전 컨트롤러 확인) — GET 경유 CSRF 원천 차단.

---

## 6. EC2 인프라 점검 — 미완료 (사용자 SSH 접근 필요)

계획 §5.2의 EC2 가벼운 점검(외부 열린 포트 5432/6379, nginx TLS, 컨테이너·환경변수)은 **EC2 호스트·SSH 키가 GitHub Secrets(`EC2_HOST`/`EC2_SSH_KEY`)라 로컬에서 접근 불가**하여 미실행. 아래 읽기 전용 명령을 사용자가 직접 실행하거나 호스트/키 제공 시 이어서 점검 필요:

```bash
ssh <ec2> "sudo ss -tlnp"                      # 5432/6379가 0.0.0.0 바인딩이면 High
ssh <ec2> "sudo nginx -T | grep -E 'ssl_protocols|add_header|listen'"
ssh <ec2> "docker ps --format '{{.Names}} {{.Ports}}'"
```

---

## 부록: 검증 세트 커버리지

19개 컨트롤러 / 54개 엔드포인트에 표준 검증 세트(V1 정상 · V2 미인증 401 · V3 IDOR 403 · V4 없는 리소스 404 · V5 잘못된 입력 400 · V6 admin 경계 403) 적용. 목록성 API 7종 쿼리 카운트: `GET /tasks`·`/ideas`·`/routines`·`/notices`·`/dashboard/planning` 각 2, `/shop/catalog` 3, `/admin/users` 6(픽스 후). 총 269개 테스트, 전 로케일(ko_KR/en_US) 그린.
