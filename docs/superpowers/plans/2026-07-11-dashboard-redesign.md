# 대시보드 재편성 (타임테이블 제거 + 할 일/완료 UX) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원형 타임테이블을 제거하고 "지금 할 일" 히어로를 전체 폭으로 승격, 할 일 목록을 오늘/내일/일주일 탭 + 완료 접이식으로 재구성한다.

**Architecture:** 시간 버킷(6버킷: 마감지남/오늘/내일/일주일/그외/언젠가)은 백엔드 `TaskPlanningService`가 단일 소스로 계산하고, 프론트는 sections를 렌더링만 한다. 대시보드는 히어로(전체 폭) + 해야 할 일 카드 + 달력의 3카드 구성이 된다.

**Tech Stack:** Spring Boot (Java 21, Gradle) + React (Vite, Tailwind CSS 변수 토큰)

**Spec:** `docs/superpowers/specs/2026-07-11-dashboard-redesign-design.md`

## Global Constraints

- 작업 브랜치: `feature/dashboard-redesign` (Task 1 Step 1에서 main으로부터 분기, 이후 모든 태스크는 이 브랜치에서)
- 백엔드 테스트: `cd backend` 후 `.\gradlew.bat test` — **JAVA_HOME이 JDK21이어야 함**
- 프론트 빌드 검증: `cd frontend` 후 `npm run build`
- UI 문구는 한국어, 기존 디자인 토큰·클래스만 사용 (`card-retro`, `card-retro-hero`, `btn-retro*`, `tone-*`, `label-retro`, `font-galmuri`, `font-dungeon`). 새 CSS 클래스 추가 금지
- 커밋 메시지: `Feat:`/`Refactor:`/`Chore:` + 한국어 요약, 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- YAGNI: 스펙에 없는 기능(설정, 애니메이션, 추가 필드) 금지
- 실행 분담: Task 1·3·4·5는 메인 에이전트(Fable)가 직접, Task 2·6은 sonnet 서브에이전트 위임 가능, Task 7은 메인이 검증

## 파일 구조

| 파일 | 책임 |
|---|---|
| `backend/src/main/java/com/dumpit/dto/TaskPlanningResponse.java` | sections 6버킷 교체, timedTasks 제거 |
| `backend/src/main/java/com/dumpit/service/impl/TaskPlanningServiceImpl.java` | Bucket enum·분류·추천 문구 갱신 |
| `backend/src/test/java/com/dumpit/service/impl/TaskPlanningServiceImplTest.java` | 6버킷 테스트 추가 |
| `frontend/src/utils/dates.js` (신규) | 날짜 파싱/포맷 공통 유틸 |
| `frontend/src/components/dashboard/NowHeroCard.jsx` (신규) | 지금 할 일 히어로 + 미니 큐 |
| `frontend/src/components/dashboard/TaskListCard.jsx` (신규) | 탭 목록 + 마감지남 고정 + 완료 접이식 |
| `frontend/src/pages/DashboardPage.jsx` | 레이아웃 개편, 로컬 버킷 로직 제거 |
| `frontend/src/components/TaskBoardModal.jsx` | 6버킷 컬럼, 프론트 버킷 계산 제거 |
| `frontend/src/components/CircularTimetable/` | **삭제** |

---

### Task 1: 백엔드 6버킷 개편 + timedTasks 제거 (담당: Fable 직접)

**Files:**
- Modify: `backend/src/main/java/com/dumpit/dto/TaskPlanningResponse.java`
- Modify: `backend/src/main/java/com/dumpit/service/impl/TaskPlanningServiceImpl.java`
- Test: `backend/src/test/java/com/dumpit/service/impl/TaskPlanningServiceImplTest.java`

**Interfaces:**
- Produces: `TaskPlanningSections(overdue, today, tomorrow, next7Days, later, someday, recentDone)` — 각각 `List<TaskResponse>`. JSON 키: `sections.overdue`, `sections.today`, `sections.tomorrow`, `sections.next7Days`, `sections.later`, `sections.someday`, `sections.recentDone`. 응답에서 `timedTasks` 필드 삭제. `focusRecommendations[i].bucket` 문자열은 `OVERDUE|TODAY|TOMORROW|NEXT_7_DAYS|LATER|SOMEDAY`가 됨 (프론트 Task 3이 라벨 매핑에 사용)

- [ ] **Step 1: 브랜치 분기**

```bash
git checkout main
git checkout -b feature/dashboard-redesign
```

- [ ] **Step 2: 실패하는 테스트 작성**

`TaskPlanningServiceImplTest.java` 클래스 끝(기존 테스트 뒤)에 추가:

