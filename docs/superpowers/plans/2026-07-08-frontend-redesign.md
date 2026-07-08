# Dumpit 프론트엔드 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스펙(`docs/superpowers/specs/2026-07-08-frontend-redesign-design.md`)의 "레트로 우주" 디자인을 전체 프론트엔드(웹 + 데스크탑 위젯)에 적용한다.

**Architecture:** CSS 변수 기반 라이트/다크 토큰 시스템을 `index.css`에 정의하고 Tailwind 색상이 변수를 참조하게 하여, 클래스명 변경 없이 전역 색이 전환되게 한다. 그 위에 컴포넌트 문법 클래스(`btn-retro` 등)를 재정의하고, 페이지별 패스에서 잔여 하드코딩을 교체한다. 보상 모션은 독립 컴포넌트(`PixelBurst`, `RocketLaunch`, `OrbitProgress`)로 만든다.

**Tech Stack:** React 18 + Vite + Tailwind CSS 3, react-router, Playwright(MCP, 스크린샷 검증), Electron(데스크탑 위젯은 `desktop` 브랜치)

## Global Constraints

- **레이아웃/정보 구조 변경 금지.** 불가피하면 ① 이유 ② 변경 전후를 사용자에게 보고하고 승인 후에만 변경 (스펙 10절)
- 픽셀 폰트(DungGeunMo)는 크롬(로고·섹션 라벨·버튼·숫자)에만. 콘텐츠 텍스트는 Pretendard
- 순수 검정 외곽선/그림자 금지 — 항상 `--edge`/`--shadow-*` 토큰 사용
- 반응형 360–1440px, 터치 타겟 ≥44px, 가로 스크롤 금지
- 상시 모션은 궤도 위성·다크 별 반짝임뿐. 전 모션 `prefers-reduced-motion: reduce`에서 비활성
- **Tailwind 색상이 `var()` 참조가 되므로 `/40` 같은 알파 수식이 더 이상 동작하지 않음** — `text-dark/40` 류를 발견하면 `text-sub`로 교체
- 작업 브랜치 `frontend`. 태스크당 1커밋. 검증은 dev 서버 + 두 테마 스크린샷(단위 테스트 인프라 없음 — 시각 검증이 이 프로젝트의 테스트 사이클)
- dev 서버: `cd frontend; npm run dev` (Vite, 기본 http://localhost:5173)

---

### Task 1: 컬러 토큰 + 테마 시스템

**Files:**
- Modify: `frontend/index.html` (head에 테마 초기화 스크립트)
- Modify: `frontend/src/index.css` (토큰 정의)
- Modify: `frontend/tailwind.config.js` (색상 → var 참조)
- Create: `frontend/src/utils/theme.js`

**Interfaces:**
- Produces: CSS 변수 `--bg --card --fg --sub --line --edge --chip --accent --accent2 --on-accent --shadow-hero --shadow-sm --p1 --p2 --p3`; Tailwind 색상 `primary secondary accent dark card line edge chip sub on-accent`; `applyTheme(pref)`, `getThemePref()` (pref: `'light'|'dark'|'system'`)

- [ ] **Step 1: index.html `<head>` 최상단에 FOUC 방지 스크립트 추가**

```html
<script>
  (function () {
    var p = localStorage.getItem('dumpit-theme');
    var t = (p === 'light' || p === 'dark') ? p
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
  })();
</script>
```

- [ ] **Step 2: index.css의 `:root` 블록을 토큰 시스템으로 교체** (기존 `--color-*`, `--outline`, `--shadow-kitschy` 제거)

```css
:root {
  --bg:#F7EFDF; --card:#FFFDF6; --fg:#33271E; --sub:#8C7C66;
  --line:#E0D2B6; --edge:#3A2C21; --chip:#F0DFBB;
  --accent:#D95F52; --accent2:#C98A2D; --on-accent:#FFFBF0;
  --shadow-hero:#EBC0AC; --shadow-sm:#DCC5A0;
  --p1:#C98A2D; --p2:#E9B44C; --p3:#A66B22;
}
[data-theme="dark"] {
  --bg:#1F1B2E; --card:#2B2442; --fg:#F2E9D8; --sub:#9D93A8;
  --line:#413966; --edge:#141021; --chip:#3A3156;
  --accent:#F09355; --accent2:#E9B44C; --on-accent:#241E14;
  --shadow-hero:#141021; --shadow-sm:#141021;
  --p1:#C98A2D; --p2:#E9B44C; --p3:#8A5A1E;
}
body {
  margin: 0;
  background-color: var(--bg);
  color: var(--fg);
}
```
(body의 `font-family`, `-webkit-font-smoothing`은 Task 2에서 처리)

- [ ] **Step 3: tailwind.config.js 색상/그림자를 변수 참조로 교체**

```js
colors: {
  primary: 'var(--accent)',
  secondary: 'var(--accent2)',
  accent: 'var(--bg)',        // 기존 bg-accent(페이지 배경) 사용처 자동 전환
  dark: 'var(--fg)',          // 기존 text-dark 사용처 자동 전환
  card: 'var(--card)',
  line: 'var(--line)',
  edge: 'var(--edge)',
  chip: 'var(--chip)',
  sub: 'var(--sub)',
  'on-accent': 'var(--on-accent)',
},
boxShadow: {
  retro: '3px 3px 0 var(--shadow-sm)',
  'retro-lg': '5px 5px 0 var(--shadow-hero)',
  // 구 이름 별칭 — 전 화면 즉시 전환용, Task 13에서 제거
  kitschy: '3px 3px 0 var(--shadow-sm)',
  'kitschy-lg': '5px 5px 0 var(--shadow-hero)',
  'kitschy-xl': '5px 5px 0 var(--shadow-hero)',
},
```

- [ ] **Step 4: `frontend/src/utils/theme.js` 작성**

```js
const KEY = 'dumpit-theme'

export function getThemePref() {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function applyTheme(pref) {
  if (pref === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
  const resolved = pref === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref
  document.documentElement.dataset.theme = resolved
}

export function watchSystemTheme() {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (getThemePref() === 'system') applyTheme('system') }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
```

- [ ] **Step 5: 검증** — `npm run dev` 후 브라우저에서 홈 화면이 크림 배경으로 렌더링되는지, DevTools 콘솔에서 `document.documentElement.dataset.theme='dark'` 실행 시 전체가 딥 플럼으로 바뀌는지 스크린샷으로 확인
- [ ] **Step 6: Commit** — `Feat: 리디자인 컬러 토큰 및 라이트/다크 테마 시스템`

---

### Task 2: 폰트 교체

**Files:**
- Modify: `frontend/src/index.css`, `frontend/src/main.jsx`, `frontend/tailwind.config.js`, `frontend/package.json`

**Interfaces:**
- Produces: Tailwind `font-sans`(Pretendard), `font-dungeon`(DungGeunMo). `font-display`는 DGM 별칭으로 임시 유지 후 Task 13 제거

- [ ] **Step 1:** `cd frontend; npm i pretendard` 후 `main.jsx` 최상단에 `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'`
- [ ] **Step 2:** index.css에서 Mona12 CDN `@import` 제거, `-webkit-font-smoothing: none` 제거(둥근모꼴 요소에만 국소 적용), DungGeunMo `@font-face`는 유지하되 `font-family: 'DungGeunMo'`로 개명(기존 `RoundedFixedsys` 이름 정리)
- [ ] **Step 3:** tailwind.config.js:

```js
fontFamily: {
  sans: ['"Pretendard Variable"', 'Pretendard', '"Malgun Gothic"', 'system-ui', 'sans-serif'],
  dungeon: ['DungGeunMo', '"Malgun Gothic"', 'monospace'],
  display: ['DungGeunMo', '"Malgun Gothic"', 'monospace'], // 별칭, Task 13 제거
},
```

- [ ] **Step 4: 검증** — 본문이 Pretendard, `font-display` 사용처(제목류)가 둥근모꼴로 보이는지 스크린샷
- [ ] **Step 5: Commit** — `Feat: Pretendard 본문 + 둥근모꼴 크롬 폰트 체계`

---

### Task 3: 컴포넌트 문법 클래스

**Files:**
- Modify: `frontend/src/index.css` (`@layer components` 재작성)

**Interfaces:**
- Produces: `.btn-retro`, `.btn-retro-primary`, `.card-retro`, `.card-retro-hero`, `.label-retro`, `.chip-retro`, `.check-retro`, `.divider-retro`. 구 클래스 `.btn-kitschy` `.card-kitschy` `.heading-kitschy`는 새 문법의 별칭으로 재정의(전 화면 즉시 전환, Task 13에서 개명 완료 후 제거)

- [ ] **Step 1: index.css `@layer components` 교체**

```css
@layer components {
  .btn-retro {
    @apply font-dungeon text-sm px-4 py-2.5 rounded-[11px] bg-card text-dark;
    border: 1.5px solid var(--edge);
    box-shadow: 3px 3px 0 var(--shadow-sm);
    transition: transform .08s ease, box-shadow .08s ease;
    min-height: 44px;
  }
  .btn-retro:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--shadow-sm); }
  .btn-retro:active { transform: translate(3px,3px); box-shadow: 0 0 0 var(--shadow-sm); }
  .btn-retro:focus-visible { outline: 2px solid var(--accent2); outline-offset: 2px; }
  .btn-retro-primary { @apply btn-retro bg-primary text-on-accent; }

  .card-retro {
    @apply bg-card rounded-2xl p-5;
    border: 1.5px solid var(--edge);
    box-shadow: 3px 3px 0 var(--shadow-sm);
  }
  .card-retro-hero { @apply card-retro; box-shadow: 5px 5px 0 var(--shadow-hero); }
  [data-theme="dark"] .card-retro-hero {
    box-shadow: 5px 5px 0 var(--shadow-hero), 0 0 28px rgba(240,147,85,.16);
  }

  .label-retro {
    @apply font-dungeon text-xs text-sub inline-block;
    letter-spacing: .05em;
    border-bottom: 2px dotted var(--accent2);
    padding-bottom: 4px;
  }
  .chip-retro { @apply font-dungeon text-[11px] bg-chip rounded-md px-2 py-0.5; }
  .check-retro {
    @apply w-3.5 h-3.5 rounded bg-card inline-flex items-center justify-center flex-none;
    border: 1.5px solid var(--edge);
  }
  .check-retro.done { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .divider-retro { border-bottom: 1px dashed var(--line); }

  /* 구 클래스 별칭 — Task 13에서 제거 */
  .btn-kitschy { @apply btn-retro; }
  .card-kitschy { @apply card-retro; }
  .heading-kitschy { @apply font-dungeon text-dark tracking-wide; }
}
```

- [ ] **Step 2: 검증** — 기존 버튼/카드가 새 문법(웜 브라운 얇은 외곽선 + 컬러 그림자 + 프레스 촉감)으로 일괄 전환됐는지 대시보드에서 확인, 두 테마 스크린샷
- [ ] **Step 3: Commit** — `Feat: 레트로 컴포넌트 문법 클래스 (구 kitschy 클래스 별칭 전환)`

---

### Task 4: 테마 토글 UI (SettingsModal)

**Files:**
- Modify: `frontend/src/components/SettingsModal.jsx`
- Modify: `frontend/src/components/layout/Layout.jsx` (`watchSystemTheme` 구독)

**Interfaces:**
- Consumes: `applyTheme`, `getThemePref`, `watchSystemTheme` (Task 1)

- [ ] **Step 1:** SettingsModal에 "테마" 섹션 추가 — 라이트/다크/시스템 3버튼(`btn-retro`, 선택된 것은 `btn-retro-primary`), 클릭 시 `applyTheme(pref)` 즉시 반영. 기존 설정 항목들의 마크업 구조는 유지
- [ ] **Step 2:** Layout `useEffect`에서 `watchSystemTheme()` 구독/해제
- [ ] **Step 3: 검증** — 3옵션 각각 클릭→즉시 전환, 새로고침 후 유지, 시스템 모드에서 OS 테마 변경 시 자동 전환 확인
- [ ] **Step 4: Commit** — `Feat: 설정 모달에 라이트/다크/시스템 테마 토글`

---

### Task 5: 레이아웃 크롬 (Header / Sidebar / Footer / Layout + 다크 별)

**Files:**
- Modify: `frontend/src/components/layout/Header.jsx`, `Sidebar.jsx`, `Footer.jsx`, `Layout.jsx`
- Create: `frontend/src/components/StarField.jsx`
- Modify: `frontend/src/index.css` (starfield/트윙클 키프레임)

**Interfaces:**
- Produces: `<StarField />` — 다크 테마에서만 보이는 고정 배경 별 2겹

- [ ] **Step 1: StarField 작성** (Layout 루트에 삽입, `pointer-events:none; position:fixed; inset:0; z-index:0`)

```jsx
export default function StarField() {
  return <div className="starfield" aria-hidden="true" />
}
```

```css
.starfield { position: fixed; inset: 0; pointer-events: none; z-index: 0; display: none; }
[data-theme="dark"] .starfield { display: block; }
.starfield::before, .starfield::after {
  content: ""; position: absolute; top: 0; left: 0; width: 2px; height: 2px;
  box-shadow: 8vw 12vh #E9B44C, 22vw 38vh #F2E9D8, 41vw 8vh #6E6488, 55vw 62vh #E9B44C,
    68vw 24vh #F2E9D8, 82vw 74vh #B0672F, 91vw 15vh #6E6488, 15vw 82vh #F2E9D8,
    35vw 91vh #E9B44C, 74vw 48vh #6E6488;
}
.starfield::after {
  box-shadow: 12vw 55vh #F2E9D8, 48vw 28vh #E9B44C, 63vw 85vh #6E6488, 88vw 42vh #F2E9D8;
  animation: twinkle 4s ease-in-out infinite alternate;
}
@keyframes twinkle { from { opacity: .15; } to { opacity: .9; } }
@media (prefers-reduced-motion: reduce) { .starfield::after { animation: none; } }
```

- [ ] **Step 2: Header** — 로고 텍스트를 `font-dungeon` + `Dumpit<span class="text-primary">!</span>`, 코인 배지를 `chip-retro` 문법의 필(pill)로, 네비 링크는 조용하게(`text-sub`, 활성만 `text-dark`). 알파 수식(`/40` 등) 발견 시 `text-sub` 교체
- [ ] **Step 3: Sidebar** — 활성 항목: `--chip` 배경 + `text-dark`, 비활성: `text-sub`. 섹션 제목은 `label-retro`. 콘텐츠 영역 z-index가 StarField 위에 오도록 `relative z-10` 확인
- [ ] **Step 4: Footer/Layout** — Layout 루트에 `<StarField />` + `padding: env(safe-area-inset-*)` 적용, Footer 링크 `text-sub`
- [ ] **Step 5: 검증** — 두 테마 × (1280px, 360px) 4장 스크린샷: 다크에서 별 보임, 모바일에서 크롬 깨짐 없음
- [ ] **Step 6: Commit** — `Feat: 레이아웃 크롬 리디자인 + 다크 모드 별 배경`

---

### Task 6: 모달 9종 + 토스트

**Files:**
- Modify: `frontend/src/components/AddTaskModal.jsx`, `EditTaskModal.jsx`, `TaskBoardModal.jsx`, `SettingsModal.jsx`, `NoticeModal.jsx`, `ContactModal.jsx`, `HelpModal.jsx`, `SubtaskProposalModal.jsx`, `PrivacyPolicyModal.jsx`, `frontend/src/context/ToastContext.jsx`

**Interfaces:**
- Consumes: `card-retro`, `btn-retro(-primary)`, `label-retro`, `chip-retro` (Task 3)

- [ ] **Step 1:** 각 모달 공통 패스 — 컨테이너 `card-retro`(radius 16px), 오버레이 라이트 `rgba(58,44,33,.35)` / 다크 `rgba(10,8,20,.55)`(CSS 변수 `--overlay`를 index.css 토큰에 추가), 제목은 `font-dungeon` 크롬 요소로, 본문/입력은 `font-sans`. 입력 필드: `bg-card border-line rounded-lg`, focus 시 `border-primary`. 버튼 교체: 확인=`btn-retro-primary`, 취소=`btn-retro`
- [ ] **Step 2:** ToastContext — 토스트를 `card-retro` 미니 버전(픽셀 폰트 금지, 본문 폰트)으로
- [ ] **Step 3: 검증** — AddTask/Settings/Help 모달을 두 테마에서 열어 스크린샷, 360px에서 모달이 화면 안에 들어오는지 확인
- [ ] **Step 4: Commit** — `Feat: 모달·토스트 리디자인`

---

### Task 7: OrbitProgress + Dashboard

**Files:**
- Create: `frontend/src/components/OrbitProgress.jsx`
- Modify: `frontend/src/pages/DashboardPage.jsx`, `frontend/src/index.css` (픽셀 행성/위성)

**Interfaces:**
- Produces: `<OrbitProgress done={n} total={m} size={64} />` — 진행률 링+픽셀 행성+위성+`n/m` 라벨

- [ ] **Step 1: OrbitProgress 작성**

```jsx
export default function OrbitProgress({ done, total, size = 64 }) {
  const r = (size / 2) - 3
  const c = 2 * Math.PI * r
  const frac = total > 0 ? Math.min(done / total, 1) : 0
  return (
    <div className="orbit-progress" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="var(--line)" strokeWidth="1.5" strokeDasharray="2 4" />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${frac * c} ${c}`} />
        </svg>
        <div className="pixel-planet" aria-hidden="true" />
        <div className="orbit-sat" aria-hidden="true" />
      </div>
      <p className="text-[11px] text-sub text-center mt-1.5">
        오늘 <span className="font-dungeon text-secondary text-xs">{done}/{total}</span>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: index.css에 픽셀 행성·위성 추가** (4라운드 목업의 box-shadow 픽셀아트 그대로 — `--p1/--p2/--p3` 사용, `.orbit-sat`은 `orbit 9s linear infinite`, reduced-motion 시 정지)

