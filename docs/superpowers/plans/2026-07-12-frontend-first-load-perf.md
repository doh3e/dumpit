# 프론트엔드 첫 로드 성능 진단·개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실서비스 첫 로드를 실측 진단하고 이미지·폰트·번들·Sentry 4개 병목을 개선한 뒤, 포트폴리오 인용 가능한 before/after 보고서를 남긴다.

**Architecture:** 프론트 전용. 측정(Lighthouse CLI, 실서비스 + 로컬 preview 통제 비교) → 개선 4건 → 재측정 → 보고서. 백엔드 무변경.

**Tech Stack:** Vite/React, Lighthouse CLI(npx), Python(Pillow 이미지 변환, fonttools 폰트 서브셋)

**Spec:** `docs/superpowers/specs/2026-07-12-frontend-first-load-perf-design.md`

## Global Constraints

- 작업 브랜치: `feature/perf-first-load` (**dev에서 분기**, Task 1 Step 1). 완료 후 dev로 머지
- 프론트 검증 게이트: `cd frontend` 후 `npm run build` (lint는 사전 고장으로 제외)
- 측정 조건 고정: Lighthouse `--only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless=new"` — before/after 동일 플래그
- 커밋 메시지: `Feat:/Fix:/Perf:/Docs:` + 한국어 요약 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- YAGNI: 스펙의 4개 개선 외 추가 최적화 금지 (발견 사항은 보고서 '남은 과제'에 기록만)
- 실행 분담: Task 1·3·4·5 = Fable 직접, Task 2 = 위임 가능(sonnet)
- 측정 결과 보관: `docs/performance/lighthouse/` (html·json), 수치는 보고서 표에 전사

## 파일 구조

| 파일 | 책임 |
|---|---|
| `docs/performance/lighthouse/` (신규) | prod-before, local-before, local-after 결과 보관 |
| `docs/performance/2026-07-12-frontend-first-load.md` (신규) | 최종 보고서 |
| `frontend/public/logo.webp`, `text_logo.webp` (신규) | 최적화 이미지 (원본 png 2종 삭제) |
| `frontend/public/fonts/*.subset.woff2` (신규) | 서브셋 폰트 (원본 woff/woff2 삭제) |
| `frontend/index.html` | preload 3건 (이미지 1, 폰트 2) |
| `frontend/src/index.css` | @font-face 서브셋 교체 |
| `frontend/src/App.jsx` | React.lazy 분할 + 자체 ErrorBoundary |
| `frontend/src/main.jsx` | Sentry 지연 로드 |
| `frontend/src/pages/HomePage.jsx`, `components/layout/Sidebar.jsx`, `components/layout/Header.jsx` | 이미지 참조 교체 |

---

### Task 1: 베이스라인 측정 (담당: Fable 직접)

**Files:**
- Create: `docs/performance/lighthouse/` 하위 결과 파일들
- Create: `docs/performance/2026-07-12-frontend-first-load.md` (뼈대 + before 수치)

**Interfaces:**
- Produces: prod-before·local-before의 FCP/LCP/TBT/Speed Index/총 전송량 수치, dist 자산 크기 표 — Task 5의 비교 기준

- [ ] **Step 1: 브랜치 분기**

```bash
git checkout dev
git checkout -b feature/perf-first-load
mkdir -p docs/performance/lighthouse
```

- [ ] **Step 2: 실서비스 before 측정**

```bash
cd frontend
npx --yes lighthouse https://dumpit.kr --only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless=new" --output=json --output=html --output-path=../docs/performance/lighthouse/prod-before
```

Expected: `prod-before.report.html`/`.json` 생성. json에서 `audits['first-contentful-paint'].numericValue`, `largest-contentful-paint`, `total-blocking-time`, `speed-index`, `total-byte-weight` 추출해 기록. 실패 시(Chrome 미검출) `--chrome-flags`에 로컬 Chrome 경로 지정 후 재시도.

- [ ] **Step 3: 로컬 preview before 측정**

