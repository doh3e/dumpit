# 테마 크로스슬롯 세트 완성 설계 (2026-07-13)

## 목표

컨셉 테마 4종(새싹 정원·은하수·원목 서재·캔디)이 슬롯별로 한 곳에만 존재하는 갭을 메워,
각 컨셉이 배경&주요색상 / 사이드바&상단바 / 뽀모도로 3슬롯 풀세트가 되게 한다.
신규 8종 추가로 카탈로그 37 → 45. 아울러 컨셉 테마의 "도트 감성"을 실제로 보이게 한다:
배경 패턴 미표시 버그를 고치고, 컨셉 크롬에는 도트 엣지 장식(덩굴 등)을 신설한다.

## 배경 패턴 미표시 버그 픽스 (선행)

`--bg-pattern`은 `body`에만 적용되는데 `Layout.jsx` 최상위 래퍼(`min-h-screen bg-accent`)가
불투명 배경으로 body를 전부 덮어 **기존 새싹 정원·은하수 패턴이 출시 이후 한 번도 보인 적이 없음**.
- 픽스: index.css에 `.bg-skin { background-color: var(--bg); background-image: var(--bg-pattern, none); }`
  유틸을 신설하고 `Layout.jsx` 래퍼의 `bg-accent`를 `bg-skin`으로 교체.
- 픽스 후 기존 sprout/galaxy 패턴이 처음 노출되므로 실화면 톤 검수 필수(과하면 패턴 리터치).

## 컨셉 크롬 도트 장식 (신설)

컨셉 크롬(CONCEPT 티어)에만 도트 장식을 부여해 컬러 크롬(COLOR)과 차별화:
- **크롬 전면에 은은한 산포 타일(48×48)** — 최초 설계였던 엣지 스트립(24px)은 검수에서
  "금 간 줄"로 오독돼 전면 방식으로 전환(2026-07-13).
- 구현: `Sidebar`/`Header`의 크롬 요소에 `app-sidebar`/`app-header` 클래스 훅 추가 후
  `[data-skin-chrome="sprout"] .app-sidebar { background-image: ... }` 식 스킨 스코프 CSS.
  background-image라 메뉴/버튼 콘텐츠보다 항상 아래에 깔림(::after 오버레이의 글자 겹침 문제 회피).
- 장식 타일 4컨셉 × 라이트/다크 = 8장: 새싹=덩굴 조각+잎(가독성 피드백으로 저대비·저밀도 조정),
  은하수=별무리, 원목=나뭇결, 캔디=스프링클.
- 기존 chrome.wood(원목 서재)도 장식이 소급 적용됨(기보유자 무료 업그레이드 — 행성 리드로우와 동일 정책).

## 라인업·가격 (전부 CONCEPT 티어, 기존 가격 관례 준수)

| 코드 | 슬롯 | 이름 | 가격 | 설명 문구 |
|---|---|---|---|---|
| bg.wood | BACKGROUND | 원목 서재 | 600 | 따뜻한 원목 서재에서 하루를 정리해요. |
| bg.candy | BACKGROUND | 캔디 | 600 | 달콤한 캔디빛으로 물든 화면이에요. |
| chrome.sprout | CHROME | 새싹 정원 | 400 | 메뉴에 초록 새싹이 움터요. |
| chrome.galaxy | CHROME | 은하수 | 400 | 메뉴가 은하수빛으로 물들어요. |
| chrome.candy | CHROME | 캔디 | 400 | 메뉴가 달콤한 캔디빛이 돼요. |
| pomo.sprout | POMODORO | 새싹 타이머 | 400 | 초록 새싹빛 집중 링이에요. |
| pomo.galaxy | POMODORO | 은하수 타이머 | 400 | 은하수빛 집중 링이에요. |
| pomo.wood | POMODORO | 원목 타이머 | 400 | 원목 서재빛 집중 링이에요. |

## 팔레트 설계

### 신규 배경 2종 (라이트/다크 각 11토큰 + --bg-pattern)