```css
.pixel-planet {
  position: absolute; top: 50%; left: 50%; width: 3px; height: 3px;
  margin: -10.5px 0 0 -10.5px; background: var(--p2);
  box-shadow:
    6px 0 var(--p1), 9px 0 var(--p1), 12px 0 var(--p1),
    3px 3px var(--p1), 6px 3px var(--p2), 9px 3px var(--p1), 12px 3px var(--p1), 15px 3px var(--p1),
    0 6px var(--p1), 3px 6px var(--p2), 6px 6px var(--p1), 9px 6px var(--p1), 12px 6px var(--p1), 15px 6px var(--p1), 18px 6px var(--p1),
    0 9px var(--p3), 3px 9px var(--p3), 6px 9px var(--p3), 9px 9px var(--p3), 12px 9px var(--p3), 15px 9px var(--p3), 18px 9px var(--p3),
    0 12px var(--p1), 3px 12px var(--p1), 6px 12px var(--p1), 9px 12px var(--p1), 12px 12px var(--p1), 15px 12px var(--p1), 18px 12px var(--p1),
    3px 15px var(--p1), 6px 15px var(--p1), 9px 15px var(--p1), 12px 15px var(--p1), 15px 15px var(--p1),
    6px 18px var(--p1), 9px 18px var(--p1), 12px 18px var(--p1);
}
.orbit-sat {
  position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; margin: -2.5px;
  background: var(--accent); border-radius: 1px;
  animation: orbit 9s linear infinite;
}
@keyframes orbit {
  from { transform: rotate(0deg) translateX(29px); }
  to { transform: rotate(360deg) translateX(29px); }
}
@media (prefers-reduced-motion: reduce) { .orbit-sat { animation: none; } }
```

