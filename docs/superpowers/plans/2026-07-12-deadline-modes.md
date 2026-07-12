# 마감 모드 4지선다 + 슬롯 파생 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 태스크 생성·수정에서 마감을 명시적 4모드(AI 판별/오늘까지/언젠가/직접 입력)로 받고, 타임테이블 시절의 시간 파생 로직을 제거해 n박 일정과 기한 없는 일이 등록되게 한다.

**Architecture:** 백엔드는 `noDeadline` boolean이 DTO→컨트롤러→서비스로 흐르고, `TaskServiceImpl.inferScheduleIfNeeded`가 슬롯 산술(시작~마감 간격→예상시간, 마감−예상시간→시작) 없이 "단서 기반 AI 추론 또는 그대로 통과"만 한다. 프론트는 공용 `DeadlineModeField` 칩 컴포넌트를 AddTaskModal/EditTaskModal이 공유한다.

**Tech Stack:** Spring Boot(Java 21) + JUnit5/Mockito/AssertJ, React(Vite) + Tailwind

**스펙 문서:** `docs/superpowers/specs/2026-07-12-deadline-modes-design.md`

## Global Constraints

- 작업 브랜치: `feature/deadline-modes` (dev에서 분기, 이미 생성됨). 커밋 접두어는 저장소 관례 `Feat:|Fix:|Test:|Docs:` + 한국어 요약, 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 백엔드 테스트 실행(PowerShell, 반드시 JDK21):
  `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon`
  (기본 JDK25는 Gradle 8.11.1과 비호환 — "Type T not present" 에러)
- `application-local.yml`/`application-prod.yml`은 gitignore된 시크릿 — **절대 커밋 금지**
- `validateSchedule`의 검증 3종(예상시간 1~1440분, 마감>시작, 미래 마감)은 그대로 유지
- `estimatedMinutes`의 의미는 "집중 작업량"(시작~마감 간격이 아님)
- 프론트는 자동 테스트 없음 → 각 프론트 태스크의 검증은 `cd C:\coding\dumpit\frontend; npm run build` 통과
- 칩 카피(스펙 확정값): `✨ AI가 알아서` / `오늘까지` / `🌙 언젠가` / `📅 직접 입력`
- 로컬에 OPENAI_API_KEY 없음 — AI 실응답 검증은 배포 후 스모크 테스트로 이연

---

### Task 1: 백엔드 — 슬롯 파생 로직 제거 (`inferScheduleIfNeeded` 단순화)

**Files:**
- Modify: `backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java:276-318` (inferScheduleIfNeeded)
- Test: `backend/src/test/java/com/dumpit/service/impl/TaskServiceImplTest.java`

**Interfaces:**
- Consumes: `OpenAiService.inferSchedule(String, String, LocalDateTime, LocalDateTime, Integer)` → `ScheduleInferenceResult(String startTime, String deadline, Integer estimatedMinutes, String reason)` (기존 그대로)
- Produces: `inferScheduleIfNeeded`는 이 태스크에서는 **시그니처 불변**(5개 인자). 동작만 변경: ① 마감+시작 또는 마감+예상시간이 있으면 AI 호출 없이 입력값 그대로 통과(파생 없음, 빈 필드는 null 유지) ② 그 외에는 AI 추론 결과로 빈 필드만 채움 ③ 산술 파생(간격→예상시간, 역산→시작시간, 시작+예상→마감) 전부 삭제. Task 2가 여기에 `noDeadline` 인자를 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`TaskServiceImplTest.java`에서 기존 테스트 `마감만_입력한_태스크는_시작시간이_파생되어도_고정되지_않는다`(55-66행)를 아래로 **교체**하고, 새 테스트 3개를 추가한다:

```java
    @Test
    void 마감만_입력하면_시작시간을_역산하지_않는다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(null, null, 120, "추론"));
        LocalDateTime deadline = LocalDateTime.now().plusHours(8);

        Task saved = taskService.createTask(EMAIL, "보고서 쓰기", null,
                deadline, null, null, null, null, Task.Category.WORK);

        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEndTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(120);
        assertThat(saved.getIsLocked()).isFalse();
    }

    @Test
    void 시작과_마감이_모두_있으면_예상시간을_간격으로_파생하지_않는다() {
        // n박 일정: 파생이 있으면 4320분이 계산돼 1440분 검증에서 BadRequest가 터진다
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime deadline = LocalDateTime.now().plusDays(3);

        Task saved = taskService.createTask(EMAIL, "제주 여행", null,
                deadline, null, start, null, null, Task.Category.OTHER);

        assertThat(saved.getEstimatedMinutes()).isNull();
        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getDeadline()).isEqualTo(deadline);
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }

    @Test
    void 마감과_예상시간이_있으면_시작시간을_역산하지_않는다() {
        LocalDateTime deadline = LocalDateTime.now().plusHours(8);

        Task saved = taskService.createTask(EMAIL, "보고서 쓰기", null,
                deadline, 90, null, null, null, Task.Category.WORK);

        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEndTime()).isNull();
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }

    @Test
    void 예상시간만_입력하면_단서_없을때_마감이_생기지_않는다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(null, null, null, "단서 없음"));

        Task saved = taskService.createTask(EMAIL, "기타 연습", null,
                null, 60, null, null, null, Task.Category.OTHER);

        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(60);
    }
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon --tests "com.dumpit.service.impl.TaskServiceImplTest"`
Expected: FAIL — `시작과_마감이_모두_있으면...`은 BadRequestException(1440분 초과), `마감만_입력하면...`·`마감과_예상시간이...`는 startTime이 null이 아니어서 실패

- [ ] **Step 3: `inferScheduleIfNeeded` 교체**

`TaskServiceImpl.java`의 `inferScheduleIfNeeded` 메서드(276-318행) 전체를 아래로 교체:

```java
    private ScheduleFields inferScheduleIfNeeded(String title, String description,
                                                 LocalDateTime startTime,
                                                 LocalDateTime deadline,
                                                 Integer estimatedMinutes) {
        // 마감이 확정돼 있고 다른 시간 정보도 있으면 AI 호출 없이 그대로 사용.
        // 시작~마감 간격을 예상시간으로 환산하던 슬롯 파생은 하지 않는다 — 예상시간은 집중 작업량 의미
        if (deadline != null && (startTime != null || estimatedMinutes != null)) {
            return new ScheduleFields(startTime, deadline, estimatedMinutes);
        }
        OpenAiService.ScheduleInferenceResult inferred =
                openAiService.inferSchedule(title, description, startTime, deadline, estimatedMinutes);
        return new ScheduleFields(
                startTime != null ? startTime : parseDateTime(inferred.startTime()),
                deadline != null ? deadline : parseDateTime(inferred.deadline()),
                estimatedMinutes != null ? estimatedMinutes : inferred.estimatedMinutes());
    }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: Step 2와 동일 명령
Expected: PASS (기존 테스트 `시작시간을_직접_입력한_태스크는_고정된다`, `updateSticker_*` 포함 전부)

- [ ] **Step 5: 커밋**

```powershell
cd C:\coding\dumpit; git add backend/src; git commit -m @'
Fix: 시작~마감 간격 파생 제거로 n박 일정 등록 허용

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: 백엔드 — `noDeadline`('언젠가' 선언) 플래그 전 구간

**Files:**
- Modify: `backend/src/main/java/com/dumpit/dto/TaskRequest.java`
- Modify: `backend/src/main/java/com/dumpit/service/TaskService.java` (createTask 시그니처, TaskUpdateFields 레코드)
- Modify: `backend/src/main/java/com/dumpit/service/impl/TaskServiceImpl.java` (createTask, updateTask, inferScheduleIfNeeded)
- Modify: `backend/src/main/java/com/dumpit/controller/TaskController.java` (POST 42-54행, PATCH 56-94행)
- Test: `backend/src/test/java/com/dumpit/service/impl/TaskServiceImplTest.java`

**Interfaces:**
- Consumes: Task 1의 `inferScheduleIfNeeded` (5-인자 버전)
- Produces:
  - `TaskRequest`에 `Boolean noDeadline` 필드 추가 (마지막 컴포넌트)
  - `TaskService.createTask(..., Task.Category category, boolean noDeadline)` — 10번째 인자 추가
  - `TaskService.TaskUpdateFields`의 18번째 컴포넌트로 `boolean noDeadline` 추가
  - `inferScheduleIfNeeded(title, description, startTime, deadline, estimatedMinutes, boolean noDeadline)` — 6-인자로 변경
  - API 계약: `POST /tasks`·`PATCH /tasks/{id}` body에 `noDeadline: true`가 오면 마감·시작시간을 추론하지 않음(마감 null 확정, 유저 입력 시작시간만 보존). `noDeadline: true` + `deadline` 값 동시 전송은 400

