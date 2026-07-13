# 뽀모도로 색상 독립 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 뽀모도로 UI(웹+데스크톱 위젯)를 전역 테마에서 분리해 고정 팔레트/pomo 스킨이 관장하게 한다.

**Architecture:** 루트 `--pomo-*` 변수를 전역 폴백에서 고정 리터럴로 교체하고 `--pomo-soft`를 신설, `PomodoroTimer.jsx`의 전역색 참조 4곳을 pomo 변수로 바꾼다. 데스크톱 위젯은 기존 `updatePomodoroState` IPC 페이로드에 해석 완료된 `colors`를 동봉받아 로컬 CSS 변수에 주입한다. 스펙: `docs/superpowers/specs/2026-07-13-pomodoro-color-independence-design.md`.

**Tech Stack:** React 19 + Vite + Tailwind(CSS 변수 토큰), Electron preload IPC.

## Global Constraints

- 미장착 기본 팔레트(스펙 표 그대로): focus `#D95F52`/`#F09355`, break `#3E8E85`/`#5FC4B4`, ring `#E0D2B6`/`#413966`, soft `#F7EFDF`/`#1F1B2E` (라이트/다크).
- 스킨별 soft: ocean `#E4EFEC`/`#1E3240`, lavender `#EEEAF4`/`#32294E`, rose `#F5E9EA`/`#3A282E`, candy `#FBE4EE`/`#402832`.
- 기본 테마+미장착 조합의 외형은 기존과 픽셀 단위 동일해야 함 (리터럴이 기존 폴백의 해석값과 같으므로 자동 충족).
- 프론트 검증: `npm run lint`(에러 0), `npm run build`. 테스트 러너 없음 — dev 스모크로 보완.
- 커밋 메시지: `Feat:`/`Fix:` + 한국어, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 푸터.
- desktop/ 수정은 dev 브랜치에서 진행 (desktop 브랜치와 현재 diff 0 확인됨).

---

### Task 1: 웹 — 고정 팔레트 + PomodoroTimer 교체

**Files:**
- Modify: `frontend/src/index.css:37` (루트 pomo 변수), `:40-48` 다크 블록, `:341-348` pomo 스킨 블록
- Modify: `frontend/src/components/PomodoroTimer.jsx:290` (설정 패널), `:313-315` (적용 버튼), `:367-374` (시작/일시정지 버튼)

**Interfaces:**
- Produces: CSS 변수 `--pomo-focus/--pomo-break/--pomo-ring/--pomo-soft` — 라이트/다크/스킨 4종 전부 정의됨. Task 2가 이 4개를 getComputedStyle로 읽음.

- [ ] **Step 1: index.css 루트 변수 교체** — L37을:

```css
  /* 뽀모도로는 전역 테마와 독립된 고정 팔레트 — pomo 스킨 장착 시에만 아래 스킨 블록이 관장 */
  --pomo-focus:#D95F52; --pomo-break:#3E8E85; --pomo-ring:#E0D2B6; --pomo-soft:#F7EFDF;
```

`[data-theme="dark"]` 블록(L40-48) 안에 추가:

```css
  --pomo-focus:#F09355; --pomo-break:#5FC4B4; --pomo-ring:#413966; --pomo-soft:#1F1B2E;
```

- [ ] **Step 2: pomo 스킨 4종에 --pomo-soft 추가** — 기존 8줄을 각각 확장:

```css
[data-skin-pomodoro="ocean"] { --pomo-focus:#2E7D8A; --pomo-break:#D97757; --pomo-soft:#E4EFEC; }
[data-skin-pomodoro="ocean"][data-theme="dark"] { --pomo-focus:#5FB8C9; --pomo-break:#F09355; --pomo-soft:#1E3240; }
[data-skin-pomodoro="lavender"] { --pomo-focus:#8A63C4; --pomo-break:#3E8E85; --pomo-soft:#EEEAF4; }
[data-skin-pomodoro="lavender"][data-theme="dark"] { --pomo-focus:#B79CE8; --pomo-break:#5FC4B4; --pomo-soft:#32294E; }
[data-skin-pomodoro="rose"] { --pomo-focus:#C25B6E; --pomo-break:#6E9E62; --pomo-soft:#F5E9EA; }
[data-skin-pomodoro="rose"][data-theme="dark"] { --pomo-focus:#E8899B; --pomo-break:#8FBF6F; --pomo-soft:#3A282E; }
[data-skin-pomodoro="candy"] { --pomo-focus:#E05C8A; --pomo-break:#5CA8E0; --pomo-ring:#F0C4D8; --pomo-soft:#FBE4EE; }
[data-skin-pomodoro="candy"][data-theme="dark"] { --pomo-focus:#F08CAE; --pomo-break:#7FB8E8; --pomo-ring:#5A3A48; --pomo-soft:#402832; }
```

- [ ] **Step 3: PomodoroTimer.jsx 교체 3곳**

설정 패널(L290):
```jsx
<div className="w-full border border-line rounded-lg p-2 space-y-2" style={{ background: 'var(--pomo-soft)' }}>
```

적용 버튼(L313-315):
```jsx
<button
  onClick={() => saveSettings(focusMin, breakMin)}
  className="w-full btn-retro text-on-accent text-[0.625rem] py-1.5"
  style={{ background: 'var(--pomo-focus)' }}
>
```

시작/일시정지 버튼(L367-374):
```jsx
<button
  onClick={toggle}
  style={{ background: running ? 'var(--pomo-soft)' : 'var(--pomo-focus)' }}
  className={`btn-retro flex-1 text-xs py-2 ${running ? 'text-dark' : 'text-on-accent'}`}
>
```

- [ ] **Step 4: lint + build**

Run: `cd frontend; npm run lint; npm run build`
Expected: 에러 0(기존 경고 7개는 무관), 빌드 성공.

- [ ] **Step 5: dev 스모크(웹만)** — vite dev에서: 기본 테마+미장착 외형이 기존과 동일 / 배경 테마(오션 등) 장착해도 뽀모도로 불변 / pomo 테마 장착 시 배지·링·버튼·설정 패널 전부 pomo색 / 다크 토글 반영.

- [ ] **Step 6: Commit**

```
git add frontend/src/index.css frontend/src/components/PomodoroTimer.jsx
git commit -m "Feat: 뽀모도로 고정 팔레트 독립 (--pomo-soft 신설, 전역색 결합 해제)"
```

---

### Task 2: 웹 → 위젯 colors 동봉

**Files:**
- Modify: `frontend/src/components/PomodoroTimer.jsx` (updatePomodoroState effect L219-232 + MutationObserver 신설)

**Interfaces:**
- Consumes: Task 1의 CSS 변수 4종.
- Produces: `updatePomodoroState` 페이로드에 `colors: { focus: string, break: string, ring: string, soft: string }` (예: `"#D95F52"`) — Task 3의 위젯이 소비. colors는 항상 포함(데스크톱 환경에서만 effect 자체가 동작).

- [ ] **Step 1: colors 읽기 + 전송 effect 확장** — 기존 updatePomodoroState effect를:

```jsx
const [skinTick, setSkinTick] = useState(0)

// 유휴 중 테마/스킨 변경 감지 — applyTheme·applySkins 모두 <html> dataset을 바꾸므로 observer 하나로 커버
useEffect(() => {
  if (typeof window === 'undefined' || !window.dumpitDesktop) return undefined
  const observer = new MutationObserver(() => setSkinTick((t) => t + 1))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-skin-pomodoro'],
  })
  return () => observer.disconnect()
}, [])

useEffect(() => {
  if (typeof window === 'undefined' || !window.dumpitDesktop?.updatePomodoroState) return

  const style = getComputedStyle(document.documentElement)
  window.dumpitDesktop.updatePomodoroState({
    active: true,
    mode,
    time: `${min}:${sec}`,
    running,
    progress,
    taskTitle: selectedTask?.title || '',
    selectedTaskId: String(selectedTaskId || ''),
    tasks: desktopTasks,
    colors: {
      focus: style.getPropertyValue('--pomo-focus').trim(),
      break: style.getPropertyValue('--pomo-break').trim(),
      ring: style.getPropertyValue('--pomo-ring').trim(),
      soft: style.getPropertyValue('--pomo-soft').trim(),
    },
  })
}, [mode, min, sec, running, progress, selectedTask, selectedTaskId, desktopTasks, skinTick])
```