- [ ] **Step 3: DashboardPage** — "지금 할 일" 최상단 카드에 `card-retro-hero` + 타이틀 22px/800(`text-[22px] font-extrabold`, 모바일 `max-sm:text-[19px]`) + 시간 `font-dungeon text-[19px] text-primary` + 우측 `<OrbitProgress done total />`(오늘 완료/전체를 기존 상태에서 계산, 640px 미만에서 `flex-wrap`으로 하단 랩). 목록 항목: `check-retro` + `divider-retro` + `chip-retro` 시간. 정보 배치·순서는 그대로
- [ ] **Step 4: 검증** — 두 테마 × 두 뷰포트 스크린샷: 링이 완료 비율만큼 채워지는지(더미로 done 값 바꿔 확인), 위성 공전, 모바일 랩 정상
- [ ] **Step 5: Commit** — `Feat: 대시보드 히어로 + 픽셀 행성 궤도 진행률`

---

### Task 8: BrainDump + IdeaDump (결과 스태거 포함)

**Files:**
- Modify: `frontend/src/pages/BrainDumpPage.jsx`, `frontend/src/pages/IdeaDumpPage.jsx`, `frontend/src/components/SubtaskProposalModal.jsx`(결과 표시부만), `frontend/src/index.css`(스태거)

