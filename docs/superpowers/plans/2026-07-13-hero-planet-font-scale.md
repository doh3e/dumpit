# 히어로 행성 유동 크기 + 글자 크기 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 히어로 행성을 뷰포트 비례(64~120px)로 키우고, 설정 모달에 4단계 글자 크기 옵션(루트 font-size 스케일링)을 추가한다.

**Architecture:** ① `text-[Npx]` 고정 글자 127곳을 rem으로 기계 치환해 루트 스케일링 기반을 만든다. ② OrbitProgress를 CSS 변수(`--orbit-size` clamp) + SVG viewBox 비례로 전환한다. ③ `utils/fontScale.js` + `index.html` 부트 스크립트(테마와 동일 패턴)로 첫 페인트 전 적용, 설정 모달에서 즉시 적용 버튼 4개.

**Tech Stack:** React 19 + Vite 6 + Tailwind 3.4 (테스트 러너 없음 — lint/build/grep/브라우저 스모크로 검증)

**스펙:** `docs/superpowers/specs/2026-07-13-hero-planet-font-scale-design.md`

## Global Constraints

- 작업 브랜치: `feature/hero-planet-font-scale` (이미 dev에서 분기됨)
- 모든 명령은 `C:\coding\dumpit\frontend`에서 실행 (Bash 경로: `/c/coding/dumpit/frontend`)
- 글자 크기 단계: `sm` 작게 90% / `base` 기본 100%(저장 안 함) / `lg` 크게 112.5% / `xl` 아주 크게 125%
- localStorage 키: `dumpit-font-scale` (테마 키 `dumpit-theme` 네이밍 컨벤션)
- **px 유지(변환 금지)**: 테두리 1.5px, 레트로 그림자 3px/5px, `min-height: 44px`, 위성 점 5px
- 커밋 메시지는 저장소 컨벤션(`Feat:`/`Refactor:` + 한국어) + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `docs/superpowers/audits/2026-07-13-api-audit-report.md`는 사용자가 수정 중 — 스테이징 금지 (`git add` 항상 파일 명시)

---

### Task 1: px 고정 글자 → rem 일괄 마이그레이션

**Files:**
- Modify: `frontend/src/**/*.jsx`, `frontend/src/index.css` — `text-[Npx]` 127곳 (26개 파일)

**Interfaces:**
- Consumes: 없음
- Produces: rem 기반 글자 크기 체계 (Task 3 루트 스케일링의 전제)

변환표 (16px 기준, 순수 기계 치환 — 이 여섯 값이 전부):

| 원본 | 변환 |
|---|---|
| `text-[9px]` | `text-[0.5625rem]` |
| `text-[10px]` | `text-[0.625rem]` |
| `text-[11px]` | `text-[0.6875rem]` |
| `text-[19px]` | `text-[1.1875rem]` |
| `text-[24px]` | `text-[1.5rem]` |
| `text-[32px]` | `text-[2rem]` |

- [ ] **Step 1: 치환 전 개수 확인**

Bash 도구로 실행:
```bash
cd /c/coding/dumpit/frontend/src && grep -roE 'text-\[[0-9]+px\]' . | wc -l
```
Expected: `127`

- [ ] **Step 2: sed 일괄 치환** (sed는 바이트 단위 치환이라 인코딩·개행 보존)

```bash
cd /c/coding/dumpit/frontend/src
grep -rlE 'text-\[(9|10|11|19|24|32)px\]' . | while read -r f; do
  sed -i -e 's/text-\[9px\]/text-[0.5625rem]/g' \
         -e 's/text-\[10px\]/text-[0.625rem]/g' \
         -e 's/text-\[11px\]/text-[0.6875rem]/g' \
         -e 's/text-\[19px\]/text-[1.1875rem]/g' \
         -e 's/text-\[24px\]/text-[1.5rem]/g' \
         -e 's/text-\[32px\]/text-[2rem]/g' "$f"
done
```

- [ ] **Step 3: 잔존 0건 + 변환 결과 검증**

```bash
cd /c/coding/dumpit/frontend/src
grep -rE 'text-\[[0-9]+px\]' . ; grep -roE 'text-\[[0-9.]+rem\]' . | wc -l
```
Expected: 첫 grep 출력 없음(잔존 0건), 둘째 `127`

