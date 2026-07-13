# 뽀모도로 색상 독립 설계 (2026-07-13)

## 목표

뽀모도로 UI(웹 컴포넌트 + 데스크톱 일렉트론 위젯)의 색을 전역 테마(배경&주요색상 스킨)에서 분리한다.
뽀모도로 테마 미장착 시에도 **뽀모도로 전용 고정 팔레트**를 쓰고(전역 accent 추종 중단),
뽀모도로 테마를 장착하면 pomo 스킨이 뽀모도로 UI 전체를 관장한다.

## 배경 (현재 결합 구조)

- 루트 폴백이 `--pomo-focus: var(--accent)` 식이라 미장착 시 전역 테마를 따라감.
- `PomodoroTimer.jsx`의 4곳이 전역색에 직접 결합:
  설정 패널(`bg-accent`=전역 `--bg`), 적용 버튼(`btn-retro-primary`=전역 `--accent`),
  일시정지 상태 버튼(`bg-accent`), 루트 폴백 자체.
- 데스크톱 위젯(`desktop/electron/pomodoro-widget.html`)은 기본 토큰 하드코딩 — 스킨 자체 미적용.
- 배지·진행 링·시작 버튼은 이미 `--pomo-focus/break/ring` 사용 중 (문제 없음).

## 결정 사항

| 항목 | 결정 |
|---|---|
| 범위 | 웹 `PomodoroTimer` + 데스크톱 위젯 둘 다 (dev의 desktop/은 desktop 브랜치와 diff 0이라 충돌 없음) |
| 미장착 기본 동작 | **항상 뽀모 고정색** — 현재 기본 테마 외형을 리터럴로 동결 (기본 유저 시각 변화 0) |
| 접근 | CSS 변수 확장(A안). 스코프 오버라이드(B)·JS 색 주입(C)은 부작용·이중화로 기각 |

## 웹 — CSS 변수 체계

루트(`index.css :root` / `[data-theme="dark"]`)의 pomo 변수를 고정 리터럴로 교체하고 `--pomo-soft`(연한 면)를 신설:

| 변수 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| --pomo-focus | #D95F52 | #F09355 | FOCUS 배지·진행 링·시작/적용 버튼 |
| --pomo-break | #3E8E85 | #5FC4B4 | BREAK 배지·휴식 링 |
| --pomo-ring | #E0D2B6 | #413966 | 링 트랙 |
| --pomo-soft | #F7EFDF | #1F1B2E | 설정 패널·일시정지 버튼 배경 |

뽀모 스킨 4종에 `--pomo-soft` 추가 (오션·라벤더·로즈는 같은 컨셉 크롬 톤 재사용, 캔디는 신규 설계):

| 스킨 | 라이트 | 다크 |
|---|---|---|
| ocean | #E4EFEC | #1E3240 |
| lavender | #EEEAF4 | #32294E |
| rose | #F5E9EA | #3A282E |
| candy | #FBE4EE | #402832 |

`PomodoroTimer.jsx` 교체 4곳:
1. 설정 패널: `bg-accent` → `style background: var(--pomo-soft)`
2. 적용 버튼: `btn-retro-primary` → `btn-retro` + `style background: var(--pomo-focus)` + `text-on-accent`
3. 일시정지 상태 버튼: `bg-accent` → `style background: var(--pomo-soft)`
4. (배지·링·시작 버튼은 기존 pomo 변수 유지)

## 데스크톱 위젯 — 색 동기화

- 웹 `updatePomodoroState` 페이로드에 `colors: { focus, break, ring, soft }` 동봉.
  `getComputedStyle(document.documentElement)`에서 읽은 해석 완료 값이라 다크모드·스킨 조합 자동 반영.
- 위젯 CSS: `.mode`/`.progress`/`.action.primary`의 `--accent/--accent2` 참조를
  위젯 로컬 `--pomo-focus/--pomo-break/--pomo-ring`으로 교체(기본값=현행 토큰).
- `pomodoro-widget-preload.cjs`의 `renderState()`가 `payload.colors`를
  `document.documentElement.style.setProperty()`로 적용. colors 부재 시(구버전 웹) 기본값 유지.

## 색 갱신 타이밍

- 타이머 state 전송(매초/상태 변화)에 colors 자연 동봉.
- 유휴 중 변경 대응: 테마 토글(`applyTheme`)과 스킨 장착(`applySkins`)이 모두 `<html>` dataset을
  변경하므로, `document.documentElement` 속성 대상 **MutationObserver 하나**로 두 경우를 커버 —
  변화 감지 시 colors 재전송 트리거(데스크톱 환경에서만 부착).

## 검증

- lint / build.
- dev 스모크: ① 배경 테마 교체에도 뽀모도로 4요소 불변 ② 뽀모 테마 장착 시 전부 뽀모색
  ③ 위젯 색이 웹과 동일 ④ 다크모드 전환 반영 ⑤ 미장착 기본 외형이 기존과 동일.

## 트레이드오프 (승인됨)

미장착 + 비기본 배경 테마 조합에서 뽀모도로가 기본 팔레트(빨강/틸/크림)로 고정되어
주변 톤과 분리돼 보일 수 있음 — "항상 뽀모 고정색" 결정의 귀결이며 뽀모 테마 구매 유인으로 수용.

## 범위 밖

- 뽀모 스킨 신규 추가(테마 크로스슬롯 세트 사이클에서 진행 — 이 구조가 선행 기반이 됨).
- 위젯의 나머지 크롬(카드·라인 등) 스킨화.
