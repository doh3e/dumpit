# 프론트엔드 첫 로드 성능 진단·개선 — 디자인 스펙

- 날짜: 2026-07-12
- 상태: 설계 사용자 승인됨 (대화로 항목별 확정)
- 범위: 로드맵 작업 ③ — 진단(실측) + 개선 + 포트폴리오용 보고서

## 1. 배경과 증상

실서비스(https://dumpit.kr) 첫 접속(랜딩 등)이 체감상 느리다. 부수 증상으로 모바일에서
픽셀 폰트가 로드되기 전 시스템 기본 폰트로 보이는 FOUT이 간헐 발생.

사전 조사로 확인된 첫 로드 페이로드 (~3.5MB+):

| 항목 | 크기 | 원인 |
|---|---|---|
| public/logo.png | 1.5MB | 랜딩 히어로(w-72)·사이드바(h-36)에서 원본 PNG 사용 |
| 픽셀 폰트 2종 | 1.6MB | 둥근모 946KB + 갈무리11 505KB + Bold 167KB, 서브셋 없음 |
| JS 번들 단일 | 642KB(gzip 196KB) | App.jsx가 17개 페이지 전부 eager import, 코드 스플리팅 없음 |
| public/text_logo.png | 270KB | 헤더 h-24 렌더 대비 과대 원본 |
| Sentry SDK | 번들 포함 | main.jsx 첫 줄 정적 import + App.jsx ErrorBoundary 정적 import |

## 2. 진단 (측정 설계)

- **실서비스 before**: `npx lighthouse https://dumpit.kr` (performance만, 모바일 에뮬레이션,
  headless Chrome) → FCP/LCP/TBT/Speed Index/총 전송량 기록. 결과 html/json 보관.
- **통제 비교**: 로컬 `vite preview`(프로덕션 빌드)에 동일 조건 Lighthouse —
  개선 전(dev 기준)과 개선 후를 같은 코드베이스·같은 환경에서 비교해 효과를 분리.
- **번들 구성**: dist 자산 크기 표(전/후).
- 버전 주석: 실서비스 현재 배포본은 대시보드 개편 이전 코드지만, 랜딩·폰트·이미지·번들 구조
  등 성능 요인은 개편에서 변경되지 않아 before 기준선으로 유효. 최종 main 푸시(배포) 후
  실서비스 after를 재측정해 보고서에 추가한다 (그 수치는 개편+성능개선 합산임을 명시).

## 3. 개선 항목

### ① 이미지 최적화
- logo.png → `public/logo.webp` (표시 최대 288px 폭의 2x = 576px, q≈82),
  text_logo.png → `public/text_logo.webp` (h-24=96px의 2x = 192px 높이)
- 참조 교체: HomePage(히어로), Sidebar, Header. 히어로 img에 width/height 속성 부여(CLS 예방)
- `index.html`에 `<link rel="preload" as="image" href="/logo.webp">` (사이드바에서 전 페이지 사용)
- 원본 PNG 2종은 public에서 제거 (git 히스토리 보존)

### ② 폰트 서브셋
- 둥근모·갈무리11(400/700)을 **KS X 1001 상용 한글 2,350자 + ASCII + 주요 문장부호**로
  서브셋한 woff2 재생성 (fonttools pyftsubset). woff 폴백은 제거(woff2 지원 보편화).
- `index.css` @font-face를 서브셋 파일로 교체, `index.html`에 폰트 preload 2건
  (둥근모·갈무리 400, crossorigin) — CSS 파싱 전에 다운로드 시작해 FOUT 구간 단축
- **알려진 트레이드오프**: 2,350자 밖의 희귀 음절(예: 옛한글·비상용 조합)이 태스크 제목 등
  사용자 입력에 포함되면 해당 글자만 폴백 폰트로 렌더링됨. 실사용 텍스트의 99.9%를 커버하므로
  수용. 문제가 커지면 후속으로 unicode-range 분할(다중 파일) 방식 검토.
- font-display: swap 유지 (block은 텍스트 미표시 구간을 만들어 더 나쁨)

### ③ 라우트 코드 스플리팅
- App.jsx에서 HomePage(랜딩·LCP 경로)만 eager 유지, 나머지 10개 페이지를
  `React.lazy` + `<Suspense>`로 분할. fallback은 기존 로딩 카드 스타일의 미니멀 div.

### ④ Sentry 지연 초기화
- main.jsx의 정적 `import './sentry.js'` 제거 → `window` load 이벤트 후 dynamic import
- App.jsx의 `Sentry.ErrorBoundary`를 자체 ErrorBoundary 클래스로 교체
  (에러 캐치 시 dynamic import로 `captureException` 전송) → `@sentry/react`가 초기 번들에서 빠짐
- 트레이드오프: 로드 완료 전 발생하는 극초기 에러는 미수집 — 수용

## 4. 보고서 (핵심 산출물)

`docs/performance/2026-07-12-frontend-first-load.md` — 포트폴리오 인용 가능 구조:
증상 → 진단 방법 → 발견(수치·표) → 개선 항목별 접근과 before/after → 종합 결과(Lighthouse
지표·전송량 감소율) → 한계와 남은 과제. Lighthouse 결과 파일은 `docs/performance/lighthouse/`에 보관.

## 5. 검증

- 각 단계: `npm run build` 통과 (lint는 프로젝트 전체가 사전 고장 — 게이트 제외)
- preview로 전 페이지 육안 확인: 폰트 글리프 누락, 이미지 화질, 라우트 전환(스플리팅 후),
  에러바운더리 동작
- 백엔드 무변경 (프론트 전용 사이클)

## 6. 실행

- 브랜치: `feature/perf-first-load` (dev에서 분기, 완료 후 dev 머지)
- 분담: 측정·폰트 서브셋·코드 스플리팅·보고서는 메인(Fable) 직접, 이미지 변환·참조 교체는 위임 가능