- [ ] **Step 1: index.css 스태거 추가**

```css
.stagger-in > * { animation: rise-in .3s ease-out both; animation-delay: calc(var(--i, 0) * 60ms); }
@keyframes rise-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .stagger-in > * { animation: none; } }
```

- [ ] **Step 2:** 두 페이지 공통 패스 — 입력 텍스트영역: `card-retro` 문법 + `font-sans`(콘텐츠), 라벨 `label-retro`, 제출 버튼 `btn-retro-primary`, AI 사용량 배지는 `chip-retro`. 클래스 매핑: `bg-white→bg-card`, `border-dark→border-edge`, `text-dark/NN→text-sub`, `font-display→font-dungeon`(크롬만; 콘텐츠 제목이면 `font-sans font-bold`)
- [ ] **Step 3:** AI 분석 결과 카드 목록 컨테이너에 `stagger-in` + 각 아이템 `style={{'--i': idx}}` (파티클 없음 — 스펙 보상 모션 5)
- [ ] **Step 4: 검증** — 분석 실행 → 결과 스태거 등장 확인, 두 테마 스크린샷, 360px 확인
- [ ] **Step 5: Commit** — `Feat: 브레인/아이디어 덤프 리디자인 + 결과 스태거`

---

### Task 9: Routine + Shop + Pomodoro/CircularTimetable/MiniCalendar

