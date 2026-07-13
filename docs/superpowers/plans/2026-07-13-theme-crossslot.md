# 테마 크로스슬롯 세트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컨셉 4종(새싹 정원·은하수·원목 서재·캔디)의 3슬롯 풀세트 완성(신규 8종, 37→45) + 배경 패턴 미표시 버그픽스 + 컨셉 크롬 도트 엣지 장식.

**Architecture:** CSS 슬롯 스킨 확장(팔레트는 스펙에 hex 확정)이 골자. 패턴은 `.bg-skin` 유틸로 Layout 래퍼에서 소비하게 고치고, 크롬 장식은 `app-sidebar`/`app-header` 클래스 훅 + 스킨 스코프 `::after` 스트립. 아트는 Pillow `gen_patterns.py`로 타일 12장 제작(검수 게이트). 스펙: `docs/superpowers/specs/2026-07-13-theme-crossslot-design.md`.

**Tech Stack:** Python 3.14 + Pillow 12.3, React 19 + Vite + Tailwind, Spring Boot(Gradle JDK21).

## Global Constraints

- 팔레트·코드·가격·설명 문구는 스펙 표기 그대로 (bg 600 / chrome·pomo 400, 전부 CONCEPT).
- 패턴·장식은 **저대비** — 본문 가독성 방해 금지. 실톤 합성 미리보기 검수 통과 후에만 커밋.
- 기존 패턴 타일 크기: sprout 96×96, galaxy 128×128 — 신규도 96~128 정사각. 크롬 엣지 타일은 24×24 정사각(가로/세로 겸용).
- 백엔드 테스트: `cd backend` 후 `$env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; ./gradlew test`.
- 프론트 검증: `npm run lint`(에러 0), `npm run build`.
- 커밋 메시지: `Feat:`/`Fix:` 한국어 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 푸터. 피처 브랜치 `feat/theme-crossslot`에서 작업.
- 미리보기 등 중간 산출물은 scratchpad에.

---

### Task 1: 패턴 미표시 버그픽스 (선행·독립 커밋)

**Files:**
- Modify: `frontend/src/index.css` (`.bg-skin` 유틸 — `@layer components` 안 `.btn-retro` 위쪽에 추가)
- Modify: `frontend/src/components/layout/Layout.jsx:94`

**Interfaces:**
- Produces: `.bg-skin` 클래스 — Task 4의 신규 배경 패턴도 이 경로로 노출됨.

- [ ] **Step 1: index.css에 유틸 추가**

```css
  /* 배경 스킨 — 색 + 패턴(--bg-pattern). body만 칠하면 Layout 래퍼가 덮어 패턴이 안 보인다 */
  .bg-skin {
    background-color: var(--bg);
    background-image: var(--bg-pattern, none);
  }
```

- [ ] **Step 2: Layout.jsx 래퍼 교체** — L94 `className="flex flex-col min-h-screen bg-accent"` → `className="flex flex-col min-h-screen bg-skin"`.

- [ ] **Step 3: lint/build + 스모크** — dev 서버에서 새싹 정원 배경 장착 시 잎 패턴이 실제로 보이는지, 기본 테마는 변화 없는지. 처음 노출되는 sprout/galaxy 패턴 톤이 과하면 사용자에게 리터치 여부 확인.

- [ ] **Step 4: Commit**

```
git add frontend/src/index.css frontend/src/components/layout/Layout.jsx
git commit -m "Fix: 배경 스킨 패턴이 Layout 래퍼에 가려 미표시되던 버그"
```

---

### Task 2: 아트 — 배경 패턴 4장 + 크롬 엣지 타일 8장 (검수 게이트)

**Files:**
- Create: `frontend/scripts/sprites/gen_patterns.py`
- Create: `frontend/src/assets/shop/pattern_wood_{light,dark}.png` (96×96), `pattern_candy_{light,dark}.png` (96×96)
- Create: `frontend/src/assets/shop/deco_{sprout,galaxy,wood,candy}_{light,dark}.png` (24×24)

