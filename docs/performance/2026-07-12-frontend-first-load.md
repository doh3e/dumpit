# DumpIt 프론트엔드 첫 로드 성능 개선 보고서

- 기간: 2026-07-12
- 대상: https://dumpit.kr (React/Vite SPA, Cloudflare 정적 호스팅)
- 작업 브랜치: `feature/perf-first-load`

## 배경과 증상

실서비스 첫 접속(랜딩 페이지)이 체감상 느리고, 모바일에서 커스텀 픽셀 폰트가 적용되기 전
시스템 기본 폰트가 먼저 보이는 현상(FOUT)이 간헐적으로 발생했다.

## 진단 방법

- **Lighthouse CLI** (performance 카테고리, 모바일 에뮬레이션, simulated throttling,
  headless Chrome) — 실서비스와 로컬 프로덕션 빌드(`vite preview`) 각각 측정
- **번들 분석** — Vite 빌드 산출물(dist) 자산별 크기 실측
- 개선 효과는 동일 코드베이스·동일 조건의 로컬 preview before/after로 분리 검증
  (실서비스 after는 배포 후 재측정 예정 — 해당 수치에는 별도 진행된 대시보드 개편 변경도
  포함됨을 명시해둔다)
- 원본 결과: `docs/performance/lighthouse/`

## Before 실측

### Lighthouse (모바일)

| 지표 | 실서비스 (dumpit.kr) | 로컬 preview |
|---|---|---|
| Performance 점수 | **55 / 100** | 56 / 100 |
| FCP | 3.4 s | 8.9 s* |
| **LCP** | **18.8 s** | 17.4 s |
| Speed Index | 3.4 s | 8.9 s |
| TBT | 0 ms | 0 ms |
| 총 전송량 | 2,971 KiB | 2,947 KiB |

\* 로컬은 CDN·HTTP 캐시가 없어 절대값이 실서비스와 다름 — before/after 상대 비교용.

### 첫 로드 전송량 상위 (실서비스 네트워크 실측)

| 리소스 | 전송 크기 | 비고 |
|---|---|---|
| logo.png | **1,494 KB** | 랜딩 히어로 이미지 = **LCP 요소** |
| DungGeunMo.woff2 | 925 KB | 픽셀 폰트(크롬용), 서브셋 없음 |
| index.js | 195 KB (gzip) | 원본 642KB — 17개 페이지 전체 + Sentry 단일 번들 |
| Pretendard subsets | ~150 KB | dynamic subset (정상 동작) |

### 빌드 산출물 (dist, before)

| 자산 | 크기 |
|---|---|
| DungGeunMo.woff | 1,647 KB (woff2 폴백용, 사실상 미사용) |
| logo.png | 1,529 KB |
| DungGeunMo.woff2 | 946 KB |
| index.js | 643 KB |
| Galmuri11.woff2 | 505 KB |
| text_logo.png | 271 KB |
| Galmuri11-Bold.woff2 | 167 KB |
| index.css | 82 KB |

### 원인 요약

1. **LCP 18.8s의 주범은 1.5MB 원본 PNG 로고** — 표시 크기(288px)의 수 배 해상도를 무압축 포맷으로 전송
2. **픽셀 폰트 2종 1.6MB 통짜 로드** — 본문 폰트(Pretendard)는 dynamic subset을 쓰지만
   둥근모·갈무리는 전체 글리프 로드 → FOUT 구간 장기화
3. **코드 스플리팅 부재** — 랜딩만 열어도 관리자 페이지 포함 전체 앱 JS(642KB)를 로드
4. **Sentry SDK eager 초기화** — 첫 페인트 전 초기 번들에 포함

## 개선 항목

### ① 이미지 최적화 (커밋 e7abff1)

**문제**: LCP 요소인 랜딩 로고가 1,529KB 원본 PNG. 표시 크기는 288px인데 원본 해상도를 그대로 전송.

**접근**: Pillow로 표시 크기의 2x(576px)로 리사이즈 + WebP(q82) 변환. 참조 3곳
(HomePage·Sidebar·Header) 교체, 히어로 `<img>`에 width/height 부여(CLS 예방),
`<link rel="preload" as="image">`로 LCP 이미지 선로드. 원본 PNG는 배포에서 제거.

| 파일 | Before | After | 감소 |
|---|---|---|---|
| logo.png → logo.webp | 1,529 KB | 54 KB | **-96.5%** |
| text_logo.png → text_logo.webp | 271 KB | 12 KB | -95.6% |

### ② 폰트 서브셋 (커밋 decf04f)

**문제**: 픽셀 폰트 2종(둥근모·갈무리11)을 전체 글리프로 로드 — 1,617KB. 모바일에서
다운로드 완료 전까지 시스템 폰트가 보이는 FOUT의 직접 원인.