```java
    @Test
    void 태스크는_마감에_따라_6개_버킷으로_나뉜다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task overdue = task("지난 일", Task.Category.WORK);
        overdue.setDeadline(LocalDateTime.of(2026, 7, 11, 9, 0));
        Task today = task("오늘 일", Task.Category.WORK);
        today.setDeadline(LocalDateTime.of(2026, 7, 11, 22, 0));
        Task tomorrow = task("내일 일", Task.Category.WORK);
        tomorrow.setDeadline(LocalDateTime.of(2026, 7, 12, 22, 0));
        Task week = task("일주일 일", Task.Category.WORK);
        week.setDeadline(LocalDateTime.of(2026, 7, 16, 12, 0));
        Task later = task("먼 일", Task.Category.WORK);
        later.setDeadline(LocalDateTime.of(2026, 8, 1, 12, 0));
        Task someday = task("언젠가 일", Task.Category.HOBBY);
        givenTasks(overdue, today, tomorrow, week, later, someday);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.overdue()).extracting("title").containsExactly("지난 일");
        assertThat(sections.today()).extracting("title").containsExactly("오늘 일");
        assertThat(sections.tomorrow()).extracting("title").containsExactly("내일 일");
        assertThat(sections.next7Days()).extracting("title").containsExactly("일주일 일");
        assertThat(sections.later()).extracting("title").containsExactly("먼 일");
        assertThat(sections.someday()).extracting("title").containsExactly("언젠가 일");
    }

    @Test
    void 내일_자정_마감은_내일_버킷_모레_마감은_일주일_버킷이다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task tomorrowMidnight = task("내일 자정 일", Task.Category.WORK);
        tomorrowMidnight.setDeadline(LocalDateTime.of(2026, 7, 12, 0, 0));
        Task dayAfter = task("모레 일", Task.Category.WORK);
        dayAfter.setDeadline(LocalDateTime.of(2026, 7, 13, 0, 0));
        givenTasks(tomorrowMidnight, dayAfter);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.today()).isEmpty();
        assertThat(sections.tomorrow()).extracting("title").containsExactly("내일 자정 일");
        assertThat(sections.next7Days()).extracting("title").containsExactly("모레 일");
    }
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd backend` 후 `.\gradlew.bat test --tests "com.dumpit.service.impl.TaskPlanningServiceImplTest"`
Expected: **컴파일 에러** — `sections().tomorrow()`, `sections().someday()` 메서드 없음

- [ ] **Step 4: DTO 수정**

`TaskPlanningResponse.java` 전체를 다음으로 교체:

```java
package com.dumpit.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TaskPlanningResponse(
        LocalDateTime now,
        Integer availableFocusMinutes,
        List<TaskResponse> tasks,
        NowSuggestionResponse nowSuggestion,
        List<TaskRecommendationResponse> focusRecommendations,
        TaskPlanningSections sections
) {
    public record TaskRecommendationResponse(
            TaskResponse task,
            int score,
            String bucket,
            List<String> reasons
    ) {}

    public record NowSuggestionResponse(
            String type,
            String title,
            String message,
            TaskResponse task,
            Integer focusMinutes
    ) {}

    public record TaskPlanningSections(
            List<TaskResponse> overdue,
            List<TaskResponse> today,
            List<TaskResponse> tomorrow,
            List<TaskResponse> next7Days,
            List<TaskResponse> later,
            List<TaskResponse> someday,
            List<TaskResponse> recentDone
    ) {}
}
```

- [ ] **Step 5: 서비스 수정**

`TaskPlanningServiceImpl.java`에서 네 군데 수정:

(a) `getPlanning(String, LocalDateTime)` 안의 sections 생성 교체 (기존 53~60행):

```java
        TaskPlanningResponse.TaskPlanningSections sections = new TaskPlanningResponse.TaskPlanningSections(
                section(active, Bucket.OVERDUE, now),
                section(active, Bucket.TODAY, now),
                section(active, Bucket.TOMORROW, now),
                section(active, Bucket.NEXT_7_DAYS, now),
                section(active, Bucket.LATER, now),
                section(active, Bucket.SOMEDAY, now),
                recentDone(tasks, now)
        );
```

(b) 같은 메서드의 `return new TaskPlanningResponse(...)`에서 마지막 인자였던 `active.stream().filter(this::isTimedTask)...toList()` 블록(timedTasks) 삭제 — `sections`가 마지막 인자가 됨. `isTimedTask`는 다른 곳에서 계속 쓰이므로 메서드 자체는 유지.

(c) `recommend()`의 switch 교체 (기존 198~220행):

```java
        switch (bucket) {
            case OVERDUE -> {
                score += 45;
                reasons.add("마감 시간이 이미 지나서 먼저 정리하는 게 좋아요.");
            }
            case TODAY -> {
                score += 40;
                reasons.add("오늘 마감이라 시간 압박이 커요.");
            }
            case TOMORROW -> {
                score += 28;
                reasons.add("내일 마감이라 미리 시작하기 좋아요.");
            }
            case NEXT_7_DAYS -> {
                score += 16;
                reasons.add("일주일 안에 마감되는 일이에요.");
            }
            case LATER -> { }
            case SOMEDAY -> reasons.add("마감은 없지만 중요도를 기준으로 후보에 올렸어요.");
        }
```

(d) `bucketOf()`와 `Bucket` enum 교체 (기존 292~300행, 355~371행):

```java
    private Bucket bucketOf(Task task, LocalDateTime now) {
        LocalDateTime deadline = task.getDeadline();
        if (deadline == null) return Bucket.SOMEDAY;
        if (deadline.isBefore(now)) return Bucket.OVERDUE;
        if (!deadline.isAfter(endOfDay(now.toLocalDate()))) return Bucket.TODAY;
        if (!deadline.isAfter(endOfDay(now.toLocalDate().plusDays(1)))) return Bucket.TOMORROW;
        if (!deadline.isAfter(endOfDay(now.toLocalDate().plusDays(7)))) return Bucket.NEXT_7_DAYS;
        return Bucket.LATER;
    }
```