- [ ] **Step 1: 실패하는 테스트 작성**

`TaskServiceImplTest.java`에 추가 (컴파일을 위해 이 단계에서 기존 `createTask` 호출 5곳 모두에 마지막 인자 `false`를 추가한다 — Step 3에서 시그니처가 바뀌기 전까지는 컴파일 에러가 곧 "실패"다):

```java
    @Test
    void 언젠가_선언시_AI가_마감을_돌려줘도_버린다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(
                        "2099-01-01T10:00:00", "2099-01-01T12:00:00", 45, "추론"));

        Task saved = taskService.createTask(EMAIL, "언젠가 기타 배우기", null,
                null, null, null, null, null, Task.Category.OTHER, true);

        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(45);
    }

    @Test
    void 언젠가_선언시_예상시간이_있으면_AI를_호출하지_않는다() {
        Task saved = taskService.createTask(EMAIL, "책 읽기", null,
                null, 30, null, null, null, Task.Category.OTHER, true);

        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(30);
    }

    @Test
    void 언젠가_선언시_직접_입력한_시작시간은_보존된다() {
        LocalDateTime start = LocalDateTime.now().plusDays(2);

        Task saved = taskService.createTask(EMAIL, "동창 모임", null,
                null, 90, start, null, null, Task.Category.OTHER, true);

        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getIsLocked()).isTrue();
    }

    @Test
    void 언젠가와_마감을_동시에_보내면_예외() {
        assertThrows(BadRequestException.class, () ->
                taskService.createTask(EMAIL, "모순", null,
                        LocalDateTime.now().plusDays(1), null, null, null, null, Task.Category.OTHER, true));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void 수정에서_언젠가로_전환하면_재추론이_마감을_되살리지_않는다() {
        User user = User.of(EMAIL, "tester", "google", "pid");
        Task task = Task.of(user, "보고서", null, LocalDateTime.now().plusDays(1), 60);
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));

        Task saved = taskService.updateTask(EMAIL, taskId, new TaskService.TaskUpdateFields(
                null, null, false,      // title, description, hasDescription
                null, null, false,      // status, userPriorityScore, hasUserPriorityScore
                null, true,             // deadline(null 명시), hasDeadline
                null, false,            // estimatedMinutes, hasEstimatedMinutes
                null, false,            // startTime, hasStartTime
                null, false,            // endTime, hasEndTime
                null, false,            // isLocked, hasIsLocked
                null,                   // category
                true                    // noDeadline
        ));

        assertThat(saved.getDeadline()).isNull();
        // 기존 예상시간(60분)이 있으므로 AI 재추론 자체가 불필요
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }
```

임포트 추가 필요: `import com.dumpit.service.TaskService;`

- [ ] **Step 2: 컴파일 실패 확인**

Run: `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon --tests "com.dumpit.service.impl.TaskServiceImplTest"`
Expected: COMPILE FAIL — `createTask` 10-인자 오버로드 없음, `TaskUpdateFields` 18-인자 생성자 없음

- [ ] **Step 3: 구현**

**3a. `TaskRequest.java`** — 레코드 마지막에 필드 추가:

```java
public record TaskRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        LocalDateTime deadline,
        Integer estimatedMinutes,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isLocked,
        Task.Category category,
        Boolean noDeadline
) {}
```

**3b. `TaskService.java`** — createTask 시그니처와 TaskUpdateFields:

```java
    Task createTask(String email, String title, String description,
                    LocalDateTime deadline, Integer estimatedMinutes,
                    LocalDateTime startTime, LocalDateTime endTime,
                    Boolean isLocked, Task.Category category, boolean noDeadline);
```

