# 행성 도트 리뉴얼 + 확장 설계 (2026-07-13)

## 목표

상점 행성 슬롯을 기존 4종(16×16, 외부 CC-BY 에셋)에서 **자체 제작 32×32 도트 15종**으로 리뉴얼·확장한다.
히어로 행성이 유동 크기(22~41px 표시)가 되면서 16×16의 디테일 한계가 드러났고,
꽃행성·식물행성 같은 컨셉추얼 도트는 외부 팩에 존재하지 않아 전량 자체 제작으로 전환한다.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 제작 방식 | 전량 자체 제작 — Python(Pillow) 스크립트로 픽셀 좌표 지정 |
| 해상도 | 32×32 (애니메이션은 가로 8프레임 시트 256×32) |
| 기존 4종 | 같은 코드 유지한 채 32×32로 전부 리드로우 (구매자 마이그레이션 없음) |
| 신규 | 11종 추가 → 행성 슬롯 총 15종 |
| 애니메이션 | 태양·블랙홀 2종만 8프레임 애니(4프레임 90° 스텝은 검수에서 끊김 피드백 → 22.5~45° 스텝으로 확장). 고래 헤엄·은하 회전은 후속 백로그 |

## 아트 제작 파이프라인

- 생성 스크립트를 리포에 커밋: `frontend/scripts/sprites/gen_planets.py` (재현·리컬러·후속 추가 용이).
- 산출물: `frontend/src/assets/shop/planet_*.png` (정지 32×32, 애니 256×32).
- 스타일 가이드:
  - 기존 peony 톤 계승 — 외곽선 없이 2~4톤 셰이딩, 좌상단 광원, 투명 배경.
  - 본체 지름 ~28px, 고리·플레어가 있는 스프라이트는 캔버스를 꽉 채움.
  - 팔레트는 앱 토큰(틸 accent, 앰버 warn, 골드 starlight)과 조화.
  - **다운스케일 제약**: 모바일에서 22px까지 축소 표시되므로 핵심 디테일(꽃잎·크레이터·대적점)은
    2px 클러스터 이상으로 설계해 nearest-neighbor 축소에서 뭉개지지 않게 한다.
- 검수 루프: 8배 확대 미리보기 시트를 사용자에게 보여주고 피드백 반복, 컨펌된 것만 최종 반영.

## 라인업·가격 (ShopCatalog)

리드로우 4종은 코드·이름·가격·티어 전부 기존 유지 (default 무료, crimson 250 COLOR, ice 250 COLOR, ringed 500 CONCEPT).

신규 11종은 전부 PLANET 슬롯, CONCEPT 티어:

| 이름 | 코드 | 가격 | 컨셉 |
|---|---|---|---|
| 달 | planet.moon | 400 | 크레이터, 회백색 |
| 바다 행성 | planet.ocean | 450 | 파도 무늬 — 오션 테마 세트감 |
| 식물 행성 | planet.sprout | 450 | 초록 대륙+새싹 — 새싹 정원 세트감 |
| 지구 | planet.earth | 500 | 대륙+구름 |
| 목성 | planet.jupiter | 500 | 줄무늬+대적점 |
| 꽃 행성 | planet.blossom | 500 | 꽃잎 표면, 분홍 계열 |
| 사탕 행성 | planet.candy | 500 | 소용돌이 캔디 — 캔디 타이머 세트감 |
| 나선 은하 | planet.galaxy | 600 | 소용돌이 은하 — 은하수 배경 세트감 |
| 우주 고래 | planet.whale | 800 | 픽셀 고래, 귀여움 와일드카드 |
| 태양 | planet.sun | 800 | **애니**: 회전 불꽃 혀+흑점+플레어 파형 8프레임 |
| 블랙홀 | planet.blackhole | 1000 | **애니**: 나선 소용돌이 강착원반 8프레임, 신규 최고가 |

카탈로그 총 아이템 수 26 → 37.

## 애니메이션 렌더링 구조

- registry 엔트리 확장: `{ name, img }` → 애니 스프라이트는 `{ name, img, frames: 8, fps }` 추가.
- 공용 컴포넌트 `PixelSprite` 신설 (`frontend/src/components/PixelSprite.jsx`):
  - `frames` 없으면 기존과 동일한 `<img>` (image-rendering: pixelated).
  - `frames` 있으면 `background-image` + `background-size: calc(100% * frames) 100%` +
    `animation: steps(frames)` div로 프레임 애니.
  - `prefers-reduced-motion`: 애니 정지, 첫 프레임 고정.
- 소비처 교체: `OrbitProgress`(히어로 행성), `ShopPage`의 `ItemPreview`(행성 슬롯).
  완료 축하·정거장·스티커는 이번 범위 밖 (PixelSprite는 범용으로 만들되 교체하지 않음).

## 그 외 변경

- `frontend/src/shop/registry.js`: PLANET_SPRITES 15종으로 확장.
- `backend ShopCatalog.java`: 신규 11종 추가.
- `ShopCatalogTest`: 아이템 수 단언 26 → 37 (2개 테스트).
- `docs/ATTRIBUTIONS.md`: 행성 4행을 자체 제작으로 교체.
  peony 크레딧 자체는 완료축하·정거장·스티커·패턴에서 계속 쓰므로 문서·상점 하단 표기 유지.

## 검증

- lint / build / 백엔드 테스트 통과.
- dev 서버 스모크: 히어로 행성 표시(모바일 22px·데스크톱 41px 축소/확대 품질), 상점 15종 미리보기,
  구매→장착→히어로 반영, 태양·블랙홀 애니 재생, reduced-motion에서 정지 확인.
- 배포 주의: 기존 구매자 코드 유지라 데이터 마이그레이션 없음.

## 범위 밖 (후속 백로그)

- 고래 헤엄·은하 회전 등 추가 애니메이션.
- 완료 축하·정거장 슬롯의 32×32 리뉴얼.
- 행성별 개별 궤도 연출.