```java
    private enum Bucket {
        OVERDUE(0),
        TODAY(1),
        TOMORROW(2),
        NEXT_7_DAYS(3),
        LATER(4),
        SOMEDAY(5);

        private final int sortOrder;

        Bucket(int sortOrder) {
            this.sortOrder = sortOrder;
        }

        int sortOrder() {
            return sortOrder;
        }
    }
```

- [ ] **Step 6: 전체 백엔드 테스트 통과 확인**

Run: `cd backend` 후 `.\gradlew.bat test`
Expected: BUILD SUCCESSFUL — 기존 4개 + 신규 2개 테스트 모두 PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/dumpit/dto/TaskPlanningResponse.java backend/src/main/java/com/dumpit/service/impl/TaskPlanningServiceImpl.java backend/src/test/java/com/dumpit/service/impl/TaskPlanningServiceImplTest.java
git commit -m "Feat: planning 버킷을 오늘/내일/일주일/그외/언젠가 6버킷으로 개편"
```

---

### Task 2: 프론트 날짜 유틸 공통화 (담당: sonnet 위임 가능)

**Files:**
- Create: `frontend/src/utils/dates.js`
- Modify: `frontend/src/utils/taskRewards.js`

**Interfaces:**
- Produces: `parseDate(value): Date|null`, `formatDeadline(value): string|null` ("7월 11일 오후 02:00" 형식), `formatTime(value): string|null` ("14:00" 형식), `isSameLocalDate(a: Date, b: Date): boolean`, `isToday(value): boolean` — Task 3·4·5·6이 import

- [ ] **Step 1: dates.js 생성**

`frontend/src/utils/dates.js`:

```js
/**
 * 백엔드 날짜 파싱 — ISO 문자열 또는 Jackson 배열 [year, month(1-based), day, h, m, s]
 */