```java
    record TaskUpdateFields(
            String title,
            String description,
            boolean hasDescription,
            String status,
            Double userPriorityScore,
            boolean hasUserPriorityScore,
            LocalDateTime deadline,
            boolean hasDeadline,
            Integer estimatedMinutes,
            boolean hasEstimatedMinutes,
            LocalDateTime startTime,
            boolean hasStartTime,
            LocalDateTime endTime,
            boolean hasEndTime,
            Boolean isLocked,
            boolean hasIsLocked,
            Task.Category category,
            boolean noDeadline
    ) {}
```

**3c. `TaskServiceImpl.java`**

`createTask` 시그니처에 `boolean noDeadline` 추가 + 메서드 첫 줄에 모순 가드, `inferScheduleIfNeeded` 호출에 전달:

```java
    @Override
    @Transactional
    public Task createTask(String email, String title, String description,
                           LocalDateTime deadline, Integer estimatedMinutes,
                           LocalDateTime startTime, LocalDateTime endTime,
                           Boolean isLocked, Task.Category category, boolean noDeadline) {
        if (noDeadline && deadline != null) {
            throw new BadRequestException("기한 없는 일에는 마감 시간을 함께 보낼 수 없어요.");
        }
        User user = findUser(email);
        ScheduleFields schedule = inferScheduleIfNeeded(title, description, startTime, deadline, estimatedMinutes, noDeadline);
        // ...이하 기존 본문 그대로...
```

`updateTask`의 next* 계산부(110-118행)를 다음으로 교체:

```java
        if (fields.noDeadline() && fields.hasDeadline() && fields.deadline() != null) {
            throw new BadRequestException("기한 없는 일에는 마감 시간을 함께 보낼 수 없어요.");
        }

        String nextTitle = fields.title() != null ? fields.title() : task.getTitle();
        String nextDescription = fields.hasDescription() ? fields.description() : task.getDescription();
        LocalDateTime nextDeadline = fields.noDeadline() ? null
                : (fields.hasDeadline() ? fields.deadline() : task.getDeadline());
        Integer nextEstimatedMinutes = fields.hasEstimatedMinutes() ? fields.estimatedMinutes() : task.getEstimatedMinutes();
        LocalDateTime nextStartTime = fields.hasStartTime() ? fields.startTime() : task.getStartTime();
        boolean scheduleTouched = fields.hasDeadline() || fields.hasEstimatedMinutes()
                || fields.hasStartTime() || fields.noDeadline();
        ScheduleFields nextSchedule = scheduleTouched
                ? inferScheduleIfNeeded(nextTitle, nextDescription, nextStartTime, nextDeadline, nextEstimatedMinutes, fields.noDeadline())
                : new ScheduleFields(nextStartTime, nextDeadline, nextEstimatedMinutes);
```

(모순 가드는 `Map<String, Object> before = snapshot(task);` 위, 권한 체크 아래에 둔다)

`inferScheduleIfNeeded`를 6-인자로 교체:

```java
    private ScheduleFields inferScheduleIfNeeded(String title, String description,
                                                 LocalDateTime startTime,
                                                 LocalDateTime deadline,
                                                 Integer estimatedMinutes,
                                                 boolean noDeadline) {
        if (noDeadline) {
            // '언젠가' 선언: 마감·시작시간은 추론으로 채우지 않는다 — 유저가 입력한 시작시간만 보존
            Integer minutes = estimatedMinutes != null
                    ? estimatedMinutes
                    : openAiService.inferSchedule(title, description, startTime, null, null).estimatedMinutes();
            return new ScheduleFields(startTime, null, minutes);
        }
        // 마감이 확정돼 있고 다른 시간 정보도 있으면 AI 호출 없이 그대로 사용.
        // 시작~마감 간격을 예상시간으로 환산하던 슬롯 파생은 하지 않는다 — 예상시간은 집중 작업량 의미
        if (deadline != null && (startTime != null || estimatedMinutes != null)) {
            return new ScheduleFields(startTime, deadline, estimatedMinutes);
        }
        OpenAiService.ScheduleInferenceResult inferred =
                openAiService.inferSchedule(title, description, startTime, deadline, estimatedMinutes);
        return new ScheduleFields(
                startTime != null ? startTime : parseDateTime(inferred.startTime()),
                deadline != null ? deadline : parseDateTime(inferred.deadline()),
                estimatedMinutes != null ? estimatedMinutes : inferred.estimatedMinutes());
    }
```