**Interfaces:**
- Consumes: `gen_planets.py`의 헬퍼(`hx`, `put`, `block`, `polyline`) — import 재사용.
- Produces: PNG 12장. 파일명은 위 Create 목록 그대로 — Task 3의 CSS가 참조.

- [ ] **Step 1: gen_patterns.py 작성** — 구조는 gen_planets.py 준용(`PATTERNS` dict + `--preview`). 합성 미리보기: 각 타일을 해당 스킨의 실제 `--bg`/`--chrome-bg` 색 배경(라이트/다크) 위에 타일링해 2배 확대로 렌더. 도트 모티프:
  - `pattern_wood`: 세로 결 1px 라인(±1px 지터) + 옹이 타원 2~3개 — 배경색 대비 ±8% 명도
  - `pattern_candy`: 막대 스프링클(2×5px, 회전 대신 가로/세로/대각 3방향) + 도트, 분홍·민트·크림 — 저밀도(타일당 8~10개)
  - `deco_sprout`: 덩굴 줄기(타일 상하로 이어지는 S곡선 2px) + 잎 3~4장 — 세로 반복 시 연속되게 상하 경계 y=0/24 접점 x 일치
  - `deco_galaxy`: 별 2개(십자 반짝이) + 점 별 3개, 경계 접점 없음(산포형)
  - `deco_wood`: 세로 나뭇결 몰딩(이중 라인 + 마디), 상하 연속
  - `deco_candy`: 스프링클 줄(대각 막대 3개 + 도트), 산포형
  - 겸용 규칙: 세로 연속형(sprout·wood)은 좌우 경계도 접점 일치시켜 가로 반복에도 어색하지 않게.
- [ ] **Step 2: 미리보기 생성·자체 검토** — `python gen_patterns.py --preview "<scratchpad>/patterns_preview.png"` 후 Read로 확인(저대비·연속성·컨셉 전달).
- [ ] **Step 3: 사용자 검수 (하드 게이트)** — 합성 미리보기 제시, 피드백 반영 반복. **컨펌 전 커밋 금지.** 기존 sprout/galaxy 배경 패턴 톤 의견도 이때 수렴(리터치 시 이 태스크에서 함께).
- [ ] **Step 4: PNG 생성 + 크기 검증** — 96×96 ×4, 24×24 ×8 확인(PowerShell System.Drawing).
- [ ] **Step 5: Commit**

```
git add frontend/scripts/sprites/gen_patterns.py frontend/src/assets/shop/pattern_wood_light.png frontend/src/assets/shop/pattern_wood_dark.png frontend/src/assets/shop/pattern_candy_light.png frontend/src/assets/shop/pattern_candy_dark.png frontend/src/assets/shop/deco_sprout_light.png frontend/src/assets/shop/deco_sprout_dark.png frontend/src/assets/shop/deco_galaxy_light.png frontend/src/assets/shop/deco_galaxy_dark.png frontend/src/assets/shop/deco_wood_light.png frontend/src/assets/shop/deco_wood_dark.png frontend/src/assets/shop/deco_candy_light.png frontend/src/assets/shop/deco_candy_dark.png
git commit -m "Feat: 테마 패턴·크롬 장식 도트 타일 12장 (자체 제작)"
```

---

### Task 3: CSS — 스킨 8종 + 크롬 장식 부착

**Files:**
- Modify: `frontend/src/index.css` (bg 스킨 2종·크롬 3종·뽀모 3종 — 스펙의 CSS 블록 그대로, 각 섹션 기존 블록 뒤에 추가)
- Modify: `frontend/src/components/layout/Sidebar.jsx:126,135` (`app-sidebar` 클래스 추가 — 데스크톱 aside·모바일 드로어 둘 다), `frontend/src/components/layout/Header.jsx:83` (`app-header` 추가)

**Interfaces:**
- Consumes: Task 2 PNG 12장 (CSS url), 스펙 팔레트.
- Produces: `data-skin-*="wood|candy|sprout|galaxy"` CSS — Task 4 카탈로그 코드와 표기 일치(applySkins가 코드 접미사를 dataset에 넣는 기존 구조 그대로 동작).