**Files:**
- Modify: `frontend/src/pages/RoutinePage.jsx`, `frontend/src/pages/ShopPage.jsx`, `frontend/src/components/PomodoroTimer.jsx`, `frontend/src/components/CircularTimetable/CircularTimetable.jsx`, `frontend/src/components/MiniCalendar.jsx`, `frontend/src/components/DeadlineNudgeMenu.jsx`, `frontend/src/components/TaskTimeInputs.jsx`, `frontend/src/components/AiUsageBadge.jsx`

- [ ] **Step 1:** Task 8과 동일한 클래스 매핑 패스를 각 파일에 적용. 추가 규칙 — 뽀모도로 타이머 숫자는 `font-dungeon`(크롬 숫자), 원형 타임테이블/미니캘린더의 하드코딩 hex 색은 토큰(`var(--accent)` 등)으로 교체, 시간 표기는 `chip-retro`
- [ ] **Step 2: 검증** — 루틴/샵 두 테마 스크린샷, 타임테이블 SVG 색이 다크에서도 대비 확보되는지 확인
- [ ] **Step 3: Commit** — `Feat: 루틴·샵·타이머 위젯 리디자인`

---

### Task 10: MyPage — 나의 우주정거장

**Files:**
- Modify: `frontend/src/pages/MyPage.jsx`
- Create: `frontend/src/components/PixelStation.jsx` (box-shadow 픽셀아트 정거장, `.pixel-planet`과 같은 기법으로 `--p1/--p2/--p3`+`--line` 색 사용, 약 12×8 그리드)