**3d. `TaskController.java`**

POST(46-52행):

```java
        Task task = taskService.createTask(
                principal.getAttribute("email"),
                req.title(), req.description(),
                req.deadline(), req.estimatedMinutes(),
                req.startTime(), req.endTime(), req.isLocked(),
                req.category(),
                Boolean.TRUE.equals(req.noDeadline())
        );
```

PATCH의 `TaskUpdateFields` 생성(73-91행) 마지막 인자 추가:

```java
                        value(req, "category", Task.Category.class),
                        Boolean.TRUE.equals(value(req, "noDeadline", Boolean.class))
```

**3e. 기존 테스트 호출부** — Task 1에서 추가/수정한 것 포함 기존 `createTask(...)` 호출 전부에 마지막 인자 `false` 추가 (Step 1에서 이미 했다면 생략)

- [ ] **Step 4: 테스트 통과 확인**

Run: `.\gradlew.bat test --no-daemon --tests "com.dumpit.service.impl.TaskServiceImplTest"` (JAVA_HOME 설정 포함, Step 2와 동일)
Expected: PASS — 신규 5개 + 기존 전부

- [ ] **Step 5: 전체 백엔드 테스트**

Run: `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon`
Expected: BUILD SUCCESSFUL — 다른 서비스 테스트(TaskPlanningServiceImplTest 등)까지 전부 통과. `TaskUpdateFields`를 만드는 다른 테스트가 있으면 같은 방식으로 `false` 추가

- [ ] **Step 6: 커밋**

```powershell
cd C:\coding\dumpit; git add backend/src; git commit -m @'
Feat: noDeadline 플래그로 기한 없는 태스크 명시 선언 지원

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: 백엔드 — `inferSchedule` AI 프롬프트에서 슬롯 산술 제거·null 가드 전면화

**Files:**
- Modify: `backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java:118-154` (inferSchedule의 prompt 문자열)

**Interfaces:**
- Consumes/Produces: 시그니처·JSON 응답 형태·`normalizeFutureDateTime`·`clampMinutes` 모두 불변. 프롬프트 규칙만 교체

- [ ] **Step 1: 프롬프트 교체**

`inferSchedule` 안의 `String prompt = """..."""` 블록을 아래로 교체한다. `.formatted(...)` 인자 목록(nowStr, todayEnd, tomorrowEnd, title, description, startTime, deadline, estimatedMinutes)은 그대로 재사용:

```java
        String prompt = """
            You infer missing schedule fields for a Dumpit task.
            Return only valid JSON in this shape:
            {"startTime":"YYYY-MM-DDTHH:mm:ss|null","deadline":"YYYY-MM-DDTHH:mm:ss|null","estimatedMinutes":60,"reason":"short explanation"}

            Rules:
            - Current time is %s.
            - Preserve provided values exactly. Never change or overwrite a provided field.
            - Fill a missing startTime or deadline ONLY from an explicit or relative time cue in the title/description (e.g. 오늘, 내일, 금요일까지, 5월 1일, 오후 3시 → today ends at %s, tomorrow ends at %s).
            - If there is NO time cue for a field, that field MUST be null. Never invent startTime or deadline from urgency, effort, or task type alone — the user keeps open-ended tasks without deadlines on purpose.
            - Do NOT derive one time field from another with arithmetic (no startTime + estimatedMinutes = deadline, no deadline - estimatedMinutes = startTime).
            - deadline means the end/due time of the task. All deadlines must be strictly in the future.
            - If estimatedMinutes is missing, estimate it from the task type (e.g. 운동/exercise→60, 회의/meeting→30-60, 공부/study→60-120, 장보기/shopping→30-60, 독서/reading→30-60, 식사/meal→30, 청소/cleaning→30-60).
            - estimatedMinutes means focused working time, NOT the gap between startTime and deadline. It must be between 1 and 1440.

            <user_input>
            Title: %s
            Description: %s
            Provided startTime: %s
            Provided deadline: %s
            Provided estimatedMinutes: %s
            </user_input>
            """.formatted(
                nowStr,
                todayEnd,
                tomorrowEnd,
                title,
                description != null ? description : "none",
                startTime != null ? startTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "unknown",
                deadline != null ? deadline.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "unknown",
                estimatedMinutes != null ? estimatedMinutes : "unknown"
        );