```bash
npm run build
npx vite preview --port 4173 &   # 백그라운드
npx --yes lighthouse http://localhost:4173 --only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless=new" --output=json --output=html --output-path=../docs/performance/lighthouse/local-before
# 측정 후 preview 종료
```

- [ ] **Step 4: dist 자산 크기 표 기록**

```bash
ls -la dist/assets | awk '{print $5, $9}' | sort -rn | head -15
ls -la dist/fonts dist/*.png dist/*.webp 2>/dev/null | awk '{print $5, $9}' | sort -rn | head -12
```

결과를 보고서 뼈대(`docs/performance/2026-07-12-frontend-first-load.md`)에 표로 기록. 뼈대 구조: `# 제목 / ## 배경과 증상 / ## 진단 방법 / ## Before 실측 / ## 개선 항목 (빈 섹션 4개) / ## After 실측 / ## 종합 / ## 한계와 남은 과제`.

- [ ] **Step 5: 커밋**

```bash
git add docs/performance
git commit -m "Docs: 첫 로드 성능 베이스라인 실측 (실서비스+로컬 Lighthouse)"
```

---

### Task 2: 이미지 최적화 (담당: sonnet 위임 가능)

**Files:**
- Create: `frontend/public/logo.webp`, `frontend/public/text_logo.webp`
- Delete: `frontend/public/logo.png`, `frontend/public/text_logo.png`
- Modify: `frontend/src/pages/HomePage.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/components/layout/Header.jsx`, `frontend/index.html`

**Interfaces:**
- Consumes: 렌더 크기 — 히어로 `w-72`(288px 폭), 사이드바 `h-36`(144px 높이), 헤더 `h-24`(96px 높이)
- Produces: `/logo.webp`(576px 폭), `/text_logo.webp`(192px 높이) — Task 5가 크기 비교에 사용

- [ ] **Step 1: Pillow 설치 및 변환**

```bash
py -m pip install --user pillow
```

변환 스크립트 (스크래치패드에 저장 후 `py` 실행):

```python
from PIL import Image
from pathlib import Path
pub = Path(r'C:\coding\dumpit\frontend\public')

logo = Image.open(pub / 'logo.png').convert('RGBA')
ratio = 576 / logo.width
logo.resize((576, round(logo.height * ratio)), Image.LANCZOS).save(pub / 'logo.webp', 'WEBP', quality=82)

text = Image.open(pub / 'text_logo.png').convert('RGBA')
ratio = 192 / text.height
text.resize((round(text.width * ratio), 192), Image.LANCZOS).save(pub / 'text_logo.webp', 'WEBP', quality=82)

for name in ('logo.webp', 'text_logo.webp'):
    print(name, (pub / name).stat().st_size, 'bytes')
```

Expected: 두 webp 생성, 합계 100KB 미만 (1.77MB → ~95% 감소)

- [ ] **Step 2: 참조 교체**

- `HomePage.jsx`: `src="/logo.png"` → `src="/logo.webp"`, 해당 `<img>`에 `width={288} height={생성된 비율 높이}` 속성 추가
- `Sidebar.jsx`: `src="/logo.png"` → `src="/logo.webp"`
- `Header.jsx`: `src="/text_logo.png"` → `src="/text_logo.webp"`
- `index.html` `<head>`에 favicon 링크 위에 추가:

```html
    <link rel="preload" as="image" href="/logo.webp" />
```

- [ ] **Step 3: 원본 삭제 및 검증**

```bash
git rm frontend/public/logo.png frontend/public/text_logo.png
cd frontend && npm run build
grep -rn "logo.png" src/ ../frontend/index.html || echo CLEAN
```

Expected: 빌드 성공, `logo.png` 참조 0건, dist에 webp만 존재

- [ ] **Step 4: 커밋**

```bash
git add -A frontend/public frontend/src/pages/HomePage.jsx frontend/src/components/layout/Sidebar.jsx frontend/src/components/layout/Header.jsx frontend/index.html
git commit -m "Perf: 로고 이미지 WebP 변환·리사이즈 (1.77MB→~90KB), LCP preload 추가"
```

---

### Task 3: 폰트 서브셋 (담당: Fable 직접)

