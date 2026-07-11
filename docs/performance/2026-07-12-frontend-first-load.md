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

### ① 이미지 최적화
(작성 예정)

### ② 폰트 서브셋
(작성 예정)

### ③ 라우트 코드 스플리팅
(작성 예정)

### ④ Sentry 지연 초기화
(작성 예정)

## After 실측
(작성 예정)

## 종합
(작성 예정)

## 한계와 남은 과제
(작성 예정)