- [ ] **Step 1:** 프로필 섹션 상단에 `<PixelStation />` 배치(프로필이 도킹된 느낌, 레이아웃 구조는 유지 — 장식 요소 추가만)
- [ ] **Step 2:** 통계 카드 3종 재라벨 (기능 라벨 병기, 스펙 7.5): "수거한 생각 · 완료한 태스크", "궤도 유지 · 연속 완료 n일", "자원 · 보유 코인". 카드 `card-retro`, 숫자 `font-dungeon text-2xl`, `bg-primary/bg-yellow-300` 하드코딩 → 토큰
- [ ] **Step 3:** 28주 잔디 → **별빛 로그**: 셀 색을 완료량에 따라 `--line`(0) → `--accent2` 25/50/75/100% 농도 4단계로(라이트), 다크에서는 같은 규칙이 별 광도처럼 보임. 섹션 제목 `label-retro` "별빛 로그 · 최근 28주"
- [ ] **Step 4:** 최근 완료 목록 제목 → "최근 수거 기록". **회원 탈퇴 섹션은 테마 카피 금지** — `heading-kitschy` → 조용한 `font-sans font-bold`, 경고 색은 시맨틱 red 유지
- [ ] **Step 5: 검증** — 두 테마 × 두 뷰포트 스크린샷, 라벨이 여전히 기능을 설명하는지(테마 카피 단독 사용 없는지) 확인
- [ ] **Step 6: Commit** — `Feat: 마이페이지 우주정거장 테마`

---

### Task 11: Notice / Home(랜딩) / Admin / Privacy / Terms + MarkdownRenderer