export function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDeadline(value) {
  const date = parseDate(value)
  if (!date) return null
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(value) {
  const date = parseDate(value)
  if (!date) return null
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function isToday(value) {
  const date = parseDate(value)
  return date != null && isSameLocalDate(date, new Date())
}
```

- [ ] **Step 2: taskRewards.js의 중복 parseDate 제거**

`frontend/src/utils/taskRewards.js` 전체를 다음으로 교체:

```js
import { parseDate } from './dates'

export function calcCompletionCoins(task) {
  if (task.parentTaskId) return 0
  const deadline = parseDate(task.deadline)
  if (deadline && deadline < new Date()) return 5
  const priority = task.effectivePriority ?? 0.5
  return Math.floor(10 + priority * 40)
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend` 후 `npm run build`
Expected: 빌드 성공, 에러 0

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/utils/dates.js frontend/src/utils/taskRewards.js
git commit -m "Refactor: 날짜 파싱/포맷 유틸 공통화"
```

---

### Task 3: NowHeroCard 컴포넌트 (담당: Fable 직접)

**Files:**
- Create: `frontend/src/components/dashboard/NowHeroCard.jsx`

**Interfaces:**
- Consumes: `formatTime` (Task 2), `OrbitProgress` (기존 — props `done`, `total`), planning API의 `nowSuggestion` (`{type, title, message, task}`)과 `focusRecommendations` 항목 (`{task, score, bucket, reasons}`, bucket은 Task 1의 enum 문자열)
- Produces: `<NowHeroCard nowSuggestion queue todayDone todayTotal allDone onComplete(task, event) onEdit(task) />` — Task 5가 사용. `queue`는 focusRecommendations 항목 배열(최대 2개)

- [ ] **Step 1: 컴포넌트 작성**

`frontend/src/components/dashboard/NowHeroCard.jsx`:

```jsx
import OrbitProgress from '../OrbitProgress'
import { formatTime } from '../../utils/dates'

const QUEUE_BUCKET_LABEL = {
  OVERDUE: '마감 지남',
  TODAY: '오늘',
  TOMORROW: '내일',
  NEXT_7_DAYS: '일주일 내',
  LATER: '그 외',
  SOMEDAY: '언젠가',
}

export default function NowHeroCard({
  nowSuggestion,
  queue = [],
  todayDone,
  todayTotal,
  allDone,
  onComplete,
  onEdit,
}) {
  const task = allDone ? null : nowSuggestion?.task || null
  const heroTime = task ? formatTime(task.deadline) : null

  return (
    <div className="card-retro-hero p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="label-retro mb-2">지금 할 일</p>
          {allDone ? (
            <>
              <p className="font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark">
                오늘 다 비웠어요 🚀
              </p>
              <p className="text-xs text-sub mt-1">머릿속이 가벼워졌네요. 내일 또 만나요.</p>
            </>
          ) : task ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="block max-w-full truncate text-left font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark hover:text-primary transition-colors"
                title={task.title}
              >
                {task.title}
              </button>
              {heroTime && (
                <p className="font-dungeon text-[19px] text-primary mt-1">{heroTime} 마감</p>
              )}
              <p className="text-xs text-sub mt-1">{nowSuggestion.message}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={(e) => onComplete(task, e)} className="btn-retro-primary text-xs">
                  완료하기
                </button>
                <button type="button" onClick={() => onEdit(task)} className="btn-retro text-xs">
                  수정
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark">
                {nowSuggestion?.title || '지금은 비어 있는 시간이에요.'}
              </p>
              <p className="text-xs text-sub mt-1">
                {nowSuggestion?.message || '가벼운 일부터 하나 시작해볼까요?'}
              </p>
            </>
          )}
        </div>
        <OrbitProgress done={todayDone} total={todayTotal} />
      </div>

      {!allDone && queue.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[10px] font-bold text-sub mb-2">다음에 할 일</p>
          <div className="flex flex-wrap gap-2">
            {queue.map((recommendation) => (
              <button
                key={recommendation.task.taskId}
                type="button"
                onClick={() => onEdit(recommendation.task)}
                className="flex items-center gap-2 rounded-lg border-2 border-line bg-card px-3 py-1.5 text-left hover:border-edge transition-colors"
              >
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-line bg-chip text-sub flex-shrink-0">
                  {QUEUE_BUCKET_LABEL[recommendation.bucket] || '추천'}
                </span>
                <span className="text-xs font-extrabold text-dark truncate max-w-[180px]">
                  {recommendation.task.title}
                </span>
                {formatTime(recommendation.task.deadline) && (
                  <span className="text-[10px] font-bold text-sub flex-shrink-0">
                    {formatTime(recommendation.task.deadline)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 린트 확인**

Run: `cd frontend` 후 `npm run lint`
Expected: 에러·경고 0 (아직 어디서도 import하지 않는 파일이라 빌드 번들엔 안 들어가므로, 문법·룰 검증은 lint로 한다)

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/dashboard/NowHeroCard.jsx
git commit -m "Feat: 지금 할 일 히어로 카드(NowHeroCard) 컴포넌트 추가"
```

---

### Task 4: TaskListCard 컴포넌트 — 탭 + 마감지남 고정 + 완료 접이식 (담당: Fable 직접)

**Files:**
- Create: `frontend/src/components/dashboard/TaskListCard.jsx`

**Interfaces:**
- Consumes: `parseDate, formatDeadline, formatTime, isToday` (Task 2), `getCategory` (기존 `constants/categories`), `calcCompletionCoins` (기존), Task 1의 sections 구조
- Produces: `<TaskListCard sections onToggle(task, event) onEdit(task) />` — Task 5가 사용. `sections`는 planning API의 sections 객체(null 허용)

- [ ] **Step 1: 컴포넌트 작성**

`frontend/src/components/dashboard/TaskListCard.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { getCategory } from '../../constants/categories'
import { calcCompletionCoins } from '../../utils/taskRewards'
import { parseDate, formatDeadline, formatTime, isToday } from '../../utils/dates'

const TABS = [
  { id: 'today', label: '오늘' },
  { id: 'tomorrow', label: '내일' },
  { id: 'week', label: '일주일' },
  { id: 'all', label: '전부' },
]

const ALL_TAB_SECTIONS = [
  { key: 'today', title: '오늘' },
  { key: 'tomorrow', title: '내일' },
  { key: 'next7Days', title: '일주일 내' },
  { key: 'later', title: '그 외' },
  { key: 'someday', title: '언젠가' },
]

const ACTIVE_KEYS = ['overdue', 'today', 'tomorrow', 'next7Days', 'later', 'someday']

/** 부모 태스크 바로 뒤에 자식이 오도록 재배열 */
function groupByParent(list) {
  const byId = new Map(list.map((t) => [t.taskId, t]))
  const childrenOf = new Map()
  for (const t of list) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) {
      if (!childrenOf.has(t.parentTaskId)) childrenOf.set(t.parentTaskId, [])
      childrenOf.get(t.parentTaskId).push(t)
    }
  }
  const result = []
  for (const t of list) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) continue
    result.push(t)
    const kids = childrenOf.get(t.taskId)
    if (kids) result.push(...kids)
  }
  return result
}

function sortByDeadline(list) {
  return [...list].sort((a, b) => {
    const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return ad - bd
  })
}

function TaskRow({ task, overdue = false, onToggle, onEdit }) {
  const cat = getCategory(task.category)
  const isChild = !!task.parentTaskId
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
        overdue ? 'tone-overdue' : 'border-line hover:border-edge'
      } ${isChild ? 'ml-6 border-l-4 border-l-secondary' : ''}`}
    >
      <button
        onClick={(e) => onToggle(task, e)}
        aria-label="완료 처리"
        className="mt-0.5 w-5 h-5 rounded bg-card flex-shrink-0 hover:bg-primary transition-colors"
        style={{ border: '1.5px solid var(--edge)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {overdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary text-on-accent border-primary">
              마감 지남
            </span>
          )}
          {task.status === 'IN_PROGRESS' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-secondary border-secondary text-on-accent">
              진행 중
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
            {cat.emoji} {cat.label}
          </span>
          {isChild && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-chip border border-line rounded-full text-secondary">
              ↳ 서브
            </span>
          )}
        </div>
        <p className="mt-1 font-galmuri galmuri-semibold text-dark text-sm truncate">{task.title}</p>
        <p className="text-[10px] text-sub font-medium mt-0.5">
          {task.deadline && `마감 ${formatDeadline(task.deadline)}`}
          {task.estimatedMinutes && ` · ${task.estimatedMinutes}분`}
        </p>
      </div>
      <button
        onClick={() => onEdit(task)}
        className="mt-0.5 text-xs font-bold text-sub hover:text-primary transition-colors flex-shrink-0"
      >
        수정
      </button>
    </div>
  )
}

