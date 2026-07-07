# AI 우선순위 고도화 기반 작업 (Phase 0~1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `dumpit_ai_learning_insight.md`의 로드맵 중 지금 실행 가능한 부분 — 로그 위생(원문 제거·이벤트 세분화), Flyway 도입, 규칙 기반 동적 우선순위 + LLM 역할 축소 — 를 구현한다.

**Architecture:** (1) Flyway로 스키마 마이그레이션 체계를 먼저 세우고, (2) `activity_logs` 스냅샷에서 민감 원문을 길이 메타데이터로 대체하며 기존 로그도 마이그레이션으로 정리한다. (3) `TASK_UPDATED`에 뭉쳐 있던 변경을 순수 함수 분류기로 세분화한다. (4) 우선순위는 저장된 정적 LLM 점수 대신, 조회 시점에 `규칙 기반 긴급도(0.6) + LLM 중요도(0.4)`를 합성하는 `PriorityCalculator`로 계산하고, LLM 프롬프트는 중요도만 평가하도록 v2로 바꾼다(긴급도 이중 반영 방지). (5) OpenAI 호출은 structured outputs(json_schema)와 타임아웃을 적용한다.

**Tech Stack:** Java 21, Spring Boot 3.4.1, Spring Data JPA, PostgreSQL(로컬: localhost:5432/dumpit, 운영: Supabase), Flyway 10.x, OpenAI Chat Completions (gpt-4o-mini), JUnit 5 + AssertJ (spring-boot-starter-test에 포함).

## Global Constraints

- 작업 디렉토리: 백엔드 명령은 모두 `backend/`에서 실행. Git Bash 기준 `./gradlew`, PowerShell이면 `.\gradlew.bat`.
- **전체 `./gradlew test`를 그대로 돌리지 말 것.** `DumpitApplicationTests`(contextLoads)는 로컬 Postgres·Redis·환경변수가 있어야 통과한다. 반드시 `--tests` 필터로 해당 테스트 클래스만 실행한다.
- 새 라이브러리는 Flyway 2개(`flyway-core`, `flyway-database-postgresql`) 외에 추가하지 않는다.
- API 응답 형태(`TaskResponse` 필드 구성)는 바꾸지 않는다. 프런트엔드는 `effectivePriority` 필드로 클라이언트 정렬을 한다 (`frontend/src/pages/DashboardPage.jsx:114`).
- `OpenAiService` 인터페이스의 메서드 시그니처는 바꾸지 않는다 (호출부 파급 방지).
- 코인 계산(`TaskServiceImpl.calcCompletionCoins`)은 기존 저장 점수 기반 로직을 유지한다 (코인 경제 변경 금지).
- 커밋 메시지는 기존 컨벤션(`Feat:`, `Fix:`, `Chore:` + 한국어 요약)을 따르고, 마지막 줄에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`를 붙인다.
- 로컬 DB 접속: `PGPASSWORD=dumpit psql -h localhost -U dumpit -d dumpit`
- Task 3(기존 로그 원문 제거)은 **비가역 파괴적 마이그레이션**이다. 로컬이든 운영이든 실행 전 백업이 선행 조건이다. 운영 배포는 사용자(관리자)가 Supabase 백업을 확인한 뒤에만 진행한다 — 이 플랜의 범위는 로컬 검증까지다.

---

### Task 1: Flyway 도입

**Files:**
- Modify: `backend/build.gradle`
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/db/migration/V1__baseline.sql`

**Interfaces:**
- Consumes: 없음 (독립 작업)
- Produces: `backend/src/main/resources/db/migration/` 디렉토리와 버전 규칙(V2부터 실제 변경). Task 3이 여기에 `V2__mask_activity_log_text.sql`을 추가한다.

**배경:** 운영 프로필은 `ddl-auto: validate`라 새 테이블/컬럼을 추가할 수단이 없다. 로컬은 `ddl-auto: update`를 유지한다 — Flyway가 Hibernate보다 먼저 실행되므로 충돌하지 않는다. 기존 DB(로컬·운영 모두 데이터 있음)는 `baseline-on-migrate`로 V1에 베이스라인을 찍고, 실제 마이그레이션은 V2부터 시작한다.

- [ ] **Step 1: build.gradle에 Flyway 의존성 추가**

`backend/build.gradle`의 `dependencies` 블록에서 `// PostgreSQL Driver` 주석 바로 위에 추가:

```gradle
    // Flyway (DB 스키마 마이그레이션) — Postgres 15+는 flyway-database-postgresql 필요
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

```

- [ ] **Step 2: application.yml에 Flyway 설정 추가**

`backend/src/main/resources/application.yml`에서 `jpa:` 블록 바로 아래(같은 `spring:` 하위)에 추가:

```yaml
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: "1"
    locations: classpath:db/migration
```

- [ ] **Step 3: V1 베이스라인 파일 생성**

`backend/src/main/resources/db/migration/V1__baseline.sql`:

```sql
-- Baseline: 기존 스키마는 Hibernate(ddl-auto)가 생성했다.
-- 데이터가 이미 있는 DB는 baseline-on-migrate로 V1에 베이스라인이 찍히고 이 파일은 실행되지 않는다.
-- 빈 로컬 DB에서는 이 파일이 no-op으로 실행되고, 엔티티 테이블은 이후 Hibernate(ddl-auto: update)가 만든다.
-- 이 시점 이후 모든 스키마 변경은 V2+ 마이그레이션으로 관리한다.
SELECT 1;
```

- [ ] **Step 4: 컴파일 확인**

Run: `cd backend && ./gradlew build -x test`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: 로컬 기동으로 베이스라인 검증**

Run: `cd backend && ./gradlew bootRun` (별도 터미널, 로컬 Postgres/Redis 필요. 기동 로그에 `Successfully baselined schema with version: 1` 확인 후 Ctrl+C)

Run: `PGPASSWORD=dumpit psql -h localhost -U dumpit -d dumpit -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"`
Expected: `1 | << Flyway Baseline >> | t` 1행

- [ ] **Step 6: Commit**

```bash
git add backend/build.gradle backend/src/main/resources/application.yml backend/src/main/resources/db/migration/V1__baseline.sql
git commit -m "Chore: Flyway 도입 - 스키마 마이그레이션 체계 구축 (기존 DB는 V1 baseline)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 스냅샷 원문 마스킹 (SnapshotText 유틸 + 4개 서비스 적용)

**Files:**
- Create: `backend/src/main/java/com/dumpit/common/SnapshotText.java`
- Create: `backend/src/test/java/com/dumpit/common/SnapshotTextTest.java`
- Modify: `backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java:338-339`
- Modify: `backend/src/main/java/com/dumpit/service/impl/BrainDumpServiceImpl.java:120-121`
- Modify: `backend/src/main/java/com/dumpit/service/impl/IdeaServiceImpl.java:244-245,258-259`
- Modify: `backend/src/main/java/com/dumpit/service/impl/RoutineServiceImpl.java:345-346,368-369`

**Interfaces:**
- Consumes: 없음
- Produces: `public static void SnapshotText.putMasked(Map<String, Object> values, String key, String raw)` — `values`에 `key + "Length"`(Integer 또는 null)를 넣는다. 이후 스냅샷 JSON에는 `title`/`description`/`content`/`name` 원문 키가 존재하지 않고 `titleLength` 등만 존재한다. Task 4의 분류기는 이 `*Length` 키를 사용한다.

**배경:** `activity_logs.before_json/after_json`에 할 일 제목·설명 원문(건강·법률 등 민감정보 가능)이 평문으로 쌓이고 있다. 원문 대신 길이만 남긴다. 부작용: 관리자 화면/디버깅에서 로그만으로 내용 확인 불가(의도된 트레이드오프), 길이가 같은 내용 수정은 Task 4 분류기가 감지 못함(허용).

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/dumpit/common/SnapshotTextTest.java`:

```java
package com.dumpit.common;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SnapshotTextTest {

    @Test
    void 원문_대신_길이만_기록한다() {
        Map<String, Object> values = new LinkedHashMap<>();
        SnapshotText.putMasked(values, "title", "김철수 변호사에게 소송 자료 보내기");

        assertThat(values).containsEntry("titleLength", "김철수 변호사에게 소송 자료 보내기".length());
        assertThat(values).doesNotContainKey("title");
    }

    @Test
    void null_원문은_길이도_null로_기록한다() {
        Map<String, Object> values = new LinkedHashMap<>();
        SnapshotText.putMasked(values, "description", null);

        assertThat(values).containsEntry("descriptionLength", null);
        assertThat(values).doesNotContainKey("description");
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.common.SnapshotTextTest"`
Expected: 컴파일 실패 — `SnapshotText` 클래스 없음

- [ ] **Step 3: 구현**

`backend/src/main/java/com/dumpit/common/SnapshotText.java`:

```java
package com.dumpit.common;

import java.util.Map;

/**
 * activity_logs 스냅샷에는 민감할 수 있는 원문 텍스트를 남기지 않는다.
 * 원문 대신 길이 메타데이터만 기록한다. (예: title -> titleLength)
 */
public final class SnapshotText {

    private SnapshotText() {}

    public static void putMasked(Map<String, Object> values, String key, String raw) {
        values.put(key + "Length", raw == null ? null : raw.length());
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.common.SnapshotTextTest"`
Expected: PASS (2 tests)

- [ ] **Step 5: TaskServiceImpl 스냅샷 교체**

`TaskServiceImpl.java`의 `snapshot(Task task)` 메서드(335행 부근)에서:

```java
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
```

를 다음으로 교체:

```java
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
```

파일 상단 import에 `import com.dumpit.common.SnapshotText;` 추가.

- [ ] **Step 6: BrainDumpServiceImpl 스냅샷 교체**

`BrainDumpServiceImpl.java` 120-121행:

```java
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
```

를 다음으로 교체 (import 추가 동일):