- [ ] **Step 4: lint + build**

PowerShell, `C:\coding\dumpit\frontend`에서: `npm run lint; if ($?) { npm run build }`
Expected: 둘 다 성공 (경고 0 신규)

- [ ] **Step 5: git diff 샘플 확인** — `git diff --stat`으로 26개 파일만 변경됐는지, 한 파일 diff에서 클래스 외 변경이 없는지 눈으로 확인

- [ ] **Step 6: Commit**

```powershell
git add frontend/src
git commit -m @'
Refactor: 고정 px 글자 크기 127곳 rem 전환

루트 font-size 스케일링(글자 크기 설정) 선행 작업. 9/10/11/19/24/32px →
동치 rem. 테두리·그림자·터치 타깃 px는 의도적으로 유지.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: OrbitProgress 유동 크기 전환

**Files:**
- Modify: `frontend/src/components/OrbitProgress.jsx` (전체 교체)

**Interfaces:**
- Consumes: 없음 (사용처는 NowHeroCard 한 곳, props `done`/`total`만 유지 — `size` prop 제거)
- Produces: 뷰포트 비례 OrbitProgress. NowHeroCard 쪽 수정 불필요 (`<OrbitProgress done={} total={} />` 그대로)

- [ ] **Step 1: OrbitProgress.jsx 전체 교체**

```jsx
// 픽셀 행성 궤도 진행률 링 — 오늘 완료 비율만큼 궤도가 액센트 호로 채워진다
// 크기는 --orbit-size(clamp)로 뷰포트 비례: 모바일 64px ~ 데스크톱 120px.
// 엔드포인트가 rem이라 글자 크기 설정(루트 font-size)과도 연동된다.
import { useAuth } from '../context/AuthContext'
import { PLANET_SPRITES, spriteFor } from '../shop/registry'

const VB = 64                 // viewBox 좌표계 — 기존 고정 64px 시절 수치를 그대로 유지
const R = VB / 2 - 3
const C = 2 * Math.PI * R

export default function OrbitProgress({ done, total }) {
  const { user } = useAuth()
  const frac = total > 0 ? Math.min(done / total, 1) : 0
  return (
    <div
      className="flex-none text-center"
      style={{ '--orbit-size': 'clamp(4rem, 8vw + 1rem, 7.5rem)', width: 'calc(var(--orbit-size) + 8px)' }}
    >
      <div className="relative mx-auto" style={{ width: 'var(--orbit-size)', height: 'var(--orbit-size)' }}>
        <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" className="-rotate-90">
          <circle
            cx={VB / 2} cy={VB / 2} r={R} fill="none"
            stroke="var(--line)" strokeWidth="1.5" strokeDasharray="2 4"
          />
          <circle
            cx={VB / 2} cy={VB / 2} r={R} fill="none"
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
          />
        </svg>
        <img
          src={spriteFor(PLANET_SPRITES, user?.equipments?.PLANET).img}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            imageRendering: 'pixelated',
            width: 'calc(var(--orbit-size) * 0.34375)',
            height: 'calc(var(--orbit-size) * 0.34375)',
          }}
        />
        <div className="orbit-sat" aria-hidden="true" style={{ '--orbit-r': 'calc(var(--orbit-size) * 0.453)' }} />
      </div>
      <p className="text-xs text-sub mt-1.5 whitespace-nowrap">
        오늘 <span className="font-dungeon text-secondary text-sm">{done}/{total}</span>
      </p>
    </div>
  )
}
```

주의: `.orbit-sat` CSS(`index.css`)는 수정 불필요 — keyframes가 `var(--orbit-r, 29px)`를
읽는데 이제 인라인 calc 값이 항상 공급된다. 카운트 텍스트는 기존
`text-[0.6875rem]`(11px)/`text-xs` → `text-xs`(12px)/`text-sm`(14px)로 한 단계 승급
(스펙 §2 카운트 텍스트).

- [ ] **Step 2: lint + build**

PowerShell, `C:\coding\dumpit\frontend`에서: `npm run lint; if ($?) { npm run build }`
Expected: 성공

- [ ] **Step 3: 브라우저 확인** — dev 서버(`npm run dev`) + 브라우저에서 대시보드 열기.
  - 뷰포트 1440px: 궤도 링 ≈ 120px (기존 64px 대비 뚜렷하게 큼), 행성 ≈ 41px
  - 뷰포트 375px: 궤도 링 = 64px (기존과 동일)
  - 위성 점이 궤도 위를 돎 (링 반지름과 일치, 어긋나면 0.453 계수 확인)
  - "오늘 N/N" 카운트가 이전보다 커짐

Expected: 위 4개 항목 모두 통과

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/components/OrbitProgress.jsx
git commit -m @'
Feat: 히어로 행성 궤도 유동 크기 (clamp 64~120px)

고정 64px SVG를 --orbit-size CSS 변수 + viewBox 비례로 전환. 데스크톱에서
행성·카운트가 커지고 모바일은 기존 크기 유지. rem 엔드포인트라 글자 크기
설정과 연동. size prop 제거(사용처 NowHeroCard 한 곳).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: fontScale 유틸 + 부트 스크립트

**Files:**
- Create: `frontend/src/utils/fontScale.js`
- Modify: `frontend/index.html` (테마 인라인 스크립트 IIFE)

**Interfaces:**
- Consumes: 없음
- Produces: `FONT_SCALES` (`{ sm|base|lg|xl: { label, size } }`), `getFontScalePref(): string`, `applyFontScale(pref: string): void` — Task 4가 import

- [ ] **Step 1: `frontend/src/utils/fontScale.js` 생성**

```js
const KEY = 'dumpit-font-scale'