```

- [ ] **Step 2: 전체 테스트로 회귀 확인**

Run: `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon`
Expected: BUILD SUCCESSFUL (프롬프트는 문자열이라 단위 테스트 없음 — AI 실응답은 배포 후 스모크: "내일 3시 회의" → startTime 설정, "기타 연습 60분" → 마감 null 확인)

- [ ] **Step 3: 커밋**

```powershell
cd C:\coding\dumpit; git add backend/src; git commit -m @'
Fix: inferSchedule 프롬프트에서 슬롯 산술 제거, 단서 없으면 null 규칙 전면 적용

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: 프론트 — `DeadlineModeField` 공용 컴포넌트 + AddTaskModal 개편

**Files:**
- Create: `frontend/src/components/DeadlineModeField.jsx`
- Modify: `frontend/src/components/AddTaskModal.jsx`

**Interfaces:**
- Consumes: `TaskDateTimeField`(`./TaskTimeInputs`) — props: `label, value, onChange, onClear(옵션), min, defaultTimeWhenEmpty`
- Produces (Task 5가 사용):
  - `default export DeadlineModeField({ mode, onModeChange, deadline, onDeadlineChange, minDeadline })` — mode는 `'AI' | 'TODAY' | 'NONE' | 'CUSTOM'`
  - `export function getTodayDeadline()` — `'YYYY-MM-DDTHH:mm'` 형식의 오늘 23:59
  - API payload 규약: `deadline`은 CUSTOM이면 입력값, TODAY면 `getTodayDeadline()`, AI/NONE이면 null. `noDeadline`은 `mode === 'NONE'`

- [ ] **Step 1: `DeadlineModeField.jsx` 생성**

```jsx
import { TaskDateTimeField } from './TaskTimeInputs'

function formatDateTimeInput(d) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function getTodayDeadline() {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return formatDateTimeInput(d)
}

export const DEADLINE_MODES = [
  { value: 'AI', label: '✨ AI가 알아서', help: "제목·메모에 시점 단서가 있으면 마감을 잡고, 없으면 '언젠가'로 분류해요." },
  { value: 'TODAY', label: '오늘까지', help: '오늘 밤 11시 59분 마감으로 만들어요.' },
  { value: 'NONE', label: '🌙 언젠가', help: '기한 없는 일로 만들어요. AI가 마감을 지어내지 않아요.' },
  { value: 'CUSTOM', label: '📅 직접 입력', help: '마감 날짜와 시간을 직접 정해요.' },
]

export default function DeadlineModeField({ mode, onModeChange, deadline, onDeadlineChange, minDeadline }) {
  const selected = DEADLINE_MODES.find((m) => m.value === mode)
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-sub">마감</label>
      <div className="flex flex-wrap gap-1.5">
        {DEADLINE_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
              mode === m.value
                ? 'bg-primary text-on-accent border-edge'
                : 'bg-accent text-sub border-line hover:border-edge'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-semibold text-sub">{selected?.help}</p>
      {mode === 'CUSTOM' && (
        <TaskDateTimeField
          label="마감 시간"
          value={deadline}
          min={minDeadline}
          defaultTimeWhenEmpty="23:59"
          onChange={onDeadlineChange}
        />
      )}
    </div>
  )
}
```

(CUSTOM 필드에 ✕지우기 버튼은 두지 않는다 — "마감 없앰"은 칩 전환으로 표현되므로)

- [ ] **Step 2: `AddTaskModal.jsx` 개편**

변경 목록 (전체 파일 구조는 유지):