**Files:**
- Modify: `frontend/src/pages/NoticePage.jsx`, `HomePage.jsx`, `AdminPage.jsx`, `PrivacyPage.jsx`, `TermsPage.jsx`, `frontend/src/components/MarkdownRenderer.jsx`, `frontend/src/components/PrivacyPolicyContent.jsx`

- [ ] **Step 1:** Task 8 매핑 패스 적용. HomePage(랜딩)는 히어로 헤드라인만 `font-dungeon`으로 크게(데스크탑 32px/모바일 24px), CTA는 `btn-retro-primary`. Admin은 기능 우선 — `card-retro`+토큰 교체만, 장식 없음. Privacy/Terms/Markdown 본문은 전부 `font-sans`, 링크 `text-primary`
- [ ] **Step 2: 검증** — 로그아웃 상태로 Home 확인(두 테마), 나머지 페이지 스크린샷
- [ ] **Step 3: Commit** — `Feat: 랜딩·공지·관리자·약관 페이지 리디자인`

---

### Task 12: 보상 모션 4종

**Files:**
- Create: `frontend/src/components/PixelBurst.jsx`, `frontend/src/components/RocketLaunch.jsx`
- Modify: `frontend/src/pages/DashboardPage.jsx`(완료 핸들러·전체완료 감지), `frontend/src/components/layout/Header.jsx`(코인 바운스+카운트업), `frontend/src/components/PomodoroTimer.jsx`(종료 점멸), `frontend/src/index.css`

**Interfaces:**
- Produces: `<PixelBurst x={px} y={px} onDone={fn} />`(뷰포트 좌표에 파티클 8개, 300ms 후 onDone), `<RocketLaunch show={bool} onDone={fn} />`(1.5초 원샷 오버레이)

- [ ] **Step 1: PixelBurst** — 고정 8방향(45° 간격) 4px 사각형이 12→24px 바깥으로 흩어지며 페이드아웃(300ms). 완료 체크 클릭 좌표에서 렌더, 동시 최대 3개(초과 시 무시)로 연타 중첩 제한

```jsx
const DIRS = [[1,0],[.7,.7],[0,1],[-.7,.7],[-1,0],[-.7,-.7],[0,-1],[.7,-.7]]
export default function PixelBurst({ x, y, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 320); return () => clearTimeout(t) }, [onDone])
  return createPortal(
    <div aria-hidden="true" style={{ position:'fixed', left:x, top:y, zIndex:60, pointerEvents:'none' }}>
      {DIRS.map(([dx,dy],i) => (
        <span key={i} className="pixel-spark"
          style={{ '--dx': `${dx*22}px`, '--dy': `${dy*22}px` }} />
      ))}
    </div>, document.body)
}
```

```css
.pixel-spark {
  position: absolute; width: 4px; height: 4px; background: var(--accent2);
  animation: spark .3s ease-out forwards;
}
.pixel-spark:nth-child(odd) { background: var(--accent); }
@keyframes spark {
  from { transform: translate(0,0); opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .pixel-spark { animation: none; opacity: 0; } }
```

- [ ] **Step 2: RocketLaunch** — 전체 화면 고정 오버레이(pointer-events:none), box-shadow 픽셀 로켓(9×15 그리드: 노즈 `--accent`, 몸체 `--card`+`--line`, 화염 `--accent2`)이 `bottom:-10vh→top:-20vh`로 1.4s ease-in 상승, 자취에 별 픽셀 3개 잔상. `show` 전환 시 1회 재생 후 `onDone`. Dashboard에서 `done===total && total>0`이 **거짓→참으로 바뀌는 순간**에만 트리거 + `sessionStorage['rocket-' + 오늘날짜]`로 하루 1회 가드. 히어로는 "오늘 다 비웠어요 🚀" 상태 문구로 전환(기존 빈 상태 로직 위치 재사용)
- [ ] **Step 3: 코인 바운스+카운트업** — Header 코인 값 변경 감지(useRef prev), 증가 시 배지에 `.coin-bounce`(0.4s) 클래스 토글 + 300ms 카운트업(rAF)

```css
.coin-bounce { animation: coin-pop .4s cubic-bezier(.3,1.6,.5,1); }
@keyframes coin-pop { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }
```

- [ ] **Step 4: 뽀모도로 점멸** — 세션 종료 시 타이머 숫자에 `.px-blink`(opacity steps(2) 0.5s × 3회) 적용

