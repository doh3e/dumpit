# 아이디어 덤프 계층 인식 + gpt-5-mini 업그레이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이디어 덤프에서 "제목 줄 + 목록" 입력을 부모/자식 계층으로 추출하게 하고, 모든 AI 기능의 모델을 gpt-5-mini로 올린다.

**Architecture:** 변경은 `OpenAiServiceImpl.java` 단일 파일에 집중된다. (1) 요청 본문 빌드를 정적 메서드로 분리해 gpt-5 계열이면 `temperature` 대신 `reasoning_effort: "minimal"`을 넣는 분기를 추가하고 기본 모델을 gpt-5-mini로 변경, (2) `extractIdeas` 프롬프트에 제목 패턴 규칙과 few-shot 예시를 추가한다. 스키마·DB·프론트는 변경 없음 (계층 인프라는 이미 구현되어 있음).

**Tech Stack:** Spring Boot (Java), JUnit 5 + AssertJ, OpenAI Chat Completions API

**Spec:** `docs/superpowers/specs/2026-07-08-idea-dump-hierarchy-design.md`

## Global Constraints

- 사용자 포인트 차감 정책(아이디어 추출 고정 5점 등)은 변경하지 않는다.
- gpt-4 계열 모델로 되돌릴 경우 기존 `temperature: 0.3` 동작이 그대로 유지되어야 한다.
- 프롬프트의 기존 규칙(COVERAGE RULES, "무관한 생각은 별도 루트", 최대 3단계 깊이)은 삭제하지 않는다.
- 모든 커밋 메시지는 이 저장소 관례(한국어, `Feat:`/`Fix:`/`Test:` 접두사)를 따른다.

---

### Task 1: gpt-5 계열 요청 본문 분기 + 기본 모델 변경

**Files:**
- Modify: `backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java`
- Test: `backend/src/test/java/com/dumpit/service/impl/OpenAiServiceImplTest.java`

**Interfaces:**
- Produces: `static Map<String, Object> chatRequestBody(String model, String systemPrompt, String userPrompt, Map<String, Object> responseFormat)` — 패키지 프라이빗 정적 메서드 (테스트에서 직접 호출). gpt-5 계열이면 본문에 `reasoning_effort=minimal` 포함·`temperature` 제외, 그 외 모델이면 `temperature=0.3` 포함·`reasoning_effort` 제외.
- Consumes: 없음 (기존 코드만 수정)

- [ ] **Step 1: 실패하는 테스트 작성**

`OpenAiServiceImplTest.java`의 기존 테스트 아래에 추가 (같은 패키지라 패키지 프라이빗 정적 메서드 접근 가능):