1. import 추가: `import DeadlineModeField, { getTodayDeadline } from './DeadlineModeField'`
2. `getDefaultDeadline()` 로컬 함수 삭제 (getTodayDeadline으로 대체)
3. state 변경:
```jsx
  const [deadlineMode, setDeadlineMode] = useState('AI')
  const [deadline, setDeadline] = useState('')
```
4. 모드 전환 핸들러 추가 (컴포넌트 본문):
```jsx
  const handleModeChange = (mode) => {
    setDeadlineMode(mode)
    if (mode === 'CUSTOM' && !deadline) setDeadline(getTodayDeadline())
  }
```
5. `handleSubmit`의 검증·payload를 다음으로 교체:
```jsx
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (deadlineMode === 'CUSTOM' && !deadline) {
      alert('마감 시간을 입력하거나 다른 마감 옵션을 선택해주세요.')
      return
    }
    const effectiveDeadline =
      deadlineMode === 'CUSTOM' ? deadline
      : deadlineMode === 'TODAY' ? getTodayDeadline()
      : ''
    if (effectiveDeadline && new Date(effectiveDeadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (useStartTime && startTime && effectiveDeadline && new Date(effectiveDeadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || null,
        startTime: useStartTime ? (startTime || null) : null,
        deadline: effectiveDeadline || null,
        noDeadline: deadlineMode === 'NONE',
        estimatedMinutes: useEstimatedMinutes && estimatedMinutes ? parseInt(estimatedMinutes) : null,
        category: category || null,
      })
      dispatchAiUsed()
      onCreated()
    } catch (err) {
      alert(getApiErrorMessage(err, '태스크 생성에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }
```
6. JSX에서 안내 문단(`시간을 직접 입력하면 그 값을 우선해요...` `<p>`)과 마감 `TaskDateTimeField` 블록을 삭제하고 그 자리에:
```jsx
          <DeadlineModeField
            mode={deadlineMode}
            onModeChange={handleModeChange}
            deadline={deadline}
            onDeadlineChange={(e) => setDeadline(e.target.value)}
            minDeadline={getMinDeadlineInput()}
          />
```
(시작 시간·예상 시간 체크박스 블록은 그대로 유지)

- [ ] **Step 3: 빌드 확인**

Run: `cd C:\coding\dumpit\frontend; npm run build`
Expected: 빌드 성공 (exit 0)

- [ ] **Step 4: 수동 확인 (dev 서버)**

Run: `cd C:\coding\dumpit\frontend; npm run dev` 후 브라우저에서 일정 추가 모달 열기
확인: ① 기본 선택이 'AI가 알아서'이고 날짜 필드 없음 ② '직접 입력' 클릭 시 오늘 23:59가 채워진 필드 등장 ③ '언젠가' 선택 후 제출 시 요청 body에 `noDeadline: true, deadline: null` (개발자도구 Network 탭) ④ '오늘까지' 선택 시 body의 deadline이 오늘 23:59

- [ ] **Step 5: 커밋**

```powershell
cd C:\coding\dumpit; git add frontend/src; git commit -m @'
Feat: 태스크 생성 폼에 마감 모드 칩(AI·오늘·언젠가·직접) 도입

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: 프론트 — EditTaskModal에 마감 모드 칩 적용

**Files:**
- Modify: `frontend/src/components/EditTaskModal.jsx`

**Interfaces:**
- Consumes: Task 4의 `DeadlineModeField`, `getTodayDeadline` — 동일 props 규약
- Produces: PATCH payload에 `noDeadline: mode === 'NONE'` 포함. 초기 모드: 마감 있으면 `'CUSTOM'`, 없으면 `'NONE'`

- [ ] **Step 1: `EditTaskModal.jsx` 개편**

1. import 추가: `import DeadlineModeField, { getTodayDeadline } from './DeadlineModeField'`
2. state 추가 (initialDeadline 선언 아래):
```jsx
  const [deadlineMode, setDeadlineMode] = useState(task.deadline ? 'CUSTOM' : 'NONE')
```
3. 모드 전환 핸들러 추가:
```jsx
  const handleModeChange = (mode) => {
    setDeadlineMode(mode)
    if (mode === 'CUSTOM' && !deadline) setDeadline(getTodayDeadline())
  }