- [ ] **Step 2: lint + build**

Run: `cd frontend; npm run lint; npm run build`
Expected: 에러 0, 빌드 성공.

- [ ] **Step 3: Commit**

```
git add frontend/src/components/PomodoroTimer.jsx
git commit -m "Feat: 뽀모도로 위젯에 pomo 색상 페이로드 동봉 (테마/스킨 변경 감지)"
```

---

### Task 3: 위젯 — colors 소비 + 통합 검증

**Files:**
- Modify: `desktop/electron/pomodoro-widget.html` (CSS 변수화)
- Modify: `desktop/electron/pomodoro-widget-preload.cjs:17-31` (renderState에 colors 적용)

**Interfaces:**
- Consumes: Task 2의 `payload.colors` — 부재 시(구버전 웹 접속) 기본값 유지해야 함.

- [ ] **Step 1: 위젯 CSS 변수화** — `:root`(라이트·다크 각각)에 로컬 기본값 추가:

```css
      --pomo-focus: var(--accent); --pomo-break: var(--accent2); --pomo-ring: var(--line);
```

사용처 교체: `.mode` background `var(--accent)`→`var(--pomo-focus)` / `.progress` stroke `var(--accent)`→`var(--pomo-focus)` / `.track` stroke `var(--line)`→`var(--pomo-ring)` / `.action.primary` background `var(--accent)`→`var(--pomo-focus)` / `body.break .mode, body.break .action.primary` background `var(--accent2)`→`var(--pomo-break)` / `body.break .progress` stroke `var(--accent2)`→`var(--pomo-break)` / `body.idle .action.primary` background `var(--accent)`→`var(--pomo-focus)` (soft는 위젯에 해당 면 없음 — 소비 안 함).

- [ ] **Step 2: renderState에 colors 적용** — `renderState()` 상단에 추가:

```js
  const colors = payload.colors
  if (colors && typeof colors === 'object') {
    const root = document.documentElement
    const varMap = { focus: '--pomo-focus', break: '--pomo-break', ring: '--pomo-ring' }
    for (const [key, cssVar] of Object.entries(varMap)) {
      if (typeof colors[key] === 'string' && colors[key]) {
        root.style.setProperty(cssVar, colors[key])
      }
    }
  }
```

- [ ] **Step 3: 통합 스모크** — desktop 앱 실행이 가능하면(`cd desktop; npm start`) 위젯 열고: 웹에서 pomo 테마 장착 → 위젯 배지·링·버튼 색 동기화, 다크 토글 → 위젯 반영, 미장착 → 기본색. 실행이 어려우면 대체 검증: 웹 콘솔에서 `window.dumpitDesktop` 부재 확인(웹 단독 회귀 없음) + preload는 colors 부재 시 no-op이라 하위호환 보장.

- [ ] **Step 4: Commit**

```
git add desktop/electron/pomodoro-widget.html desktop/electron/pomodoro-widget-preload.cjs
git commit -m "Feat: 뽀모도로 위젯 pomo 색상 동기화 (colors 페이로드 소비)"
```

- [ ] **Step 5: 메모리 갱신** — `project_shop_followups.md`의 "뽀모도로 색상 독립" 항목을 완료 표시로 갱신하고, 데스크톱 위젯 스킨 항목에 "색상은 2026-07-13 해결(colors IPC), 나머지 크롬(카드·라인) 스킨화만 잔존" 반영.

---

## 배포 메모

- 백엔드 변경 없음. 웹만 먼저 배포돼도 위젯은 colors 소비 로직이 없을 뿐 동작 불변(하위호환 양방향).
- main 배포 스모크: 뽀모도로 기본 외형 동일 + pomo 테마 장착 시 독립 배색.