**bg.wood (원목 서재)** — chrome.wood(#F1E5D2/#D6BE97) 톤을 전체 팔레트로 확장:

```css
[data-skin-bg="wood"] {
  --bg:#F1E5D2; --card:#FDF8EE; --chip:#E7D5B8; --line:#D6BE97; --edge:#3E2E1C;
  --accent:#A8763E; --accent2:#5C8A6E; --on-accent:#FFF9EC;
  --shadow-hero:#D9C29B; --shadow-sm:#E3D2B2; --overlay:rgba(62,46,28,.35);
  --bg-pattern:url('./assets/shop/pattern_wood_light.png');
}
[data-skin-bg="wood"][data-theme="dark"] {
  --bg:#241B10; --card:#2F2517; --chip:#3B2F1E; --line:#4E3F2A; --edge:#120C06;
  --accent:#C99B5C; --accent2:#7FAF8F; --on-accent:#1D150A;
  --shadow-hero:#120C06; --shadow-sm:#120C06; --overlay:rgba(8,5,2,.55);
  --bg-pattern:url('./assets/shop/pattern_wood_dark.png');
}
```

**bg.candy (캔디)** — pomo.candy(#E05C8A/#5CA8E0) 계열의 파스텔 스트로베리+민트:

```css
[data-skin-bg="candy"] {
  --bg:#F7E7EE; --card:#FEFAFC; --chip:#F2D7E2; --line:#E5BCCE; --edge:#46243A;
  --accent:#E05C8A; --accent2:#3E93B8; --on-accent:#FFF6FA;
  --shadow-hero:#EBC4D4; --shadow-sm:#F0D2DE; --overlay:rgba(70,36,58,.35);
  --bg-pattern:url('./assets/shop/pattern_candy_light.png');
}
[data-skin-bg="candy"][data-theme="dark"] {
  --bg:#2A1722; --card:#3A2230; --chip:#482C3D; --line:#5E3B50; --edge:#160A11;
  --accent:#F08CAE; --accent2:#7FB8E8; --on-accent:#2A1220;
  --shadow-hero:#160A11; --shadow-sm:#160A11; --overlay:rgba(12,4,9,.55);
  --bg-pattern:url('./assets/shop/pattern_candy_dark.png');
}
```

### 크롬 3종 — 기존 관례: 라이트 = 같은 컨셉 bg의 `--bg`/`--line`, 다크 = bg 다크의 `--card`/`--line`

```css
[data-skin-chrome="sprout"] { --chrome-bg:#EAF2E3; --chrome-line:#C2DBAA; }
[data-skin-chrome="sprout"][data-theme="dark"] { --chrome-bg:#26351F; --chrome-line:#40573A; }
[data-skin-chrome="galaxy"] { --chrome-bg:#E9EAF6; --chrome-line:#C2C5E4; }
[data-skin-chrome="galaxy"][data-theme="dark"] { --chrome-bg:#201D3D; --chrome-line:#3D3866; }
[data-skin-chrome="candy"] { --chrome-bg:#F7E7EE; --chrome-line:#E5BCCE; }
[data-skin-chrome="candy"][data-theme="dark"] { --chrome-bg:#3A2230; --chrome-line:#5E3B50; }
```

### 뽀모 3종 — focus/break는 같은 컨셉 bg의 accent/accent2, soft는 bg의 `--bg`(다크는 bg 다크의 `--bg`)

```css
[data-skin-pomodoro="sprout"] { --pomo-focus:#5C8A3C; --pomo-break:#C4708F; --pomo-soft:#EAF2E3; }
[data-skin-pomodoro="sprout"][data-theme="dark"] { --pomo-focus:#8FBF6F; --pomo-break:#D98BA6; --pomo-soft:#1B2617; }
[data-skin-pomodoro="galaxy"] { --pomo-focus:#6D74C9; --pomo-break:#C9922E; --pomo-soft:#E9EAF6; }
[data-skin-pomodoro="galaxy"][data-theme="dark"] { --pomo-focus:#8F97E8; --pomo-break:#E9B44C; --pomo-soft:#151329; }
[data-skin-pomodoro="wood"] { --pomo-focus:#A8763E; --pomo-break:#5C8A6E; --pomo-soft:#F1E5D2; }
[data-skin-pomodoro="wood"][data-theme="dark"] { --pomo-focus:#C99B5C; --pomo-break:#7FAF8F; --pomo-soft:#241B10; }
```

(뽀모 색상 독립 사이클에서 확립한 `--pomo-soft` 포함 — 2026-07-13 머지 26befea 선행 전제)

## 아트 에셋 (검수 게이트 — 배경 패턴·크롬 장식 통합 1회 이상)

**배경 패턴 4장** (`--bg-pattern` 타일, 기존 sprout/galaxy와 동일 적용 방식·유사 타일 크기):
- **나뭇결(wood)** 라이트/다크: 가는 세로 결 + 옹이 점 — 저대비(배경 방해 금지)
- **스프링클(candy)** 라이트/다크: 도트/막대 스프링클, 분홍·민트·크림 3색 저밀도

**크롬 엣지 장식 타일 8장** (정사각, repeat-x/y 겸용, 저대비):
- 새싹=덩굴 줄기+잎, 은하수=별무리+반짝임, 원목=나뭇결 몰딩, 캔디=스프링클 줄 — 각 라이트/다크

제작: 신규 `frontend/scripts/sprites/gen_patterns.py`(기존 Pillow 파이프라인 헬퍼 재사용).
검수: 확대 시트 + **실제 배경/크롬 톤 위 합성 미리보기**로 과함 여부 판단.
ATTRIBUTIONS.md에 자체 제작 행 추가. 픽스로 처음 노출되는 기존 sprout/galaxy 패턴도 함께 검수.

## 그 외 변경

- `ShopCatalog.java`: 8종 추가 (37→45). `ShopCatalogTest`·`ShopApiTest`의 37 단언 4곳 → 45.
- `ShopPage.jsx SKIN_PREVIEWS`: 신규 8코드 스와치 추가 (라이트 기준 대표색 — bg는 [bg, accent, chip], chrome은 [chrome-bg, line], pomo는 [focus, break] 관례).
- CSS 슬롯 스킨이라 registry/스프라이트 변경 없음. 마이그레이션 없음.

## 검증

- 백엔드 전체 테스트(카운트 갱신 후 통과), 프론트 lint/build.
- dev 스모크: ① 버그픽스로 기존 새싹 정원·은하수 패턴이 실화면에 표시 ② 신규 8종 구매→장착
  ③ 배경 2종 라이트/다크 패턴 ④ 컨셉 크롬 4종 엣지 장식 표시(사이드바 세로+상단바 가로),
  COLOR 크롬은 장식 없음 ⑤ 뽀모 3종 색 반영 ⑥ 같은 컨셉 3슬롯 동시 장착 세트 조화.

## 범위 밖

- 신규 컨셉 테마 발굴(기존 4컨셉의 갭 메우기만).
- 완료 축하·정거장·행성 슬롯의 컨셉 세트화.