```
4. `handleSubmit` 검증·payload 교체:
```jsx
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (deadlineMode === 'CUSTOM' && !deadline) {
      alert('마감 시간을 입력하거나 다른 마감 옵션을 선택해주세요.')
      return
    }
    const effectiveDeadline =
      deadlineMode === 'CUSTOM' ? deadline
      : deadlineMode === 'TODAY' ? getTodayDeadline()
      : ''
    if (effectiveDeadline && effectiveDeadline !== initialDeadline && new Date(effectiveDeadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (startTime && effectiveDeadline && new Date(effectiveDeadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: effectiveDeadline || null,
        noDeadline: deadlineMode === 'NONE',
        estimatedMinutes: useEstimatedMinutes && estimatedMinutes ? parseInt(estimatedMinutes) : null,
        userPriorityScore: priorityScore,
        category,
        startTime: useStartTime ? (startTime || null) : null,
      }
      // 원래 고정이었거나 사용자가 시작시간을 바꾼 경우만 고정 — 마감에서 파생된 슬롯이 편집 저장으로 잠기지 않게
      payload.isLocked = Boolean(useStartTime && startTime && (task.isLocked || startTime !== initialStartTime))
      const res = await api.patch(`/tasks/${task.taskId}`, payload)
      onUpdated(res.data)
    } catch (err) {
      alert(getApiErrorMessage(err, '수정에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }
```
5. JSX의 마감 `TaskDateTimeField`(label="마감 시간 (비워두면 AI가 자동 설정)" 블록)를 다음으로 교체:
```jsx
          <DeadlineModeField
            mode={deadlineMode}
            onModeChange={handleModeChange}
            deadline={deadline}
            onDeadlineChange={(e) => setDeadline(e.target.value)}
            minDeadline={!deadline || new Date(deadline) > new Date() ? getMinDeadlineInput() : undefined}
          />
```

- [ ] **Step 2: 빌드 확인**

Run: `cd C:\coding\dumpit\frontend; npm run build`
Expected: 빌드 성공 (exit 0)

- [ ] **Step 3: 수동 확인**

Run: `npm run dev` 후 ① 마감 있는 태스크 수정 열기 → '직접 입력' 선택 + 기존 값 표시 ② 마감 없는 태스크 → '언젠가' 선택 상태 ③ 마감 있는 태스크를 '언젠가'로 바꿔 저장 → 목록에서 마감 사라짐(요청 body `noDeadline: true`) ④ 'AI가 알아서'로 저장 → 요청 body `deadline: null, noDeadline: false`

- [ ] **Step 4: 커밋**

```powershell
cd C:\coding\dumpit; git add frontend/src; git commit -m @'
Feat: 태스크 수정 모달에도 마감 모드 칩 적용

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: 통합 검증 + 스펙 대조

**Files:**
- 없음 (검증만; 발견된 결함은 이 태스크에서 수정 후 커밋)

- [ ] **Step 1: 백엔드 전체 테스트**

Run: `cd C:\coding\dumpit\backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; .\gradlew.bat test --no-daemon`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: 프론트 빌드**

Run: `cd C:\coding\dumpit\frontend; npm run build`
Expected: 빌드 성공

- [ ] **Step 3: 스펙 대조 체크리스트** (`docs/superpowers/specs/2026-07-12-deadline-modes-design.md` 기준)

- 생성 폼: 4모드 칩·기본 AI·직접 입력 시에만 날짜 필드·헬퍼 텍스트 ✔
- n박 일정(시작 오늘·마감 3일 뒤·예상시간 없음) 등록 성공 ✔ (수동: dev 서버에서 직접 입력 + 시작 시간으로 생성)
- `noDeadline: true` 시 마감·시작시간 추론 없음, 예상시간만 AI ✔ (단위 테스트)
- 부분 입력(예상시간만) 시 파생 없음 ✔ (단위 테스트)
- 수정에서 마감 → 언젠가 전환 시 마감 부활 없음 ✔ (단위 테스트 + 수동)
- 1440 캡·마감>시작·미래 마감 검증 유지 ✔ (validateSchedule 무변경 확인)
- 프롬프트: 슬롯 산술 없음·null 가드 전 조합·시작시간 단서 기반 ✔ (코드 리뷰)

- [ ] **Step 4: 배포 후 스모크 항목 기록**

`docs/superpowers/specs/2026-07-12-deadline-modes-design.md`의 6절 검증 항목이 이미 담고 있음 — 별도 작업 없음. 배포 시 확인: "내일 3시 회의" 제목만으로 생성 → startTime 내일 15:00 / "기타 연습" AI 모드 → 마감 null(언젠가행)

- [ ] **Step 5: 마무리**

superpowers:finishing-a-development-branch 스킬로 dev 머지/PR 여부 결정
