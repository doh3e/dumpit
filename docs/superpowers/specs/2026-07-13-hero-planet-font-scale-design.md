# 히어로 행성 유동 크기 + 글자 크기 설정 — 디자인 스펙

- 날짜: 2026-07-13
- 상태: 디자인 사용자 승인됨 (행성=유동형, 글자=rem 비례 확대 선택)
- 작업 브랜치: `feature/hero-planet-font-scale` (dev에서 분기)

## 1. 배경과 목표

두 가지 가독성 개선 요청:

1. **히어로 행성이 작다** — 대시보드 히어로 카드의 행성(OrbitProgress)이 화면 크기와
   무관하게 궤도 링 64px·행성 22px 고정이라, 넓은 화면에서 행성과 "오늘 N/N" 카운트가
   왜소해 보인다. 화면이 줄면 함께 작아지는 반응형이어야 한다.
2. **글자 크기 조절 옵션이 없다** — 설정 모달에서 3~4단계로 글자 크기를 고를 수 있어야
   한다.

**사용자 선택(브레인스토밍 확정)**:

- 행성: 뷰포트에 비례하는 **유동형(clamp)**. 픽셀 스프라이트가 정수배가 아닌 크기로
  그려지는 구간은 수용.
- 글자: **글자+여백 비례 확대**(루트 font-size 스케일링). 글자만 커지는 방식이 아니라
  rem 기반 여백·버튼이 함께 커져 잘림·줄바꿈이 없다. 픽셀 테두리·그림자는 px로 남겨
  레트로 감성을 유지한다.

## 2. 히어로 행성 유동 크기 (OrbitProgress)

`frontend/src/components/OrbitProgress.jsx`를 고정 px SVG에서 **CSS 변수 + viewBox
기반**으로 전환한다. 사용처는 NowHeroCard 한 곳뿐이라 `size` prop은 제거한다.

### 크기 체계

- 래퍼 div에 `--orbit-size: clamp(4rem, 8vw + 1rem, 7.5rem)` 지정.
  - 375px 뷰포트: 46px → **하한 64px**(현재와 동일, 모바일 회귀 없음)
  - 1024px: 약 98px / 1280px: 약 118px / 1330px 이상: **상한 120px**(현재의 약 1.9배)
  - 엔드포인트가 rem이므로 글자 크기 설정과 연동 — '아주 크게(125%)'면 상한 150px.
- SVG: `viewBox="0 0 64 64"` + `width/height 100%`. 기존 원 계산(r = 29, 원주,
  strokeDasharray 진행률)은 viewBox 좌표계에서 그대로 유지. 스트로크·점선 간격은
  비례 확대를 수용한다(120px에서 링 두께 약 2.8px — 레트로 톤에 자연스러움).
- 행성 스프라이트: `width/height: calc(var(--orbit-size) * 0.34375)` (22/64 —
  64px일 때 22px로 현재와 동일, 120px일 때 41px). `image-rendering: pixelated` 유지.
- 궤도 위성 점(`.orbit-sat`): `--orbit-r: calc(var(--orbit-size) * 0.453)`로 파생
  (29/64 ≈ 0.453). JS 측정 불필요. 위성 점 자체(5px)는 고정 유지.
- 래퍼 폭: `calc(var(--orbit-size) + 8px)` (기존 `size + 8` 대응).

### 카운트 텍스트

"오늘 N/N"을 11px/12px에서 **`text-[0.75rem]`(12px), 숫자 `text-[0.875rem]`(14px)**로
키운다. rem이라 글자 크기 설정에도 함께 반응한다.

## 3. 글자 크기 설정 (4단계)

### 단계 정의

| 키 | 라벨 | 루트 font-size |
|---|---|---|
| `sm` | 작게 | 90% |
| `base` | 기본 | 100% (저장 안 함) |
| `lg` | 크게 | 112.5% |
| `xl` | 아주 크게 | 125% |

### 유틸 — `frontend/src/utils/fontScale.js` 신설

`utils/theme.js`와 동일한 패턴:

- localStorage 키 `dumpit-font-scale`. `base`(기본)는 저장하지 않고 키 제거.
- `getFontScalePref()`: 저장값이 유효하면 반환, 아니면 `'base'`.
- `applyFontScale(pref)`: 저장 + `document.documentElement.style.fontSize` 설정
  (`base`면 빈 문자열로 초기화).

### 부트 적용 — `frontend/index.html`

기존 테마 인라인 스크립트 IIFE에 폰트 스케일 적용을 추가해 **첫 페인트 전 반영**
(FOUC·레이아웃 점프 방지). 인라인이라 유틸을 import할 수 없으므로 스케일 매핑이
fontScale.js와 중복되는 것은 수용한다(값 변경 시 두 곳 동기화 주석 명시).

### 설정 UI — SettingsModal

테마 섹션 바로 아래 "글자 크기" 섹션 추가. 테마와 동일한 버튼 패턴
(`btn-retro`/`btn-retro-primary` 4개, flex gap-2). 클릭 즉시 `applyFontScale` 호출로
**라이브 프리뷰** — 저장 버튼과 무관하게 즉시 반영·영속화.

### 선행 마이그레이션 — px 고정 글자 → rem

루트 스케일링이 반쪽이 되지 않도록 `text-[Npx]` 임의값 **130토큰(26개 파일)** 을 rem으로
일괄 변환한다. 순수 기계적 치환: `N/16rem`.

| 예시 | 변환 |
|---|---|
| `text-[10px]` | `text-[0.625rem]` |
| `text-[11px]` | `text-[0.6875rem]` |
| `text-[13px]` | `text-[0.8125rem]` |
| `text-[19px]` | `text-[1.1875rem]` |
| `text-[24px]` | `text-[1.5rem]` |

- `index.css`의 `@apply text-[11px]`(`.chip-retro` 등)도 동일 변환.
- `index.css` 내 px 단위 `font-size` 선언이 있으면 함께 rem 변환.
- **변환 제외(의도적 px 유지)**: 레트로 테두리(1.5px), 그림자(3px/5px), 터치 타깃
  `min-height: 44px`, 위성 점 5px — 확대 시에도 픽셀 감성이 뭉개지지 않는 핵심.
- 완료 판정: `text-\[\d+px\]` grep 잔존 0건.

### 적용 범위

- 웹·데스크톱(Electron, 동일 웹뷰) 자동 적용.
- 서버 저장 없음 — 테마와 동일하게 **기기별 localStorage 설정**이 자연스럽다.

## 4. 검증

프론트에 테스트 러너가 없으므로(빌드·lint만 존재):

1. `npm run lint` + `npm run build` 통과.
2. `text-\[\d+px\]` grep 잔존 0건.
3. 브라우저 스모크: 대시보드·설정 모달·태스크 추가 모달을 **4단계 × 라이트/다크**로
   확인. 특히 125%에서 칩·버튼 잘림, 히어로 카드 줄바꿈 확인.
4. 행성 반응형: 375px(64px 유지)·1280px+(120px 도달) 두 극단 + 위성 궤도 정렬 확인.

## 5. 리스크와 수용 기준

- 유동 구간에서 행성 스프라이트 비정수배 렌더링 — 사용자 수용 완료.
- 125%에서 `max-w-[180px]` 등 px 고정 폭 안의 텍스트가 더 일찍 말줄임 — 기존 truncate
  처리로 깨짐은 없음. 수용.
- 뷰포트 폭 계산에 사이드바가 포함(vw 기준)되나, 히어로 카드가 화면 폭에 대체로
  비례하므로 근사 수용. 컨테이너 쿼리는 도입하지 않는다(YAGNI).

## 6. 범위 밖 (후속 백로그 아님, 명시적 제외)

- 글자 크기 서버 동기화.
- 행성 스프라이트 정수배 스냅핑.
- px 여백·고정 폭(`max-w-[180px]` 등)의 rem 전환 — 글자 스케일과 무관하게 동작 확인됨.