// 값 변경 시 index.html 부트 스크립트의 scales 맵과 반드시 동기화
export const FONT_SCALES = {
  sm:   { label: '작게', size: '90%' },
  base: { label: '기본', size: '100%' },
  lg:   { label: '크게', size: '112.5%' },
  xl:   { label: '아주 크게', size: '125%' },
}

export function getFontScalePref() {
  const v = localStorage.getItem(KEY)
  return v !== null && v !== 'base' && FONT_SCALES[v] ? v : 'base'
}

export function applyFontScale(pref) {
  if (pref === 'base') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
  document.documentElement.style.fontSize = pref === 'base' ? '' : FONT_SCALES[pref].size
}
```

- [ ] **Step 2: `frontend/index.html` 부트 스크립트 확장** — 기존 IIFE(5~11행 부근)를 다음으로 교체:

```html
    <script>
      (function () {
        var p = localStorage.getItem('dumpit-theme');
        var t = (p === 'light' || p === 'dark') ? p
          : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.dataset.theme = t;
        // 글자 크기 부트 적용 — utils/fontScale.js의 FONT_SCALES와 값 동기화 유지
        var f = localStorage.getItem('dumpit-font-scale');
        var scales = { sm: '90%', lg: '112.5%', xl: '125%' };
        if (scales[f]) document.documentElement.style.fontSize = scales[f];
      })();
    </script>
```

- [ ] **Step 3: 동작 검증** — dev 서버 + 브라우저 콘솔에서:

```js
localStorage.setItem('dumpit-font-scale', 'xl'); location.reload()
```
Expected: 새로고침 직후(깜빡임 없이) 전체 UI가 125%로 커져 있음.
`document.documentElement.style.fontSize` === `'125%'`.
확인 후 `localStorage.removeItem('dumpit-font-scale'); location.reload()` 로 원복.

- [ ] **Step 4: lint + Commit**

```powershell
npm run lint
git add frontend/src/utils/fontScale.js frontend/index.html
git commit -m @'
Feat: 글자 크기 스케일 유틸 + 부트 적용

utils/theme.js 패턴의 fontScale.js(4단계: 90/100/112.5/125%)와 index.html
인라인 부트 스크립트. 첫 페인트 전 적용으로 레이아웃 점프 없음.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: 설정 모달 글자 크기 섹션

**Files:**
- Modify: `frontend/src/components/SettingsModal.jsx`