```css
.px-blink { animation: blink .5s steps(2, jump-none) 3; }
@keyframes blink { 50% { opacity: .2; } }
```

- [ ] **Step 5: 검증** — 할 일 완료 클릭 → 버스트, 마지막 할 일 완료 → 로켓(새로고침 후 재발생 안 함), 코인 증가 → 바운스, 뽀모도로 종료 → 점멸. reduced-motion 켜고 전부 정지 확인
- [ ] **Step 6: Commit** — `Feat: 보상 모션 (픽셀 버스트·로켓 발사·코인 바운스·뽀모도로 점멸)`

---

### Task 13: 정리 + 전수 QA

**Files:**
- Modify: 전 파일 (개명 패스), `frontend/tailwind.config.js`, `frontend/src/index.css`, `.gitignore`

- [ ] **Step 1:** 전 파일에서 `btn-kitschy→btn-retro(-primary)`, `card-kitschy→card-retro`, `heading-kitschy→label-retro 또는 font-dungeon`, `shadow-kitschy*→shadow-retro(-lg)`, `font-display→font-dungeon` 일괄 개명 후 별칭 정의 제거 (grep으로 `kitschy|font-display|Press Start|RoundedFixedsys|Mona12` 0건 확인)
- [ ] **Step 2:** 잔여 하드코딩 스캔: `grep -E '#[0-9A-Fa-f]{3,6}' frontend/src` — 토큰 밖 색상은 토큰으로 교체(차트/타임테이블 등 정당한 예외는 주석으로 사유 명시). `text-dark/`, `bg-white`, `yellow-300` 0건 확인
- [ ] **Step 3:** `.gitignore`에 `.playwright-mcp/` 추가
- [ ] **Step 4: 전수 QA** — 전 라우트 × 두 테마 × (1280px, 360px) 스크린샷 매트릭스. 체크: 가로 스크롤 없음, 픽셀 폰트가 콘텐츠에 없음, 대비, 터치 타겟, 완료/보상 외 상시 모션 없음
- [ ] **Step 5:** `npm run build` 성공 확인
- [ ] **Step 6: Commit** — `Chore: kitschy 클래스 제거 및 리디자인 QA 마감`

---

### Task 14: 데스크탑 뽀모도로 위젯 (desktop 브랜치)

**Files:**
- Modify: `desktop/electron/pomodoro-widget.html` (**`desktop` 브랜치에만 존재** — `git checkout -b desktop-redesign origin/desktop`에서 작업)

- [ ] **Step 1:** 위젯 HTML의 `<style>`에 Task 1 토큰 블록(라이트/다크)과 버튼/카드 문법을 인라인 이식. 타이머 숫자는 DungGeunMo(프로젝트 폰트를 base64 서브셋으로 임베드 — 숫자·기호만이라 ~5KB). 테마는 `prefers-color-scheme` 미디어쿼리로 자동
- [ ] **Step 2: 검증** — `cd desktop; npm start`로 위젯 띄워 두 OS 테마에서 확인 (Electron 실행이 어려우면 widget html을 브라우저에서 열어 확인)
- [ ] **Step 3: Commit** (desktop-redesign 브랜치) — `Feat: 뽀모도로 위젯 리디자인 토큰 이식`
- [ ] **Step 4:** 사용자에게 desktop 브랜치 머지 여부 확인 (배포 채널이 별도이므로)

---

## Self-Review 결과

- **스펙 커버리지**: 토큰(T1)·타이포(T2)·문법(T3)·테마 토글(T4)·크롬/별(T5)·모달(T6)·시그니처 궤도(T7)·스태거(T8)·페이지 전체(T7–T11)·우주정거장(T10)·보상 모션 5종(T8 스태거 + T12 4종)·반응형/플랫폼(전 태스크 검증 + T13 QA)·데스크탑 위젯(T14)·성공 기준(T13) — 전 항목 태스크 존재
- **플레이스홀더**: 코드 필요 스텝에 코드 포함, "적절히" 류 표현 없음
- **명칭 일관성**: `btn-retro(-primary)`/`card-retro(-hero)`/`label-retro`/`chip-retro`/`check-retro`/`divider-retro`/`stagger-in`/`OrbitProgress(done,total,size)`/`PixelBurst(x,y,onDone)`/`RocketLaunch(show,onDone)` — 태스크 간 동일