```java
@Test
void gpt5_계열은_temperature_대신_reasoning_effort_minimal을_쓴다() {
    Map<String, Object> body = OpenAiServiceImpl.chatRequestBody(
            "gpt-5-mini", "system prompt", "user prompt", Map.of("type", "json_object"));

    assertThat(body).doesNotContainKey("temperature");
    assertThat(body.get("reasoning_effort")).isEqualTo("minimal");
    assertThat(body.get("model")).isEqualTo("gpt-5-mini");
}

@Test
void gpt4_계열은_기존대로_temperature_0_3을_쓴다() {
    Map<String, Object> body = OpenAiServiceImpl.chatRequestBody(
            "gpt-4o-mini", "system prompt", "user prompt", Map.of("type", "json_object"));

    assertThat(body.get("temperature")).isEqualTo(0.3);
    assertThat(body).doesNotContainKey("reasoning_effort");
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run (backend 디렉토리에서): `./gradlew test --tests "com.dumpit.service.impl.OpenAiServiceImplTest"`
Expected: 컴파일 에러 — `chatRequestBody` 메서드가 존재하지 않음

- [ ] **Step 3: 구현**

`OpenAiServiceImpl.java`에서:

(a) 생성자 파라미터의 기본 모델 변경:

```java
// 변경 전
@Value("${openai.model:gpt-4o-mini}") String model,
// 변경 후
@Value("${openai.model:gpt-5-mini}") String model,
```

(b) `callChatApi(String, String, Map)` 안의 본문 생성 코드를 새 정적 메서드 호출로 교체:

```java
private String callChatApi(String userPrompt, String systemPrompt, Map<String, Object> responseFormat) {
    Map<String, Object> body = chatRequestBody(model, systemPrompt, userPrompt, responseFormat);
    // 이하 try { restClient.post() ... } 블록은 그대로 유지
```

(c) 새 정적 메서드 추가 (`priorityResponseFormat()` 근처에 배치). 기존 `Map.of`는 조건부 키를 못 넣으므로 `LinkedHashMap` 사용 (`java.util.LinkedHashMap` import 추가):

```java
static Map<String, Object> chatRequestBody(String model, String systemPrompt, String userPrompt,
                                           Map<String, Object> responseFormat) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("model", model);
    body.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt),
            Map.of("role", "user", "content", userPrompt)
    ));
    if (model.startsWith("gpt-5")) {
        // gpt-5 계열은 temperature 커스텀 값을 지원하지 않음
        body.put("reasoning_effort", "minimal");
    } else {
        body.put("temperature", 0.3);
    }
    body.put("response_format", responseFormat);
    return body;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run (backend 디렉토리에서): `./gradlew test`