**Interfaces:**
- Consumes: Task 3의 `FONT_SCALES`, `getFontScalePref`, `applyFontScale`
- Produces: 설정 모달 "글자 크기" 섹션 (테마 섹션 바로 아래)

- [ ] **Step 1: import + 상태 추가**

기존 `import { applyTheme, getThemePref } from '../utils/theme'` 아래에:

```js
import { applyFontScale, getFontScalePref, FONT_SCALES } from '../utils/fontScale'
```

기존 `const [themePref, setThemePref] = useState(getThemePref)` 아래에:

```js
const [fontScale, setFontScale] = useState(getFontScalePref)
```

- [ ] **Step 2: 섹션 JSX 추가** — 테마 섹션(`</section>`) 뒤, 기존 `<hr className="border-line mb-6" />`와 "일과 시간" 섹션 사이에:

```jsx
        <hr className="border-line mb-6" />

        <section className="mb-6">
          <h3 className="font-galmuri font-bold text-dark text-sm mb-3">글자 크기</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(FONT_SCALES).map(([value, { label }]) => (
              <button
                key={value}
                type="button"
                onClick={() => { applyFontScale(value); setFontScale(value) }}
                className={`text-xs ${fontScale === value ? 'btn-retro-primary' : 'btn-retro'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
```

(클릭 즉시 적용·영속화 — 테마 버튼과 동일하게 저장 버튼과 무관. 모바일 2×2,
데스크톱 1×4 그리드로 125%에서도 버튼이 안 넘침.)

- [ ] **Step 3: 브라우저 검증** — dev 서버에서 설정 모달 열기:
  - 4버튼 표시, 현재 단계가 primary로 강조
  - "크게" 클릭 → 모달 포함 전체 UI 즉시 112.5% 확대, 새로고침 후 유지
  - "기본" 클릭 → 원복 + localStorage에 `dumpit-font-scale` 키 없음
  - 좁은 뷰포트(375px)에서 버튼 2×2 배치

Expected: 4개 항목 모두 통과

- [ ] **Step 4: lint + build + Commit**

```powershell
npm run lint; if ($?) { npm run build }
git add frontend/src/components/SettingsModal.jsx
git commit -m @'
Feat: 설정 모달 글자 크기 4단계 옵션

작게 90% / 기본 100% / 크게 112.5% / 아주 크게 125%. 클릭 즉시 적용,
localStorage(dumpit-font-scale) 영속. 테마 섹션과 동일한 버튼 패턴.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: 통합 스모크 검증

**Files:** 없음 (검증 전용 — 수정 발견 시 해당 파일 고치고 개별 커밋)

- [ ] **Step 1: 정적 검증 일괄**

```bash
cd /c/coding/dumpit/frontend/src && grep -rE 'text-\[[0-9]+px\]' . | wc -l
```
Expected: `0`

PowerShell: `npm run lint; if ($?) { npm run build }` → 성공

- [ ] **Step 2: 4단계 × 라이트/다크 스모크** — dev 서버에서 확인 매트릭스:

| 화면 | 확인 항목 |
|---|---|
| 대시보드 | 히어로 카드 줄바꿈·행성 크기, "다음에 할 일" 칩 잘림 없음 |
| 설정 모달 | 4버튼 강조 상태, 토글·체크박스 정렬 |
| 태스크 추가 모달 | 마감 모드 칩 4개 줄바꿈 자연스러움, 버튼 잘림 없음 |

- 각 화면을 `아주 크게(125%)` + 라이트/다크 두 테마로 확인 (125%가 최악 케이스,
  나머지 단계는 대시보드만 훑기)
- 확인 방법: 설정 모달에서 단계 변경, 테마 버튼으로 다크 전환

Expected: 텍스트 잘림·겹침·가로 스크롤 없음 (px 고정 폭 안의 truncate 말줄임은 정상)

- [ ] **Step 3: 행성 반응형 최종 확인** — 뷰포트 375px(64px 유지) / 1440px(120px 도달),
  125% 단계에서 상한이 150px까지 커지는지, 위성 궤도 정렬

- [ ] **Step 4: 발견 이슈 수정·커밋 후 종료** — 이슈 없으면 커밋 없음. 완료 보고에
  스모크 결과 요약 포함.