function DoneRow({ task, onToggle, onEdit }) {
  const coins = calcCompletionCoins(task)
  const doneAt = formatTime(task.completedAt)
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-line opacity-60">
      <button
        onClick={() => onToggle(task)}
        aria-label="완료 취소"
        className="w-5 h-5 rounded bg-primary flex-shrink-0 flex items-center justify-center"
        style={{ border: '1.5px solid var(--accent)' }}
      >
        <span className="text-on-accent text-[10px] font-bold">V</span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-galmuri galmuri-semibold text-dark text-sm line-through truncate">{task.title}</p>
        <p className="text-[10px] text-sub font-medium">
          {doneAt && `${doneAt} 완료`}
          {coins > 0 && ` · +${coins}C`}
        </p>
      </div>
      <button
        onClick={() => onEdit(task)}
        className="text-xs font-bold text-sub hover:text-primary transition-colors flex-shrink-0"
      >
        수정
      </button>
    </div>
  )
}

export default function TaskListCard({ sections, onToggle, onEdit }) {
  const [tab, setTab] = useState('today')
  const [doneOpen, setDoneOpen] = useState(false)

  const overdue = useMemo(() => groupByParent(sections?.overdue || []), [sections])

  const activeCount = useMemo(
    () => ACTIVE_KEYS.reduce((sum, key) => sum + (sections?.[key]?.length || 0), 0),
    [sections]
  )

  const tabTasks = useMemo(() => {
    if (!sections || tab === 'all') return []
    if (tab === 'today') return groupByParent(sections.today || [])
    if (tab === 'tomorrow') return groupByParent(sections.tomorrow || [])
    return groupByParent(sortByDeadline([
      ...(sections.today || []),
      ...(sections.tomorrow || []),
      ...(sections.next7Days || []),
    ]))
  }, [sections, tab])

  const todayDoneTasks = useMemo(
    () => (sections?.recentDone || []).filter((t) => t.status === 'DONE' && isToday(t.completedAt)),
    [sections]
  )

  const isEmpty = tab === 'all'
    ? activeCount === 0
    : overdue.length === 0 && tabTasks.length === 0

  return (
    <div className="card-retro">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="font-galmuri font-bold text-dark">해야 할 일 ({activeCount})</h3>
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-2.5 py-1 text-xs font-black transition-colors ${
                tab === id ? 'bg-primary text-on-accent' : 'text-sub hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {overdue.map((task) => (
          <TaskRow key={task.taskId} task={task} overdue onToggle={onToggle} onEdit={onEdit} />
        ))}

        {tab !== 'all' && tabTasks.map((task) => (
          <TaskRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} />
        ))}

        {tab === 'all' && ALL_TAB_SECTIONS.map(({ key, title }) => {
          const list = groupByParent(sections?.[key] || [])
          if (list.length === 0) return null
          return (
            <div key={key}>
              <p className="label-retro mt-3 mb-2">{title} ({list.length})</p>
              <div className="space-y-2">
                {list.map((task) => (
                  <TaskRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} />
                ))}
              </div>
            </div>
          )
        })}

        {isEmpty && (
          <div className="text-center py-8">
            <p className="font-extrabold text-dark text-base">
              {activeCount === 0 ? '모든 할 일 완료!' : '이 탭엔 할 일이 없어요'}
            </p>
            <p className="text-xs text-sub mt-2">브레인 덤프나 직접 추가로 시작해보세요</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDoneOpen((prev) => !prev)}
        className="mt-4 flex w-full items-center gap-2 rounded-lg border-2 border-line bg-card px-3 py-2 text-left text-xs font-bold text-sub hover:border-edge transition-colors"
      >
        <span>{doneOpen ? '▾' : '▸'}</span>
        <span>오늘 완료한 일 ({todayDoneTasks.length})</span>
      </button>
      {doneOpen && (
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
          {todayDoneTasks.length === 0 ? (
            <p className="py-4 text-center text-xs font-bold text-sub">아직 오늘 완료한 일이 없어요</p>
          ) : (
            todayDoneTasks.map((task) => (
              <DoneRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 린트 확인**

Run: `cd frontend` 후 `npm run lint`
Expected: 에러·경고 0

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/dashboard/TaskListCard.jsx
git commit -m "Feat: 할 일 탭 목록 카드(TaskListCard) 컴포넌트 추가"
```

---

### Task 5: DashboardPage 개편 — 히어로 승격 + 타임테이블 삭제 (담당: Fable 직접)

**Files:**
- Modify: `frontend/src/pages/DashboardPage.jsx` (전면 재작성)
- Delete: `frontend/src/components/CircularTimetable/` (폴더째)

**Interfaces:**
- Consumes: `NowHeroCard` (Task 3), `TaskListCard` (Task 4), `parseDate, isSameLocalDate` (Task 2), Task 1의 sections 구조
- Produces: `TaskBoardModal`에 `sections` prop만 전달 (`tasks` prop 제거) — Task 6이 이 시그니처에 맞춰 모달을 수정. **Task 5 완료 직후에는 모달이 임시로 깨진 상태(구버전 sections 키 참조)이므로 Task 6까지 같은 PR에서 이어서 진행할 것**

- [ ] **Step 1: DashboardPage.jsx 전면 재작성**

참고: 스펙 §5의 "planning 실패 시 마감순 단순 목록 fallback"은 에러 안내 카드로 구현한다 —
tasks 데이터도 같은 API에서 오므로 planning 실패 시 목록을 만들 데이터 자체가 없다.

파일 전체를 다음으로 교체:

```jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import MiniCalendar from '../components/MiniCalendar'
import AddTaskModal from '../components/AddTaskModal'
import EditTaskModal from '../components/EditTaskModal'
import TaskBoardModal from '../components/TaskBoardModal'
import NowHeroCard from '../components/dashboard/NowHeroCard'
import TaskListCard from '../components/dashboard/TaskListCard'
import PixelBurst from '../components/PixelBurst'
import RocketLaunch from '../components/RocketLaunch'
import { parseDate, isSameLocalDate } from '../utils/dates'
import { calcCompletionCoins } from '../utils/taskRewards'

const SECTION_KEYS = ['overdue', 'today', 'tomorrow', 'next7Days', 'later', 'someday', 'recentDone']

function replaceTask(list, updatedTask) {
  if (!Array.isArray(list) || !updatedTask?.taskId) return list
  return list.map((task) => task.taskId === updatedTask.taskId ? { ...task, ...updatedTask } : task)
}

function replacePlanningTask(planning, updatedTask) {
  if (!planning || !updatedTask?.taskId) return planning

  const nextSections = planning.sections
    ? Object.fromEntries(
        SECTION_KEYS.map((key) => [key, replaceTask(planning.sections[key], updatedTask)])
      )
    : planning.sections

  const nowSuggestion = planning.nowSuggestion?.task?.taskId === updatedTask.taskId
    ? {
        ...planning.nowSuggestion,
        title: planning.nowSuggestion.type === 'CURRENT_EVENT'
          ? `지금은 ${updatedTask.title} 중이에요.`
          : planning.nowSuggestion.title,
        task: { ...planning.nowSuggestion.task, ...updatedTask },
      }
    : planning.nowSuggestion

  return {
    ...planning,
    tasks: replaceTask(planning.tasks, updatedTask),
    sections: nextSections,
    nowSuggestion,
    focusRecommendations: Array.isArray(planning.focusRecommendations)
      ? planning.focusRecommendations.map((recommendation) => (
          recommendation.task?.taskId === updatedTask.taskId
            ? { ...recommendation, task: { ...recommendation.task, ...updatedTask } }
            : recommendation
        ))
      : planning.focusRecommendations,
  }
}

export default function DashboardPage() {
  const { refreshCoins } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskBoard, setShowTaskBoard] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [coinToast, setCoinToast] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [bursts, setBursts] = useState([])
  const [showRocket, setShowRocket] = useState(false)

  const fetchTasks = useCallback(() => {
    return api.get('/dashboard/planning')
      .then((res) => {
        const data = res.data || {}
        setPlanning(data)
        setTasks(Array.isArray(data.tasks) ? data.tasks : [])
      })
      .catch(() => {
        setPlanning(null)
        setTasks([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleTaskUpdated = useCallback((updatedTask) => {
    setEditingTask(null)
    if (updatedTask?.taskId) {
      setTasks((prev) => replaceTask(prev, updatedTask))
      setPlanning((prev) => replacePlanningTask(prev, updatedTask))
      window.dispatchEvent(new CustomEvent('dumpit:tasks-updated'))
    }
    fetchTasks()
  }, [fetchTasks])

  const toggleStatus = async (task, event) => {
    const next = task.status === 'DONE' ? 'TODO' : 'DONE'
    const clickX = event?.clientX
    const clickY = event?.clientY
    try {
      await api.patch(`/tasks/${task.taskId}`, { status: next })
      fetchTasks()
      refreshCoins()

      if (next === 'DONE') {
        // 픽셀 버스트 — 체크 위치에서, 연타 시 동시 3개까지만
        if (clickX != null) {
          setBursts((prev) => prev.length >= 3 ? prev : [...prev, { id: Date.now(), x: clickX, y: clickY }])
        }
        const coins = calcCompletionCoins(task)
        if (coins > 0) {
          setCoinToast({ coins, taskTitle: task.title })
          setTimeout(() => setCoinToast(null), 2500)
        }
      }
    } catch { /* ignore */ }
  }

  const taskList = Array.isArray(tasks) ? tasks : []
  const sections = planning?.sections || null

  const heroTaskId = planning?.nowSuggestion?.task?.taskId ?? null
  const heroQueue = useMemo(
    () => (planning?.focusRecommendations || [])
      .filter((recommendation) => recommendation.task && recommendation.task.taskId !== heroTaskId)
      .slice(0, 2),
    [planning, heroTaskId]
  )

  // 오늘 진행률 (궤도 링) — 마감이 오늘인 태스크 기준
  const { todayDone, todayTotal } = useMemo(() => {
    const now = new Date()
    const todayAll = taskList.filter((t) => {
      if (t.status === 'CANCELLED') return false
      const d = parseDate(t.deadline)
      return d && isSameLocalDate(d, now)
    })
    return {
      todayDone: todayAll.filter((t) => t.status === 'DONE').length,
      todayTotal: todayAll.length,
    }
  }, [taskList])

  // 하루 전체 완료 → 로켓 발사 (거짓→참 전환 시 1회, 하루 1번)
  const allDoneToday = todayTotal > 0 && todayDone === todayTotal
  const prevAllDone = useRef(allDoneToday)
  useEffect(() => {
    if (allDoneToday && !prevAllDone.current && !loading) {
      const key = `dumpit-rocket-${new Date().toISOString().slice(0, 10)}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        setShowRocket(true)
      }
    }
    prevAllDone.current = allDoneToday
  }, [allDoneToday, loading])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-dungeon text-dark text-2xl">대시보드</h2>
          <p className="mt-2 text-sm font-semibold text-sub">
            오늘의 할 일을 확인하고 시간을 효율적으로 관리해보세요
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTaskBoard(true)} className="btn-retro text-sm">
            태스크 전체 보기
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-retro-secondary text-sm">
            태스크 추가
          </button>
          <Link to="/brain-dump" className="btn-retro-primary text-sm">
            브레인 덤프
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card-retro text-center py-12">
          <p className="font-bold text-sub">불러오는 중...</p>
        </div>
      ) : !planning ? (
        <div className="card-retro text-center py-12">
          <p className="font-extrabold text-dark text-base">할 일을 불러오지 못했어요</p>
          <p className="text-xs text-sub mt-2">잠시 후 새로고침 해주세요</p>
        </div>
      ) : (
        <>
          <NowHeroCard
            nowSuggestion={planning.nowSuggestion}
            queue={heroQueue}
            todayDone={todayDone}
            todayTotal={todayTotal}
            allDone={allDoneToday}
            onComplete={toggleStatus}
            onEdit={setEditingTask}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskListCard sections={sections} onToggle={toggleStatus} onEdit={setEditingTask} />

            <div className="card-retro">
              <div className="flex items-baseline gap-2 mb-4">
                <h3 className="font-galmuri font-bold text-dark">달력</h3>
                <span className="text-[10px] text-sub font-medium">날짜를 클릭해서 일정을 태스크로 추가해보세요!</span>
              </div>
              <MiniCalendar tasks={taskList} onTaskAdded={fetchTasks} />
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchTasks() }}
        />
      )}

      {showTaskBoard && sections && (
        <TaskBoardModal
          sections={sections}
          onClose={() => setShowTaskBoard(false)}
          onEditTask={(task) => {
            setShowTaskBoard(false)
            setEditingTask(task)
          }}
          onToggleTask={toggleStatus}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}

      {bursts.map((b) => (
        <PixelBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}

      {showRocket && <RocketLaunch onDone={() => setShowRocket(false)} />}

      {coinToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-bounce">
          <div className="card-retro !py-3 !px-5 bg-secondary flex items-center gap-3">
            <span className="font-dungeon text-2xl text-on-accent">+{coinToast.coins} C</span>
            <div>
              <p className="text-[10px] font-bold text-on-accent opacity-70">완료!</p>
              <p className="text-xs font-extrabold text-on-accent truncate max-w-[200px]">{coinToast.taskTitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: CircularTimetable 폴더 삭제**

```bash
git rm -r frontend/src/components/CircularTimetable
```

- [ ] **Step 3: 빌드 확인**

Run: `cd frontend` 후 `npm run build`
Expected: 빌드 성공. (TaskBoardModal은 아직 구버전 — `tasks` prop이 undefined가 되어 fallback 경로를 타지만 빌드는 통과. 런타임 정합성은 Task 6에서 회복)

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/DashboardPage.jsx
git commit -m "Feat: 대시보드 개편 - 타임테이블 제거, 지금 할 일 히어로 승격, 탭 목록 적용"
```

---

### Task 6: TaskBoardModal 6버킷화 (담당: sonnet 위임 가능)

**Files:**
- Modify: `frontend/src/components/TaskBoardModal.jsx` (전면 재작성)

**Interfaces:**
- Consumes: `parseDate, formatDeadline` (Task 2), Task 1의 sections 구조, Task 5의 호출 시그니처 `<TaskBoardModal sections onClose onEditTask onToggleTask />`
- Produces: 없음 (리프 컴포넌트)

- [ ] **Step 1: TaskBoardModal.jsx 전면 재작성**

파일 전체를 다음으로 교체:

```jsx
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCategory } from '../constants/categories'
import { parseDate, formatDeadline } from '../utils/dates'

function formatPriority(task) {
  if (task.effectivePriority == null) return 'P -'
  return `P ${Math.round(task.effectivePriority * 100)}`
}

function sortTasks(tasks, sortMode) {
  return [...tasks].sort((a, b) => {
    if (sortMode === 'deadline') {
      const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (ad !== bd) return ad - bd
      return (b.effectivePriority ?? 0) - (a.effectivePriority ?? 0)
    }
    const ap = a.effectivePriority ?? -1
    const bp = b.effectivePriority ?? -1
    if (bp !== ap) return bp - ap
    const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return ad - bd
  })
}

function buildSections(sections, sortMode) {
  return [
    { id: 'overdue', title: '마감 지남', tone: 'tone-overdue', tasks: sortTasks(sections.overdue || [], 'deadline') },
    { id: 'today', title: '오늘', tone: 'tone-today', tasks: sortTasks(sections.today || [], sortMode) },
    { id: 'tomorrow', title: '내일', tone: 'tone-soon', tasks: sortTasks(sections.tomorrow || [], sortMode) },
    { id: 'week', title: '일주일 내', tone: 'tone-chip', tasks: sortTasks(sections.next7Days || [], sortMode) },
    { id: 'later', title: '그 외', tone: 'tone-later', tasks: sortTasks(sections.later || [], sortMode) },
    { id: 'someday', title: '언젠가', tone: 'tone-later', tasks: sortTasks(sections.someday || [], sortMode) },
    { id: 'done', title: '완료 (최근 3일)', tone: 'tone-done', tasks: sortTasks(sections.recentDone || [], sortMode) },
  ]
}

function TaskRow({ task, onEdit, onToggle }) {
  const category = getCategory(task.category)
  const isDone = task.status === 'DONE'

  return (
    <div className={`rounded-lg border-2 border-line bg-card p-3 ${isDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-edge ${
            isDone ? 'bg-chip text-dark' : 'bg-card hover:bg-primary'
          }`}
          aria-label={isDone ? '완료 취소' : '완료'}
        >
          {isDone && <span className="block text-[10px] font-black leading-4">V</span>}
        </button>

        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${category.color}`}>
              {category.emoji} {category.label}
            </span>
            <span className="rounded-full border border-line bg-accent px-2 py-0.5 text-[10px] font-black text-sub">
              {formatPriority(task)}
            </span>
            {task.parentTaskId && (
              <span className="rounded-full border border-line bg-chip px-2 py-0.5 text-[10px] font-black text-secondary">
                서브
              </span>
            )}
          </div>
          <p className={`truncate text-sm font-black text-dark ${isDone ? 'line-through' : ''}`}>{task.title}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-sub">
            {formatDeadline(task.deadline) || '마감 없음'}
            {task.estimatedMinutes ? ` · ${task.estimatedMinutes}분` : ''}
          </p>
        </button>
      </div>
    </div>
  )
}

export default function TaskBoardModal({ sections: planningSections, onClose, onEditTask, onToggleTask }) {
  const [sortMode, setSortMode] = useState('priority')
  const sections = useMemo(
    () => buildSections(planningSections || {}, sortMode),
    [planningSections, sortMode]
  )

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overlay-retro px-3 py-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-2xl card-retro p-0 bg-accent max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-line bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-dungeon text-dark text-xl">할 일 크게 보기</h2>
            <p className="mt-1 text-xs font-semibold text-sub">마감 구간별로 나눠서 전체 흐름을 볼 수 있어요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-card p-1">
              {[
                ['priority', '중요도순'],
                ['deadline', '마감순'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortMode(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
                    sortMode === value ? 'bg-primary text-on-accent' : 'text-sub hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-lg border border-line bg-card text-sm font-black text-dark hover:bg-chip hover:text-dark"
            >
              X
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-4">
          <div className="grid auto-rows-[17rem] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <section key={section.id} className={`flex min-h-0 flex-col rounded-lg border-2 p-3 ${section.tone}`}>
                <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-2">
                  <h3 className="font-galmuri font-bold text-sm text-dark">{section.title}</h3>
                  <span className="rounded-full border border-line bg-card px-2 py-0.5 text-[10px] font-black text-sub">
                    {section.tasks.length}
                  </span>
                </div>
                {section.tasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-line bg-card px-3 py-6 text-center">
                    <p className="text-xs font-bold text-sub">비어 있어요.</p>
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {section.tasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        onEdit={onEditTask}
                        onToggle={onToggleTask}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd frontend` 후 `npm run build`
Expected: 빌드 성공, 에러 0

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/TaskBoardModal.jsx
git commit -m "Feat: 태스크 전체 보기 모달 6버킷 컬럼으로 개편"
```

---

### Task 7: 잔존 참조 정리 + 최종 검증 (담당: Fable 검증, 수동 QA는 사용자와 함께)

**Files:**
- 없음 (검증 전용 — 발견된 잔존 참조가 있으면 해당 파일 수정)

**Interfaces:**
- Consumes: Task 1~6의 모든 결과물

- [ ] **Step 1: 잔존 참조 0건 확인**

Run (리포 루트에서):
```bash
grep -rn "CircularTimetable\|timedTasks\|next3Days\|NEXT_3_DAYS" --include="*.jsx" --include="*.js" --include="*.java" frontend/src backend/src
```
Expected: 출력 없음 (0건). 나오면 해당 파일에서 제거 후 재확인

- [ ] **Step 2: 백엔드 전체 테스트**

Run: `cd backend` 후 `.\gradlew.bat test`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 프론트 빌드 + 린트**

Run: `cd frontend` 후 `npm run build`, 이어서 `npm run lint`
Expected: 빌드 성공, lint 에러·경고 0

- [ ] **Step 4: 수동 QA (dev 서버)**

백엔드·프론트 로컬 기동 후 체크리스트:

- [ ] 히어로: 지금 할 일 제목·마감시각·추천 이유 표시, [완료하기] 클릭 → 픽셀 버스트 + 코인 토스트 + 진행률 링 갱신
- [ ] 히어로: 다음에 할 일 미니 큐 최대 2개, 클릭 시 수정 모달
- [ ] 탭: 오늘/내일/일주일/전부 전환, 전부 탭에서 그 외·언젠가 섹션 헤더 표시
- [ ] 마감 지남 항목이 어느 탭에서든 최상단 경고색으로 고정
- [ ] 완료 접이식: 펼침/접힘, 완료 시각·+코인 표시, 체크 해제 시 목록 복귀
- [ ] 전체 보기 모달: 7컬럼(마감지남/오늘/내일/일주일/그외/언젠가/완료), 정렬 토글 동작
- [ ] 오늘 할 일 전체 완료 → "오늘 다 비웠어요 🚀" + 로켓 발사
- [ ] 모바일 뷰포트(개발자도구 375px): 세로 1열 쌓임, 가로 스크롤 없음

- [ ] **Step 5: 마무리 커밋 (잔존 수정이 있었던 경우만)**

```bash
git add -A
git commit -m "Chore: 대시보드 개편 잔존 참조 정리"
```

이후 main 머지/푸시는 사용자 확인 후 진행.