```java
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
```

- [ ] **Step 7: IdeaServiceImpl 스냅샷 교체 (2곳)**

`IdeaServiceImpl.java` 244-245행:

```java
        values.put("title", idea.getTitle());
        values.put("content", idea.getContent());
```

→

```java
        SnapshotText.putMasked(values, "title", idea.getTitle());
        SnapshotText.putMasked(values, "content", idea.getContent());
```

같은 파일 258-259행:

```java
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
```

→

```java
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
```

import 추가 동일.

- [ ] **Step 8: RoutineServiceImpl 스냅샷 교체 (2곳)**

`RoutineServiceImpl.java` 345-346행:

```java
        values.put("name", routine.getName());
        values.put("description", routine.getDescription());
```

→

```java
        SnapshotText.putMasked(values, "name", routine.getName());
        SnapshotText.putMasked(values, "description", routine.getDescription());
```

같은 파일 368-369행:

```java
        values.put("title", task.getTitle());
        values.put("description", task.getDescription());
```

→

```java
        SnapshotText.putMasked(values, "title", task.getTitle());
        SnapshotText.putMasked(values, "description", task.getDescription());
```

import 추가 동일.

- [ ] **Step 9: 컴파일 + 원문 잔존 검사**

Run: `cd backend && ./gradlew build -x test`
Expected: `BUILD SUCCESSFUL`

Run: `grep -rn 'values.put("title"\|values.put("description"\|values.put("content"\|values.put("name"' backend/src/main/java/com/dumpit/service/impl/`
Expected: 출력 없음 (스냅샷에 원문을 넣는 코드가 남아 있으면 안 됨)

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/dumpit/common/SnapshotText.java backend/src/test/java/com/dumpit/common/SnapshotTextTest.java backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java backend/src/main/java/com/dumpit/service/impl/BrainDumpServiceImpl.java backend/src/main/java/com/dumpit/service/impl/IdeaServiceImpl.java backend/src/main/java/com/dumpit/service/impl/RoutineServiceImpl.java
git commit -m "Fix: activity_logs 스냅샷에서 민감 원문 제거, 길이 메타데이터로 대체

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 기존 activity_logs 원문 제거 마이그레이션 (V2)

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__mask_activity_log_text.sql`

**Interfaces:**
- Consumes: Task 1의 Flyway 설정 (V2부터 실행됨)
- Produces: 기존 `activity_logs` 행의 `before_json`/`after_json`에서 `title`, `description`, `content`, `name` 키 제거

**주의: 비가역 작업.** 실행 전 백업 필수. 빈 DB(테이블 없음)에서도 실패하지 않도록 `to_regclass` 가드를 쓴다.

- [ ] **Step 1: 로컬 DB 백업**

Run: `PGPASSWORD=dumpit pg_dump -h localhost -U dumpit dumpit > ../backup_before_v2_$(date +%Y%m%d).sql` (backend/에서 실행 시 리포 루트에 저장됨. 백업 파일은 커밋하지 말 것)
Expected: 종료 코드 0, 파일 생성 확인 `ls -la ../backup_before_v2_*.sql`

- [ ] **Step 2: 마이그레이션 파일 작성**

`backend/src/main/resources/db/migration/V2__mask_activity_log_text.sql`:

```sql
-- activity_logs 스냅샷 JSON에서 원문 텍스트(title/description/content/name) 제거.
-- 민감정보(건강/법률/재무 등)가 평문으로 남는 것을 차단한다. 비가역 작업 — 실행 전 백업 필수.
-- 빈 DB에서는 activity_logs가 아직 없을 수 있으므로 가드한다.
DO $$
BEGIN
    IF to_regclass('public.activity_logs') IS NOT NULL THEN
        UPDATE activity_logs
        SET before_json = (before_json::jsonb - 'title' - 'description' - 'content' - 'name')::text
        WHERE before_json IS NOT NULL
          AND before_json::jsonb ?| array['title', 'description', 'content', 'name'];

        UPDATE activity_logs
        SET after_json = (after_json::jsonb - 'title' - 'description' - 'content' - 'name')::text
        WHERE after_json IS NOT NULL
          AND after_json::jsonb ?| array['title', 'description', 'content', 'name'];
    END IF;