- [ ] **Step 1: 스킨 팔레트 블록 추가** — 스펙 "팔레트 설계" 섹션의 CSS 3덩이를 각 스킨 섹션 말미에 삽입 (bg 2종은 `--bg-pattern` 포함).
- [ ] **Step 2: 크롬 장식 CSS** — 크롬 스킨 섹션 뒤에:

```css
/* 컨셉 크롬 도트 엣지 장식 — 사이드바 안쪽 세로 + 상단바 하단 가로 (COLOR 크롬은 없음) */
.app-sidebar, .app-header { position: relative; }
.app-sidebar::after, .app-header::after {
  content: none; position: absolute; pointer-events: none;
  image-rendering: pixelated; background-repeat: repeat;
}
.app-sidebar::after { top: 0; bottom: 0; right: 0; width: 24px; background-size: 24px 24px; }
.app-header::after { left: 0; right: 0; bottom: 0; height: 24px; background-size: 24px 24px; }
[data-skin-chrome="sprout"] .app-sidebar::after, [data-skin-chrome="sprout"] .app-header::after {
  content: ""; background-image: url('./assets/shop/deco_sprout_light.png');
}
[data-skin-chrome="sprout"][data-theme="dark"] .app-sidebar::after, [data-skin-chrome="sprout"][data-theme="dark"] .app-header::after {
  background-image: url('./assets/shop/deco_sprout_dark.png');
}
/* galaxy·wood·candy 동일 패턴으로 3벌 반복 (url만 교체) */
```

주의: `[data-theme="dark"]`는 `<html>`에 붙으므로 셀렉터는 `[data-skin-chrome="X"][data-theme="dark"]` 복합(동일 요소) — 기존 스킨 블록과 같은 방식.

- [ ] **Step 3: JSX 클래스 훅** — Sidebar 데스크톱 aside(L126)와 모바일 드로어(L135)에 `app-sidebar`, Header(L83)에 `app-header` 클래스 추가.
- [ ] **Step 4: lint/build + 스모크** — 크롬 장식은 콘솔에서 `document.documentElement.dataset.skinChrome='sprout'`로 즉석 확인 가능(구매 전). 장식이 메뉴 텍스트를 방해하면 스트립 폭/타일 수정.
- [ ] **Step 5: Commit**

```
git add frontend/src/index.css frontend/src/components/layout/Sidebar.jsx frontend/src/components/layout/Header.jsx
git commit -m "Feat: 크로스슬롯 스킨 CSS 8종 + 컨셉 크롬 엣지 장식"
```

---

### Task 4: 백엔드 카탈로그 8종 (TDD) + 상점 스와치

**Files:**
- Modify: `backend/src/main/java/com/dumpit/shop/ShopCatalog.java`
- Test: `backend/src/test/java/com/dumpit/shop/ShopCatalogTest.java`, `backend/src/test/java/com/dumpit/api/ShopApiTest.java`
- Modify: `frontend/src/pages/ShopPage.jsx:16-30` (SKIN_PREVIEWS)

**Interfaces:**
- Consumes: Task 3의 dataset 값 (코드 접미사 = CSS 셀렉터 값).
- Produces: 카탈로그 코드 8종 — `bg.wood, bg.candy, chrome.sprout, chrome.galaxy, chrome.candy, pomo.sprout, pomo.galaxy, pomo.wood`.