**접근**: fontTools(pyftsubset)로 KS X 1001 상용 한글 2,350자 + ASCII + 주요 문장부호로
서브셋한 woff2 재생성. `@font-face` 교체(사장돼 있던 1.6MB woff 폴백도 제거),
`<link rel="preload" as="font">`로 CSS 파싱 전에 다운로드 시작 → FOUT 구간 이중 단축.
글리프 커버리지는 앱 고정 문구 샘플을 서브셋 cmap과 대조해 검증 (비상용 음절만 의도적으로 제외).

| 파일 | Before | After | 감소 |
|---|---|---|---|
| DungGeunMo.woff2 | 946 KB | 189 KB | -81% |
| Galmuri11.woff2 | 505 KB | 52 KB | -90% |
| Galmuri11-Bold.woff2 | 167 KB | 45 KB | -74% |
| (DungGeunMo.woff 폴백) | 1,648 KB | 삭제 | 배포 제외 |

구현 노트: 파이썬 `euc_kr` 코덱이 비상용 음절을 8바이트 조합형으로 확장 인코딩하기 때문에,
"인코딩 성공 = 상용 2,350자" 가정이 깨진다. EUC-KR 2바이트 + 리드바이트 0xB0~0xC8 필터로
정확히 2,350자를 도출했다.

### ③ 라우트 코드 스플리팅 (커밋 a66a648)

**문제**: 17개 페이지 전체(관리자 페이지 포함)가 단일 번들(643KB/gzip 196KB) — 랜딩만 열어도
앱 전체 JS를 다운로드·파싱.

**접근**: 랜딩(HomePage)만 eager로 남기고 10개 페이지를 `React.lazy`로 전환,
Root에 `Suspense` 추가. JS 청크 1개 → 16개 (페이지별 분리).

| 지표 | Before | After |
|---|---|---|
| 엔트리 JS (raw) | 643 KB | 395 KB |
| 엔트리 JS (gzip) | 196 KB | **131 KB (-33%)** |

### ④ Sentry 지연 초기화 (커밋 a66a648 + c73597b)

**문제**: Sentry SDK가 main.jsx 첫 줄 정적 import + ErrorBoundary 정적 import로
초기 번들에 포함 — 첫 페인트에 불필요한 코드.

**접근**: `window` load 이벤트 후 dynamic import로 초기화. `Sentry.ErrorBoundary`는
자체 ErrorBoundary로 교체하고, 에러 캐치 시점에 SDK를 불러 전송. 리뷰에서
"초기화 전 에러가 조용히 유실되는" 결함이 발견되어 `sentry.js`(init 사이드이펙트)를
먼저 import하도록 보강(c73597b). SDK는 별도 청크(gzip 126KB)로 분리되어
로드 완료 후에만 다운로드된다. 트레이드오프: React 컴포넌트 스택 자동 첨부 소실(수용).

## After 실측

로컬 preview, before와 동일 조건(모바일 에뮬레이션 + simulated throttling):

| 지표 | Before | After | 변화 |
|---|---|---|---|
| Performance 점수 | 56 | **69** | +13 |
| FCP | 8.9 s | 4.0 s | **-55%** |
| **LCP** | **17.4 s** | **5.7 s** | **-67%** |
| Speed Index | 8.9 s | 4.0 s | -55% |
| 총 전송량 | 2,947 KiB | **790 KiB** | **-73%** |

## 종합

- 첫 로드 페이로드를 **2.9MB → 0.8MB (-73%)** 로 줄였다. 핵심은 ① 표시 크기를 무시한
  원본 이미지, ② 서브셋 없는 한글 웹폰트, ③ 코드 스플리팅 부재 — 세 가지 전형적 문제였다.
- LCP는 통제 환경에서 17.4s → 5.7s. 실서비스(CDN 캐시 포함)에서는 더 빠를 것으로 예상하며
  배포 후 재측정해 아래에 추가한다.
- FOUT(모바일 기본 폰트 노출)는 폰트 용량 82% 감소 + preload로 구간이 크게 짧아졌다.
- 모든 변경은 프론트 전용, 시각 디자인·기능 변경 없음.

## 한계와 남은 과제

- **실서비스 after 미측정**: main 배포 후 dumpit.kr 재측정 예정. 그 수치에는 별도로 진행된
  대시보드 개편 변경도 포함됨을 감안해야 함 (성능 요인 자체는 본 작업에서만 변경).
- **비상용 한글 음절**: 사용자 입력에 2,350자 밖 음절이 오면 해당 글자만 본문 폴백 폰트로
  렌더링. 문제가 되면 unicode-range 분할(다중 파일 dynamic subset) 방식으로 확장.
- 남은 개선 여지: 이미지 srcset 반응형, 엔트리 JS 추가 분할(vendor 분리), Cloudflare
  캐시 헤더 튜닝, ESLint 인프라 복구(별도 Chore).