END $$;
```

- [ ] **Step 3: 로컬 기동으로 마이그레이션 실행**

Run: `cd backend && ./gradlew bootRun` (기동 로그에 `Migrating schema "public" to version "2 - mask activity log text"` 확인 후 Ctrl+C)

- [ ] **Step 4: 원문 제거 검증**

Run: `PGPASSWORD=dumpit psql -h localhost -U dumpit -d dumpit -c "SELECT count(*) FROM activity_logs WHERE (before_json IS NOT NULL AND before_json::jsonb ?| array['title','description','content','name']) OR (after_json IS NOT NULL AND after_json::jsonb ?| array['title','description','content','name']);"`
Expected: `0`

Run: `PGPASSWORD=dumpit psql -h localhost -U dumpit -d dumpit -c "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;"`
Expected: V1 baseline + `2 | t`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V2__mask_activity_log_text.sql
git commit -m "Fix: 기존 activity_logs 스냅샷의 민감 원문 제거 마이그레이션 (V2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: 운영 배포 메모 (실행하지 않음)**

운영(Supabase) 배포 시: Supabase 대시보드에서 백업 확인 → 배포하면 부팅 시 자동으로 V2가 적용된다. 이 단계는 사용자 승인 후 별도로 진행한다.

---

### Task 4: TaskChangeClassifier — 이벤트 세분화

**Files:**
- Create: `backend/src/main/java/com/dumpit/service/impl/TaskChangeClassifier.java`
- Create: `backend/src/test/java/com/dumpit/service/impl/TaskChangeClassifierTest.java`
- Modify: `backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java:151` (updateTask의 activityLogService.record 호출)

**Interfaces:**
- Consumes: Task 2 이후의 스냅샷 키 (`titleLength`, `descriptionLength` — 원문 키 아님). 스냅샷 맵의 `status`/`category` 값은 enum 객체다.
- Produces: `static String TaskChangeClassifier.classify(Map<String, Object> before, Map<String, Object> after)` — `TASK_COMPLETED | TASK_REOPENED | TASK_STARTED | TASK_STATUS_CHANGED | TASK_RESCHEDULED | TASK_PRIORITY_CHANGED | TASK_CATEGORY_CHANGED | TASK_CONTENT_UPDATED | TASK_UPDATED` 중 하나를 반환.

**배경:** 현재 `TASK_UPDATED` 하나에 상태/일정/우선순위/내용 변경이 모두 섞여, 나중에 분석하려면 JSON diff가 필요하다. 여러 변경이 한 요청에 섞이면 학습 신호 가치 순(완료 > 재오픈 > 시작 > 상태 > 일정 > 우선순위 > 카테고리 > 내용)으로 대표 액션 하나를 고른다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/dumpit/service/impl/TaskChangeClassifierTest.java`:

```java
package com.dumpit.service.impl;

import com.dumpit.entity.Task;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TaskChangeClassifierTest {

    private Map<String, Object> baseSnapshot() {
        Map<String, Object> m = new HashMap<>();
        m.put("status", Task.Status.TODO);
        m.put("category", Task.Category.WORK);
        m.put("deadline", LocalDateTime.of(2026, 7, 10, 23, 59));
        m.put("startTime", null);
        m.put("endTime", null);
        m.put("estimatedMinutes", 60);
        m.put("userPriorityScore", null);
        m.put("titleLength", 10);
        m.put("descriptionLength", null);
        return m;
    }

    @Test
    void 완료_전환은_TASK_COMPLETED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.DONE);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_COMPLETED");
    }

    @Test
    void 완료_해제는_TASK_REOPENED() {
        Map<String, Object> before = baseSnapshot();
        before.put("status", Task.Status.DONE);
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.TODO);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_REOPENED");
    }

    @Test
    void 진행_시작은_TASK_STARTED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.IN_PROGRESS);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_STARTED");
    }

    @Test
    void 그_외_상태_변경은_TASK_STATUS_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.CANCELLED);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_STATUS_CHANGED");
    }

    @Test
    void 마감_변경은_TASK_RESCHEDULED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("deadline", LocalDateTime.of(2026, 7, 12, 23, 59));

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_RESCHEDULED");
    }

    @Test
    void 사용자_우선순위_변경은_TASK_PRIORITY_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("userPriorityScore", 0.9);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_PRIORITY_CHANGED");
    }

    @Test
    void 카테고리_변경은_TASK_CATEGORY_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("category", Task.Category.HEALTH);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_CATEGORY_CHANGED");
    }

    @Test
    void 제목_길이_변경은_TASK_CONTENT_UPDATED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("titleLength", 25);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_CONTENT_UPDATED");
    }

    @Test
    void 변경_없으면_TASK_UPDATED() {
        assertThat(TaskChangeClassifier.classify(baseSnapshot(), baseSnapshot())).isEqualTo("TASK_UPDATED");
    }

    @Test
    void 완료와_일정_변경이_섞이면_완료가_우선한다() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.DONE);
        after.put("deadline", LocalDateTime.of(2026, 7, 12, 23, 59));

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_COMPLETED");
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.impl.TaskChangeClassifierTest"`
Expected: 컴파일 실패 — `TaskChangeClassifier` 없음

- [ ] **Step 3: 구현**

`backend/src/main/java/com/dumpit/service/impl/TaskChangeClassifier.java`:

```java
package com.dumpit.service.impl;

import com.dumpit.entity.Task;

import java.util.Map;
import java.util.Objects;

/**
 * TASK_UPDATED 하나에 뭉쳐 있던 변경을 세분화된 액션으로 분류한다.
 * 변경이 여러 종류 섞이면 학습 신호 가치가 큰 순서로 대표 액션 하나를 고른다:
 * 완료 > 재오픈 > 시작 > 상태 > 일정 > 우선순위 > 카테고리 > 내용.
 * 스냅샷에는 원문 대신 길이(titleLength 등)만 있으므로, 길이가 같은 내용 수정은 감지하지 못한다.
 */
final class TaskChangeClassifier {

    private TaskChangeClassifier() {}

    static String classify(Map<String, Object> before, Map<String, Object> after) {
        Object prevStatus = before.get("status");
        Object nextStatus = after.get("status");
        if (!Objects.equals(prevStatus, nextStatus)) {
            if (Task.Status.DONE.equals(nextStatus)) return "TASK_COMPLETED";
            if (Task.Status.DONE.equals(prevStatus)) return "TASK_REOPENED";
            if (Task.Status.IN_PROGRESS.equals(nextStatus)) return "TASK_STARTED";
            return "TASK_STATUS_CHANGED";
        }
        if (changed(before, after, "deadline") || changed(before, after, "startTime")
                || changed(before, after, "endTime") || changed(before, after, "estimatedMinutes")) {
            return "TASK_RESCHEDULED";
        }
        if (changed(before, after, "userPriorityScore")) return "TASK_PRIORITY_CHANGED";
        if (changed(before, after, "category")) return "TASK_CATEGORY_CHANGED";
        if (changed(before, after, "titleLength") || changed(before, after, "descriptionLength")) {
            return "TASK_CONTENT_UPDATED";
        }
        return "TASK_UPDATED";
    }

    private static boolean changed(Map<String, Object> before, Map<String, Object> after, String key) {
        return !Objects.equals(before.get(key), after.get(key));
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.impl.TaskChangeClassifierTest"`
Expected: PASS (10 tests)

- [ ] **Step 5: updateTask에 연결**

`TaskServiceImpl.java`의 `updateTask` 끝부분(151행 부근):

```java
        activityLogService.record(task.getUser(), "TASK_UPDATED", "TASK", saved.getTaskId(), before, snapshot(saved));
```

를 다음으로 교체:

```java
        Map<String, Object> after = snapshot(saved);
        activityLogService.record(task.getUser(), TaskChangeClassifier.classify(before, after), "TASK", saved.getTaskId(), before, after);
```

- [ ] **Step 6: 컴파일 + 전체 신규 테스트 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.impl.TaskChangeClassifierTest" --tests "com.dumpit.common.SnapshotTextTest"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/dumpit/service/impl/TaskChangeClassifier.java backend/src/test/java/com/dumpit/service/impl/TaskChangeClassifierTest.java backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java
git commit -m "Feat: 태스크 변경 로그 세분화 (TASK_COMPLETED/RESCHEDULED 등) - 학습 데이터 품질 개선

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: PriorityCalculator — 규칙 기반 동적 우선순위

**Files:**
- Create: `backend/src/main/java/com/dumpit/service/priority/PriorityCalculator.java`
- Create: `backend/src/test/java/com/dumpit/service/priority/PriorityCalculatorTest.java`
- Modify: `backend/src/main/java/com/dumpit/dto/TaskResponse.java:38`

**Interfaces:**
- Consumes: `Task` 엔티티의 `getUserPriorityScore()`, `getAiPriorityScore()`, `getDeadline()`
- Produces: `public static Double PriorityCalculator.effectivePriority(Task task, LocalDateTime now)`, `static double urgencyScore(LocalDateTime deadline, LocalDateTime now)` (패키지 내 테스트용)