- [ ] **Step 1: 테스트 37→45 갱신** — `카탈로그는_37개_아이템을_가진다`→45(이름·단언), `코드는_전부_유일하다` hasSize 45, ShopApiTest 메서드명 `카탈로그_37종`→`45종` + `hasSize(37)`→45 + `.value(37)`→45.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests "com.dumpit.shop.ShopCatalogTest" --tests "com.dumpit.api.ShopApiTest"` → FAIL(45 vs 37).
- [ ] **Step 3: ShopCatalog.java 추가** — 각 슬롯 그룹 말미에 (스펙 표의 이름·설명·가격 그대로):

```java
ShopItem.theme("bg.wood",       BACKGROUND, "원목 서재", "따뜻한 원목 서재에서 하루를 정리해요.", 600, CONCEPT),
ShopItem.theme("bg.candy",      BACKGROUND, "캔디",      "달콤한 캔디빛으로 물든 화면이에요.",     600, CONCEPT),
ShopItem.theme("chrome.sprout", CHROME,     "새싹 정원", "메뉴에 초록 새싹이 움터요.",           400, CONCEPT),
ShopItem.theme("chrome.galaxy", CHROME,     "은하수",    "메뉴가 은하수빛으로 물들어요.",         400, CONCEPT),
ShopItem.theme("chrome.candy",  CHROME,     "캔디",      "메뉴가 달콤한 캔디빛이 돼요.",          400, CONCEPT),
ShopItem.theme("pomo.sprout",   POMODORO,   "새싹 타이머",  "초록 새싹빛 집중 링이에요.",         400, CONCEPT),
ShopItem.theme("pomo.galaxy",   POMODORO,   "은하수 타이머", "은하수빛 집중 링이에요.",           400, CONCEPT),
ShopItem.theme("pomo.wood",     POMODORO,   "원목 타이머",  "원목 서재빛 집중 링이에요.",         400, CONCEPT),
```

- [ ] **Step 4: 전체 테스트 통과 확인** — `./gradlew test` PASS.
- [ ] **Step 5: SKIN_PREVIEWS 8종 추가** — 기존 관례(bg=[bg,accent,chip], chrome=[bg,line], pomo=[focus,break]) 라이트 기준:

```js
  'bg.wood': ['#F1E5D2', '#A8763E', '#E7D5B8'],
  'bg.candy': ['#F7E7EE', '#E05C8A', '#F2D7E2'],
  'chrome.sprout': ['#EAF2E3', '#C2DBAA'],
  'chrome.galaxy': ['#E9EAF6', '#C2C5E4'],
  'chrome.candy': ['#F7E7EE', '#E5BCCE'],
  'pomo.sprout': ['#5C8A3C', '#C4708F'],
  'pomo.galaxy': ['#6D74C9', '#C9922E'],
  'pomo.wood': ['#A8763E', '#5C8A6E'],
```

- [ ] **Step 6: lint/build + Commit**

```
git add backend/src/main/java/com/dumpit/shop/ShopCatalog.java backend/src/test/java/com/dumpit/shop/ShopCatalogTest.java backend/src/test/java/com/dumpit/api/ShopApiTest.java frontend/src/pages/ShopPage.jsx
git commit -m "Feat: 크로스슬롯 테마 8종 카탈로그 추가 (37->45) + 상점 스와치"
```

---

### Task 5: ATTRIBUTIONS + 통합 검증

**Files:**
- Modify: `docs/ATTRIBUTIONS.md`

- [ ] **Step 1: ATTRIBUTIONS 갱신** — 표에 1행 추가:

```markdown
| pattern_wood/candy_*.png, deco_*.png (12장) | (자체 제작) | — | — | Pillow 스크립트 제작 (frontend/scripts/sprites/gen_patterns.py) |
```

- [ ] **Step 2: 전체 검증** — 백엔드 `./gradlew test` PASS, 프론트 lint/build PASS.
- [ ] **Step 3: dev 스모크 (사용자)** — 스펙 검증 6항목: 기존 패턴 표시(픽스), 신규 8종 구매→장착, 배경 패턴 라이트/다크, 크롬 장식(COLOR 크롬은 없음), 뽀모 색, 세트 조화.
- [ ] **Step 4: Commit + 메모리 갱신** — `Docs: 패턴·장식 자체 제작 출처 추가`. project_shop_followups의 크로스슬롯 항목 완료 처리.

---

## 배포 메모

- 마이그레이션 없음(CSS+카탈로그 상수). main 배포 스모크에 "기존 새싹 정원·은하수 패턴 표시(버그픽스)" 추가 — 기보유자 화면이 달라지는 유일한 변화.