**Files:**
- Create: `frontend/public/fonts/DungGeunMo.subset.woff2`, `Galmuri11.subset.woff2`, `Galmuri11-Bold.subset.woff2`
- Delete: `frontend/public/fonts/DungGeunMo.woff`, `DungGeunMo.woff2`, `Galmuri11.woff2`, `Galmuri11-Bold.woff2`
- Modify: `frontend/src/index.css` (@font-face 3곳), `frontend/index.html` (preload 2건)

**Interfaces:**
- Produces: 서브셋 woff2 3종 — KS X 1001 한글 2,350자 + ASCII + Latin-1 보충 + 일반 문장부호

- [ ] **Step 1: fonttools 설치 및 서브셋 생성**

```bash
py -m pip install --user fonttools brotli
```

서브셋 스크립트 (스크래치패드에 저장 후 `py` 실행):

```python
import subprocess, sys
from pathlib import Path

fonts = Path(r'C:\coding\dumpit\frontend\public\fonts')

def in_ksx1001(ch):
    try:
        ch.encode('euc_kr')
        return True
    except UnicodeEncodeError:
        return False

# KS X 1001 상용 한글 2,350자 = euc_kr로 인코딩 가능한 완성형 음절
hangul = ''.join(chr(c) for c in range(0xAC00, 0xD7A4) if in_ksx1001(chr(c)))
assert len(hangul) == 2350, len(hangul)

text_file = fonts / 'subset-glyphs.txt'
text_file.write_text(hangul, encoding='utf-8')
unicodes = 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+3000-303F,U+3131-318E,U+FF01-FF5E'

for src, dst in [
    ('DungGeunMo.woff2', 'DungGeunMo.subset.woff2'),
    ('Galmuri11.woff2', 'Galmuri11.subset.woff2'),
    ('Galmuri11-Bold.woff2', 'Galmuri11-Bold.subset.woff2'),
]:
    subprocess.run([
        sys.executable, '-m', 'fontTools.subset', str(fonts / src),
        f'--text-file={text_file}', f'--unicodes={unicodes}',
        '--flavor=woff2', f'--output-file={fonts / dst}',
        '--layout-features=*', '--drop-tables+=DSIG', '--name-IDs=*',
    ], check=True)
    print(dst, (fonts / dst).stat().st_size)
text_file.unlink()
```

검증: 서브셋 3종 합계가 원본(1.6MB) 대비 60% 이상 감소. (감소율이 낮으면 폰트가 이미 2,350자 구성인 것 — 그 경우 수치를 보고서에 기록하고 파일 교체는 그대로 진행)

- [ ] **Step 2: @font-face 교체 + preload**

`frontend/src/index.css` — 둥근모 블록의 woff 폴백 줄 삭제 포함:

```css
@font-face {
  font-family: 'DungGeunMo';
  src: url('/fonts/DungGeunMo.subset.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}
```

갈무리 2블록도 각각 `Galmuri11.subset.woff2` / `Galmuri11-Bold.subset.woff2`로 교체.

`frontend/index.html` `<head>`에 (Task 2의 이미지 preload 아래):

```html
    <link rel="preload" as="font" type="font/woff2" href="/fonts/Galmuri11.subset.woff2" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="/fonts/DungGeunMo.subset.woff2" crossorigin />
```

- [ ] **Step 3: 원본 삭제 및 검증**

```bash
git rm frontend/public/fonts/DungGeunMo.woff frontend/public/fonts/DungGeunMo.woff2 frontend/public/fonts/Galmuri11.woff2 frontend/public/fonts/Galmuri11-Bold.woff2
cd frontend && npm run build
npx vite preview --port 4173 &
```

preview에서 홈·대시보드·마이페이지를 열어 픽셀 폰트(로고 숫자, 갈무리 제목) 정상 렌더 육안 확인. 태스크 제목에 "닭갈비 됬됬" 같은 상용/비상용 혼합 문자열을 입력해 폴백 동작 확인 후 삭제.

- [ ] **Step 4: 커밋**

```bash
git add -A frontend/public/fonts frontend/src/index.css frontend/index.html
git commit -m "Perf: 픽셀 폰트 한글 2350자 서브셋 (1.6MB 대폭 감소) + preload"
```