**배경:** 현재 우선순위는 생성 시점 LLM 점수로 박제되어, 마감이 코앞이어도 점수가 안 올라간다. 조회 시점에 `긴급도(마감 거리, 결정적) 0.6 + 중요도(LLM 점수) 0.4`를 합성한다. 사용자가 직접 지정한 점수는 무조건 우선(사용자 통제권). 프런트는 응답의 `effectivePriority`로 정렬하므로 `TaskResponse.from` 한 곳만 바꾸면 전파된다. 코인 계산(`calcCompletionCoins`)과 DB 쿼리 ORDER BY는 저장 점수 기반으로 유지한다(변경 금지 — DB 정렬은 1차 정렬일 뿐이고 최종 정렬은 프런트가 한다).

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/dumpit/service/priority/PriorityCalculatorTest.java`:

```java
package com.dumpit.service.priority;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class PriorityCalculatorTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 7, 12, 0);

    private Task task(Double userScore, Double aiScore, LocalDateTime deadline) {
        Task t = Task.of(new User(), "t", null, deadline, null);
        t.setUserPriorityScore(userScore);
        t.setAiPriorityScore(aiScore);
        return t;
    }

    @Test
    void 사용자_지정_점수가_있으면_그_값을_그대로_쓴다() {
        Task t = task(0.9, 0.1, NOW.plusDays(30));
        assertThat(PriorityCalculator.effectivePriority(t, NOW)).isEqualTo(0.9);
    }

    @Test
    void 긴급도와_중요도를_가중_합성한다() {
        // 마감 지남(긴급도 1.0), 중요도 0.5 → 0.6*1.0 + 0.4*0.5 = 0.8
        Task t = task(null, 0.5, NOW.minusHours(1));
        assertThat(PriorityCalculator.effectivePriority(t, NOW)).isEqualTo(0.8, within(1e-9));
    }

    @Test
    void 중요도가_없으면_기본값_0_5를_쓴다() {
        Task overdue = task(null, null, NOW.minusHours(1));
        assertThat(PriorityCalculator.effectivePriority(overdue, NOW)).isEqualTo(0.8, within(1e-9));
    }

    @Test
    void 마감이_가까울수록_긴급도가_높다() {
        double overdue = PriorityCalculator.urgencyScore(NOW.minusMinutes(1), NOW);
        double inOneHour = PriorityCalculator.urgencyScore(NOW.plusMinutes(30), NOW);
        double today = PriorityCalculator.urgencyScore(NOW.plusHours(10), NOW);
        double in3Days = PriorityCalculator.urgencyScore(NOW.plusDays(2), NOW);
        double in7Days = PriorityCalculator.urgencyScore(NOW.plusDays(5), NOW);
        double later = PriorityCalculator.urgencyScore(NOW.plusDays(30), NOW);
        double none = PriorityCalculator.urgencyScore(null, NOW);

        assertThat(overdue).isEqualTo(1.0);
        assertThat(inOneHour).isLessThan(overdue);
        assertThat(today).isLessThan(inOneHour);
        assertThat(in3Days).isLessThan(today);
        assertThat(in7Days).isLessThan(in3Days);
        assertThat(later).isLessThan(in7Days);
        assertThat(none).isLessThan(later);
    }

    @Test
    void 같은_태스크라도_시간이_지나면_우선순위가_올라간다() {
        Task t = task(null, 0.5, NOW.plusDays(2));
        Double early = PriorityCalculator.effectivePriority(t, NOW);
        Double nearDeadline = PriorityCalculator.effectivePriority(t, NOW.plusDays(2).minusMinutes(30));
        assertThat(nearDeadline).isGreaterThan(early);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.priority.PriorityCalculatorTest"`
Expected: 컴파일 실패 — `PriorityCalculator` 없음

- [ ] **Step 3: 구현**

`backend/src/main/java/com/dumpit/service/priority/PriorityCalculator.java`:

```java
package com.dumpit.service.priority;

import com.dumpit.entity.Task;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 조회 시점에 규칙 기반 긴급도와 AI 중요도를 합성해 우선순위를 계산한다.
 * - userPriorityScore가 있으면 무조건 그 값을 쓴다 (사용자 통제권 우선).
 * - 긴급도는 마감까지 남은 시간으로 결정적으로 계산되므로 시간이 지나면 자동으로 올라간다.
 * - aiPriorityScore는 LLM이 평가한 "중요도"다 (프롬프트 priority-v2부터 긴급도 미반영).
 */
public final class PriorityCalculator {

    static final double URGENCY_WEIGHT = 0.6;
    static final double IMPORTANCE_WEIGHT = 0.4;
    static final double DEFAULT_IMPORTANCE = 0.5;
    static final double NO_DEADLINE_URGENCY = 0.15;

    private PriorityCalculator() {}

    public static Double effectivePriority(Task task, LocalDateTime now) {
        if (task.getUserPriorityScore() != null) {
            return task.getUserPriorityScore();
        }
        double importance = task.getAiPriorityScore() != null ? task.getAiPriorityScore() : DEFAULT_IMPORTANCE;
        double urgency = urgencyScore(task.getDeadline(), now);
        return URGENCY_WEIGHT * urgency + IMPORTANCE_WEIGHT * importance;
    }

    static double urgencyScore(LocalDateTime deadline, LocalDateTime now) {
        if (deadline == null) return NO_DEADLINE_URGENCY;
        long minutesLeft = Duration.between(now, deadline).toMinutes();
        if (minutesLeft <= 0) return 1.0;
        if (minutesLeft <= 60) return 0.95;
        if (minutesLeft <= 60 * 24) return 0.85;
        if (minutesLeft <= 60 * 24 * 3) return 0.6;
        if (minutesLeft <= 60 * 24 * 7) return 0.4;
        return 0.25;
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.priority.PriorityCalculatorTest"`
Expected: PASS (5 tests)

- [ ] **Step 5: TaskResponse에 연결**

`backend/src/main/java/com/dumpit/dto/TaskResponse.java`의 `from` 메서드에서:

```java
                t.getEffectivePriority(),
```

를 다음으로 교체:

```java
                PriorityCalculator.effectivePriority(t, LocalDateTime.now()),
```

import에 `import com.dumpit.service.priority.PriorityCalculator;` 추가.

- [ ] **Step 6: 컴파일 확인**

Run: `cd backend && ./gradlew build -x test`
Expected: `BUILD SUCCESSFUL` (참고: `Task.getEffectivePriority()`는 코인 계산에서 계속 쓰이므로 삭제하지 않는다)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/dumpit/service/priority/PriorityCalculator.java backend/src/test/java/com/dumpit/service/priority/PriorityCalculatorTest.java backend/src/main/java/com/dumpit/dto/TaskResponse.java
git commit -m "Feat: 조회 시점 규칙 기반 동적 우선순위 (긴급도 0.6 + AI 중요도 0.4 합성)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 우선순위 프롬프트 v2 + structured outputs + 타임아웃

**Files:**
- Modify: `backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java`
- Create: `backend/src/test/java/com/dumpit/service/impl/OpenAiServiceImplTest.java`

**Interfaces:**
- Consumes: Task 5의 합성 구조 (aiPriorityScore = 중요도라는 새 의미)
- Produces: `OpenAiService` 인터페이스는 그대로. 내부적으로 `static Map<String, Object> OpenAiServiceImpl.priorityResponseFormat()` (테스트용 package-private), 프롬프트 버전 상수 `PRIORITY_PROMPT_VERSION = "priority-v2"`

**배경:** Task 5에서 긴급도를 규칙으로 계산하므로, LLM 점수가 긴급도까지 반영하면 이중 계산이 된다. 프롬프트를 "중요도만 평가"로 바꾸고 버전을 `priority-v2`로 태깅한다(로그로 남김 — DB 영속화는 추천 스냅샷 테이블이 생기는 후속 플랜에서). 파싱 안정성을 위해 scorePriority에 structured outputs(json_schema strict)를 적용하고, 무한 대기 방지용 타임아웃(연결 5초/읽기 30초)을 RestClient에 설정한다. 다른 4개 프롬프트의 json_schema 전환은 후속 작업(YAGNI).

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/dumpit/service/impl/OpenAiServiceImplTest.java`:

```java
package com.dumpit.service.impl;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiServiceImplTest {

    @Test
    @SuppressWarnings("unchecked")
    void 우선순위_응답은_strict_json_schema를_쓴다() {
        Map<String, Object> format = OpenAiServiceImpl.priorityResponseFormat();

        assertThat(format.get("type")).isEqualTo("json_schema");
        Map<String, Object> jsonSchema = (Map<String, Object>) format.get("json_schema");
        assertThat(jsonSchema.get("strict")).isEqualTo(true);

        Map<String, Object> schema = (Map<String, Object>) jsonSchema.get("schema");
        assertThat((List<String>) schema.get("required"))
                .containsExactlyInAnyOrder("score", "category", "reason");

        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        Map<String, Object> category = (Map<String, Object>) properties.get("category");
        assertThat((List<String>) category.get("enum")).containsExactlyInAnyOrder(
                "WORK", "STUDY", "APPOINTMENT", "CHORE", "ROUTINE", "HEALTH", "HOBBY", "OTHER");
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.impl.OpenAiServiceImplTest"`
Expected: 컴파일 실패 — `priorityResponseFormat()` 없음

- [ ] **Step 3: OpenAiServiceImpl 수정 — 응답 포맷 빌더와 버전 상수 추가**

`OpenAiServiceImpl.java` 클래스 상단 필드 영역(`DATA_BOUNDARY_RULE` 아래)에 추가:

```java
    static final String PRIORITY_PROMPT_VERSION = "priority-v2";
```

클래스 안(예: `buildUrgencyInfo` 자리)에 추가:

```java
    static Map<String, Object> priorityResponseFormat() {
        Map<String, Object> schema = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("score", "category", "reason"),
                "properties", Map.of(
                        "score", Map.of("type", "number"),
                        "category", Map.of("type", "string",
                                "enum", List.of("WORK", "STUDY", "APPOINTMENT", "CHORE", "ROUTINE", "HEALTH", "HOBBY", "OTHER")),
                        "reason", Map.of("type", "string")
                )
        );
        return Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", "priority_result",
                        "strict", true,
                        "schema", schema
                )
        );
    }
```

- [ ] **Step 4: callChatApi에 responseFormat 파라미터 추가**

기존 `callChatApi(String userPrompt, String systemPrompt)` 메서드를 다음 두 개로 교체:

```java
    private String callChatApi(String userPrompt, String systemPrompt) {
        return callChatApi(userPrompt, systemPrompt, Map.of("type", "json_object"));
    }

    private String callChatApi(String userPrompt, String systemPrompt, Map<String, Object> responseFormat) {
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.3,
                "response_format", responseFormat
        );

        try {
            String raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            ChatResponse response = objectMapper.readValue(raw, ChatResponse.class);
            return response.choices().get(0).message().content();
        } catch (RestClientResponseException e) {
            log.error("OpenAI API error - status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("OpenAI service response error");
        } catch (Exception e) {
            log.error("Unexpected error while calling OpenAI", e);
            throw new RuntimeException("AI connection failed");
        }
    }
```

- [ ] **Step 5: scorePriority 프롬프트를 중요도 전용 v2로 교체**

`scorePriority` 메서드 본문 전체를 다음으로 교체 (긴급도 안내·Urgency summary 제거, 버전 로그 추가, structured outputs 적용):

```java
    @Override
    public PriorityResult scorePriority(String title, String description,
                                        LocalDateTime deadline, Integer estimatedMinutes) {
        log.info("scorePriority prompt={}", PRIORITY_PROMPT_VERSION);
        String prompt = """
            You are the priority analysis engine for the Dumpit task management app.
            Analyze the task and return only valid JSON in this shape:
            {"score": 0.0_to_1.0, "category": "WORK|STUDY|APPOINTMENT|CHORE|ROUTINE|HEALTH|HOBBY|OTHER", "reason": "short explanation"}

            Scoring guidance:
            - score measures IMPORTANCE only: likely impact, consequences of not doing it, and how essential it is to the user's life or obligations.
            - Do NOT factor in deadline urgency or time pressure. Urgency is computed separately by the system.
            - Higher score means more important.
            - If the task is unclear, use 0.5.

            Category rules:
            - WORK: job, project, reporting, office tasks
            - STUDY: class, exam prep, homework, certification study
            - APPOINTMENT: meetings, reservations, interviews, fixed-time commitments
            - CHORE: cleaning, shopping, errands, home maintenance
            - ROUTINE: recurring habits and repeated personal upkeep
            - HEALTH: exercise, hospital visits, medication, wellness
            - HOBBY: games, entertainment, leisure, social fun
            - OTHER: anything not clearly matching the above

            <user_input>
            Title: %s
            Description: %s
            Estimated minutes: %s
            </user_input>
            """.formatted(
                title,
                description != null ? description : "none",
                estimatedMinutes != null ? estimatedMinutes : "unknown"
        );

        try {
            String json = callChatApi(prompt, DATA_BOUNDARY_RULE, priorityResponseFormat());
            PriorityResult result = objectMapper.readValue(json, PriorityResult.class);
            return new PriorityResult(
                    clamp(result.score(), 0.0, 1.0),
                    safeCategory(result.category()),
                    trimToLimit(result.reason(), 300)
            );
        } catch (Exception e) {
            log.error("Priority analysis failed: {}", e.getMessage());
            return new PriorityResult(0.5, "OTHER", "Fallback used because AI analysis failed.");
        }
    }
```

참고: `deadline` 파라미터는 인터페이스 유지를 위해 시그니처에 남기되 프롬프트에서 사용하지 않는다(긴급도는 PriorityCalculator 담당). 이제 사용처가 없어진 `buildUrgencyInfo` 메서드와 `Duration`/`DISPLAY_FORMAT` 중 사용처 없는 import는 삭제한다 (`DISPLAY_FORMAT`은 `analyzeBrainDump`에서 계속 쓰므로 유지).

- [ ] **Step 6: RestClient 타임아웃 설정**

생성자의 `this.restClient = RestClient.builder()...` 부분을 다음으로 교체:

```java
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .requestFactory(ClientHttpRequestFactoryBuilder.detect()
                        .build(ClientHttpRequestFactorySettings.defaults()
                                .withConnectTimeout(Duration.ofSeconds(5))
                                .withReadTimeout(Duration.ofSeconds(30))))
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
```

import 추가:

```java
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
```

(`java.time.Duration`은 기존 import 유지 — 여기서 다시 사용한다.)

- [ ] **Step 7: 테스트 통과 + 컴파일 확인**

Run: `cd backend && ./gradlew test --tests "com.dumpit.service.impl.OpenAiServiceImplTest"`
Expected: PASS (1 test)

Run: `cd backend && ./gradlew build -x test`
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 8: 실제 API 스모크 테스트 (OPENAI_API_KEY 필요, 로컬 수동)**

Run: `cd backend && ./gradlew bootRun` 후 앱에서 태스크 1개 생성(또는 재분석)하고 로그 확인.
Expected: `scorePriority prompt=priority-v2` 로그가 찍히고, 태스크에 0~1 사이 점수와 카테고리가 정상 저장됨. OpenAI 4xx 에러가 없어야 함(json_schema 요청이 거부되면 여기서 드러난다).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java backend/src/test/java/com/dumpit/service/impl/OpenAiServiceImplTest.java
git commit -m "Feat: 우선순위 프롬프트 v2 (중요도 전용) + structured outputs + OpenAI 호출 타임아웃

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 후속 플랜 (이 플랜 범위 밖)

1. **추천 스냅샷 + 사용자 반응 로그**: `priority_recommendations` / `task_recommendation_items` 테이블(V3+ 마이그레이션), 조회 시점 우선순위 계산 결과를 rank/score/urgency/importance/promptVersion과 함께 기록. 학습 데이터 opt-in 동의 UI·정책과 함께 별도 플랜으로.
2. **나머지 4개 프롬프트의 json_schema 전환** (subtask/braindump/idea/schedule).
3. **`tasks.title/description` 암호화 검토** (키 관리 정책 결정 후).
4. **통계 기반 개인화**: 카테고리별 완료율·시간대 패턴 집계를 긴급도/중요도 가중치에 반영.