Expected: 전체 PASS (신규 2개 + 기존 테스트 회귀 없음)

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java backend/src/test/java/com/dumpit/service/impl/OpenAiServiceImplTest.java
git commit -m "Feat: AI 모델 gpt-5-mini 업그레이드 및 gpt-5 계열 요청 분기"
```

---

### Task 2: extractIdeas 프롬프트 강화 (제목+목록 계층 인식)

**Files:**
- Modify: `backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java` (extractIdeas 메서드의 프롬프트 텍스트만)

**Interfaces:**
- Consumes: 없음 (Task 1과 독립 — 프롬프트 문자열만 수정)
- Produces: 없음 (코드 시그니처 변화 없음)

프롬프트는 자연어 지시라 단위 테스트로 AI 동작을 검증할 수 없다. 이 태스크는 텍스트 수정 → 컴파일/기존 테스트 확인 → 커밋이며, 실제 동작 검증은 Task 3(수동 테스트)에서 한다.

- [ ] **Step 1: HIERARCHY RULES 블록 교체**

`extractIdeas`의 프롬프트에서 아래 기존 블록을:

```
HIERARCHY RULES:
- Nest a child under a parent ONLY when the text clearly signals subordination: indentation, sub-bullets, "~에 대해서", "예를 들면", or an explicit topic followed by its details.
- If the input opens with one overarching theme or project and everything after it elaborates on it, use that as the single root and nest the rest under it.
- If thoughts are separate and unrelated, keep them as separate root-level ideas. A flat list of roots is perfectly fine — do NOT invent a parent grouping that the user never wrote.
- Children can have children (maximum 3 levels deep total).
```

다음으로 교체:

```
HIERARCHY RULES:
- Nest a child under a parent ONLY when the text clearly signals subordination: indentation, sub-bullets, "~에 대해서", "예를 들면", or an explicit topic followed by its details.
- HEADING PATTERN (very common): a standalone heading line — wrapped in <> or [], starting with #, ending with ':', or a short title-like line directly followed by a list — is a PARENT idea. Every list item (1. / 1) / - / •) that follows it is that heading's child.
- Lines wrapped in angle brackets such as <덤핏 개선안> inside the input are user-written headings, NOT markup or tags. Never drop them. Use the inner text (without the brackets) as the parent idea's title.
- If the input opens with one overarching theme or project and everything after it elaborates on it, use that as the single root and nest the rest under it.
- If thoughts are separate and unrelated, keep them as separate root-level ideas. A flat list of roots is perfectly fine — do NOT invent a parent grouping that the user never wrote. A heading line the user explicitly wrote is NOT an invented grouping: you MUST use it as the parent.
- Children can have children (maximum 3 levels deep total).
```

- [ ] **Step 2: EXAMPLE 2 추가**

기존 EXAMPLE 블록의 마지막 줄 `(Note: "치과 예약" is unrelated to the project, so it stays a separate root.)` 바로 다음, `<user_input>` 태그 전에 추가:

```
EXAMPLE 2 (heading + numbered list):
Input: "<덤핏 개선안>
1. 위젯 추가
2. 다크모드 지원
3. 알림 개선"
Output: {"ideas":[
  {"title":"덤핏 개선안","content":"덤핏 개선 아이디어 모음","category":"WORK","children":[
    {"title":"위젯 추가","content":"","category":"WORK","children":[]},
    {"title":"다크모드 지원","content":"","category":"WORK","children":[]},
    {"title":"알림 개선","content":"","category":"WORK","children":[]}
  ]}
]}
(Note: the user wrote the heading themselves, so it becomes the single parent and every numbered item is its child.)
```

주의: 프롬프트는 Java text block(`"""`) 안이므로 위 텍스트를 그대로 붙여넣으면 된다. `%s` 포맷 자리는 건드리지 않는다.

- [ ] **Step 3: 컴파일 및 기존 테스트 확인**

Run (backend 디렉토리에서): `./gradlew test`
Expected: 전체 PASS (프롬프트는 문자열이라 회귀 없음, 컴파일 확인 목적)

- [ ] **Step 4: 커밋**

```bash
git add backend/src/main/java/com/dumpit/service/impl/OpenAiServiceImpl.java
git commit -m "Feat: 아이디어 덤프 제목+목록 계층 인식 프롬프트 강화"
```

---

### Task 3: 수동 검증 (실제 AI 호출)

**Files:** 없음 (검증만)

**Interfaces:**
- Consumes: Task 1 + Task 2의 변경 전체

프롬프트/모델 변경의 실제 효과는 앱에서만 확인 가능하다. 사용자와 함께 진행한다.

- [ ] **Step 1: 배포 환경 모델 오버라이드 확인**

로컬 실행 환경과 배포 환경(EC2 등)에 `OPENAI_MODEL` 또는 `openai.model` 오버라이드가 설정되어 있는지 확인한다. 설정돼 있으면 코드 기본값(gpt-5-mini)이 무시되므로 해당 값을 갱신하거나 제거해야 한다.

- [ ] **Step 2: 백엔드 기동 및 아이디어 추출 테스트**

앱의 아이디어 덤프 화면에서 아래 4가지 입력으로 "AI로 아이디어 추출"을 실행하고 미리보기 트리를 확인:

| 입력 | 기대 결과 |
|---|---|
| `<덤핏 개선안>` + 번호 목록 3개 (원본 실패 패턴) | 루트 1개 + 하위 3개 |
| `# 제목` 또는 `제목:` + `-` 목록 | 루트 1개 + 하위 N개 |
| 제목 없는 잡생각 나열 (예: "운동 가야지. 책도 읽고 싶다. 폰 요금제 바꾸기") | 평탄한 루트 목록 (계층 없음) |
| 제목 블록 + 무관한 딴생각 1줄 혼합 | 제목 트리 1개 + 딴생각 별도 루트 |

- [ ] **Step 3: 모델 교체 회귀 확인**

각 1회씩: 태스크 생성(우선순위 채점 정상), 브레인 덤프 분석, 서브태스크 제안이 에러 없이 동작하는지 확인. 400 에러가 나면 gpt-5 파라미터 비호환이므로 백엔드 로그에서 OpenAI 에러 본문을 확인한다.

- [ ] **Step 4: 비용 관찰 메모**

OpenAI 대시보드에서 며칠간 gpt-5-mini 사용량/요금을 확인하고, 과하면 `openai.model` 환경변수로 조절한다 (코드 변경 불필요).