---

### Task 4: 코드 스플리팅 + Sentry 지연 (담당: Fable 직접)

**Files:**
- Modify: `frontend/src/App.jsx`, `frontend/src/main.jsx`

**Interfaces:**
- Consumes: 기존 라우트 구조 (Root/PrivateRoute/AdminRoute/PublicOnlyRoute 유지)
- Produces: HomePage 외 페이지들이 별도 청크로 분리된 dist

- [ ] **Step 1: App.jsx 수정**

import 절과 Root를 다음으로 교체 (라우터 정의·가드 컴포넌트는 유지):

```jsx
import { useEffect, lazy, Suspense, Component } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider, notifyToast } from './context/ToastContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BrainDumpPage = lazy(() => import('./pages/BrainDumpPage'))
const IdeaDumpPage = lazy(() => import('./pages/IdeaDumpPage'))
const RoutinePage = lazy(() => import('./pages/RoutinePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const NoticePage = lazy(() => import('./pages/NoticePage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))

/** Sentry 지연 로드와 호환되는 자체 에러 바운더리 — 캐치 시점에 SDK를 불러 전송 */
class AppErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error) {
    import('@sentry/react').then((Sentry) => Sentry.captureException(error)).catch(() => {})
  }
  render() {
    if (this.state.hasError) return <div className="min-h-screen bg-accent" />
    return this.props.children
  }
}

function Root() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-accent" />}>
            <Outlet />
          </Suspense>
        </AppErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  )
}
```

`import * as Sentry from '@sentry/react'` 줄 삭제. 라우터 정의는 무변경 (lazy 컴포넌트가 같은 이름이므로).

- [ ] **Step 2: main.jsx Sentry 지연**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App.jsx'
import { registerNotificationServiceWorker } from './utils/notifications.js'

registerNotificationServiceWorker()

// Sentry는 첫 페인트를 막지 않도록 로드 완료 후 초기화
window.addEventListener('load', () => { import('./sentry.js') })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: 검증**

```bash
cd frontend && npm run build
ls dist/assets | grep -c ".js$"
```

Expected: 빌드 성공, JS 청크가 11개 이상(페이지별 분리). preview로 로그인 전 홈 → (로그인 상태면) 대시보드·마이페이지·공지 라우팅 전환이 Suspense 깜빡임 정도로 정상 동작. 개발자도구 Network에서 첫 로드에 페이지 청크·Sentry 청크가 안 내려오는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx
git commit -m "Perf: 라우트 코드 스플리팅(React.lazy) + Sentry 지연 초기화"
```

---

### Task 5: After 측정 + 보고서 + dev 머지 (담당: Fable 직접)

**Files:**
- Create: `docs/performance/lighthouse/local-after.*`
- Modify: `docs/performance/2026-07-12-frontend-first-load.md` (완성)

- [ ] **Step 1: after 측정**

Task 1 Step 3과 동일 명령으로 `local-after` 측정 + dist 자산 표 기록.

- [ ] **Step 2: 보고서 완성**

구조: 배경/증상 → 진단 방법(도구·조건) → Before 실측(실서비스+로컬 표) → 개선 4건 각각
(문제→접근→변경 파일→크기 before/after) → After 실측(로컬 비교 표, 지표 감소율) →
종합(첫 로드 페이로드 총 감소량, Lighthouse 점수 변화) → 한계와 남은 과제
(실서비스 after는 배포 후 추가 예정·버전 주석, 폰트 unicode-range 분할, 희귀 음절 폴백,
이미지 반응형 srcset, lint 인프라). 포트폴리오 인용을 위해 수치는 표로, 방법은 재현 가능하게.

- [ ] **Step 3: 커밋 + dev 머지**

```bash
git add docs/performance
git commit -m "Docs: 첫 로드 성능 개선 보고서 (before/after 실측)"
git checkout dev
git merge feature/perf-first-load --no-edit
cd frontend && npm run build   # 머지 결과 검증
git branch -d feature/perf-first-load
```
