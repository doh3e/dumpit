# 코인샵(상점) 설계 — 2026-07-12

## 1. 개요

할 일 완료·뽀모도로로 모은 코인을 사용하는 상점을 연다. 판매 품목은 두 종류다.

- **테마**: 앱의 시각 요소를 갈아끼우는 꾸미기 아이템. 슬롯 6종 — 배경&주요색상 / 사이드바&상단바 / 뽀모도로 위젯 / 행성 / 완료 애니메이션 / 우주정거장. 슬롯당 1개 장착.
- **스티커**: 태스크·아이디어에 붙이는 마킹(중요·하트·별 등). 한 번 사면 영구 보유, 아무 항목에나 반복 사용. 항목당 1개.

되팔기 없음. 기본 테마는 상품이 아니라 "장착 없음" 상태(무료)다.

### 확정된 결정 사항

| 결정 | 내용 |
|---|---|
| 테마 × 다크모드 | 색상 테마는 **라이트+다크 2벌**을 함께 제공. 기존 라이트/다크/시스템 토글은 그대로 동작 |
| 진입점 | 사이드바 `MENU` + 상단바 `NAV_ITEMS`에 '상점' 항목 추가(마이페이지 위/앞) |
| 카탈로그 규모 | 슬롯당 3개 내외 + 스티커 4종, 총 ~22개 |
| 아키텍처 | **A안: 코드 정의 카탈로그** — 아이템 정의는 백엔드 상수, DB는 구매·장착 기록만. 카탈로그 접근은 `ShopCatalog` 서비스로 단일화해 추후 DB 카탈로그(B안) 전환 시 구현체 교체만으로 가능하게 |
| 스티커 | 이번 사이클에 부착 기능까지 포함. 태스크/아이디어당 1개 |
| 에셋 | CC0 픽셀아트만 사용(Kenney, OpenGameArt, itch.io CC0 팩). 기존 CSS box-shadow 픽셀아트(행성·로켓·정거장)는 기본템 포함 전부 스프라이트로 교체 |

## 2. 백엔드

### 2.1 카탈로그 모델 (코드 상수)

```java
record ShopItem(String code, ItemType type, Slot slot, // slot은 THEME만, STICKER는 null
                String name, String description, int price, Tier tier)

enum ItemType { THEME, STICKER }
enum Slot { BACKGROUND, CHROME, POMODORO, PLANET, CELEBRATION, STATION }
enum Tier { COLOR, CONCEPT } // 색상 변형(저가) / 컨셉 테마(고가) — UI 배지·가격대 구분용
```

- 아이템 열쇠는 문자열 코드(`bg.ocean`, `sticker.heart` …). DB는 코드만 참조하므로 카탈로그 원본을 나중에 DB로 옮겨도 유저 데이터는 불변.
- `ShopCatalog` 서비스가 유일한 접근점: `getAll()`, `findByCode(code)`. 컨트롤러·다른 서비스에서 상수 직접 참조 금지.

### 2.2 DB 변경 (Flyway V3)

```sql
-- 상점이 열린 적 없어 실구매 데이터 없음 (적용 전 prod에서 0건 확인)
TRUNCATE TABLE user_purchases;
ALTER TABLE user_purchases DROP COLUMN item_id;
ALTER TABLE user_purchases ADD COLUMN item_code varchar(64) NOT NULL;
-- unique(user_id, item_code) 제약 재생성

CREATE TABLE user_equipments (
    equipment_id uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(user_id),
    slot         varchar(20) NOT NULL,
    item_code    varchar(64) NOT NULL,
    updated_at   timestamp,
    UNIQUE (user_id, slot)
);

ALTER TABLE tasks ADD COLUMN sticker_code varchar(64);
ALTER TABLE ideas ADD COLUMN sticker_code varchar(64);
```

- 장착 해제 = `user_equipments` 행 삭제 = 기본 테마 복귀.
- `UserPurchase` 엔티티는 `itemId:int` → `itemCode:String`으로 변경, `UserEquipment` 엔티티 신설, `Task`/`Idea`에 `stickerCode` 필드 추가.
- 로컬 DB에도 V3가 적용되는지 확인(ddl-auto:update는 칼럼 삭제·타입 변경을 못 하므로 로컬 드리프트 주의).

### 2.3 API

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/shop/catalog` | 전체 아이템 + `owned`/`equipped` 플래그 + 코인 잔액 |
| POST | `/shop/purchase` `{code}` | 존재·미보유·잔액 검증 → 차감+기록. **테마는 구매 즉시 자동 장착.** 응답에 잔여 코인 |
| PUT | `/shop/equip` `{code}` | THEME만. 보유 검증 후 해당 슬롯 upsert (슬롯은 카탈로그에서 유도) |
| DELETE | `/shop/equip/{slot}` | 해당 슬롯 기본 테마로 복귀 |

- 스티커 부착: 기존 태스크/아이디어 **수정 API에 `stickerCode` 필드 추가** (보유 검증, null = 제거). 조회 응답(플래닝 포함)에도 `stickerCode` 포함.
- 에러: 기존 패턴대로 400 + 한국어 메시지("코인이 부족합니다", "이미 보유한 아이템입니다", "보유하지 않은 아이템입니다" 등). 잔액 차감+구매 기록은 한 트랜잭션, 중복 구매는 unique 제약이 최종 방어.
- `/auth/me` 응답에 `equipments: {"BACKGROUND":"bg.ocean", …}` 맵 추가 → 프론트가 로그인 직후 테마 적용.
- 구 하드코딩 카탈로그(스티커 3종+테마 3종)는 폐기. `ShopController`는 새 구조로 재작성.

## 3. 프론트엔드

### 3.1 테마 적용 방식

- `<html>`에 슬롯별 데이터 속성: `data-skin-bg` / `data-skin-chrome` / `data-skin-pomodoro`. CSS는 스킨×모드 조합으로 정의:

```css
[data-skin-bg="ocean"] { --bg:…; --accent:…; }
[data-skin-bg="ocean"][data-theme="dark"] { --bg:…; }
```

- **선행 작업 — 전용 변수 분리**: 사이드바·헤더가 쓰는 색을 `--chrome-bg`·`--chrome-line`(기본값 = 기존 `--card`/`--line`)으로, 뽀모도로가 쓰는 색을 `--pomo-*`로 분리. 이래야 배경 테마와 독립 교체가 가능.
- 행성·완료 애니메이션·우주정거장은 **스프라이트 레지스트리**(`frontend/src/shop/registry.js`)로 교체: code → { 스프라이트 import, 프리뷰 이미지, 표시 이름 }. `OrbitProgress`/`RocketLaunch`/`PixelStation`이 장착 코드에 따라 스프라이트를 렌더. 기본템도 스프라이트로 리뉴얼(CSS box-shadow 픽셀아트 제거).
- 적용 시점: AuthContext가 `/auth/me`의 `equipments`를 받아 DOM 속성 반영 + localStorage 캐시(재방문 첫 페인트 번쩍임 방지). 로그아웃 시 초기화.

### 3.2 스티커 UI

- 태스크 행(`TaskListCard`)·아이디어 카드 제목 옆에 스티커 배지(작은 스프라이트, 16~20px).
- 행/카드의 스티커 버튼 → 팝오버: 보유 스티커 나열 + 제거 + "상점에서 더 보기" 링크. 보유 목록은 팝오버 열 때 `/shop/catalog` 지연 조회(캐시).
- 부착/제거는 낙관적 업데이트.

### 3.3 상점 페이지 (`/shop`)

- 상단: 보유 코인 + 짧은 안내.
- 슬롯별 섹션(배경 / 사이드바&상단바 / 뽀모도로 / 행성 / 완료 / 정거장 / 스티커).
- 아이템 카드: 미리보기(색상 테마 = 미니 팔레트 스와치, 그 외 = 스프라이트) + 이름 + 티어 배지 + 가격(코인 아이콘) + 상태 버튼:
  - 미보유 → `구매` (확인 모달: 가격·잔액 표시)
  - 보유·미장착 → `장착하기` / 보유·장착중 → `장착중` + `기본으로` (스티커는 `보유중` 표시만)
- 구매 성공 → 즉시 장착 반영 + 헤더 코인 잔액 갱신(AuthContext refresh).
- 진입점: 사이드바 `MENU`·상단바 `NAV_ITEMS`에 '상점'(마이페이지 위/앞), 헤더 코인 배지 툴팁 문구를 현행화("추후 열릴 코인샵…" → 상점 안내).
- SettingsModal "구매한 아이템" 섹션은 새 카탈로그 기준 표시로 갱신.

## 4. 카탈로그 초안 (~22개)

이름·최종 구성은 에셋 선별 결과로 구현 단계에서 확정하되, 슬롯별 개수와 가격대는 유지한다.

| 슬롯 | 구성 | 가격대 |
|---|---|---|
| 배경&주요색상 | COLOR 2 (오션, 라벤더) + CONCEPT 1 (새싹 정원) | 200 / 600 |
| 사이드바&상단바 | COLOR 2 + CONCEPT 1 | 150 / 400 |
| 뽀모도로 | COLOR 2 + CONCEPT 1 | 150 / 400 |
| 행성 | COLOR 2 (색 변형) + CONCEPT 1~2 (고리 행성 등) | 250 / 500 |
| 완료 애니메이션 | CONCEPT 3 (UFO, 별똥별 등) | 500~800 |
| 우주정거장 | COLOR 1 + CONCEPT 2 | 400~600 |
| 스티커 | 중요 · 하트 · 별 · 불꽃 | 80~120 |

기준: 코인 수입은 활발한 유저 하루 50~150 (할일 완료 10~50, 뽀모도로 25분당 5). 저가템은 하루치, 고가템은 일주일치 저축.

## 5. 에셋 전략

- **CC0 라이선스만 사용** — Kenney(전부 CC0), OpenGameArt·itch.io의 CC0 픽셀아트 팩에서 행성·로켓·UFO·우주정거장·스티커 아이콘 선별.
- 저장 위치: `frontend/src/assets/shop/` (빌드 해시 포함되도록 src 쪽). 픽셀 스프라이트는 `image-rendering: pixelated`로 업스케일, 필요 시 WebP 변환.
- 출처·라이선스는 `docs/ATTRIBUTIONS.md`에 기록(CC0라 표기 의무는 없으나 관리 목적).
- 색상 테마(팔레트)는 에셋이 아니라 CSS 변수 값 — 기존 라이트/다크 팔레트와 같은 감성(레트로, 채도 낮음)으로 슬롯당 2벌씩 설계.

## 6. 테스트·검증

- 백엔드 단위 테스트: 구매(미존재·중복·잔액 부족·성공 시 차감/기록/자동 장착), 장착(미보유 거부·슬롯 upsert·해제), 스티커 부착 검증(미보유 거부·null 제거).
- 프론트: `npm run lint` + 빌드 그린, dev 서버 육안 QA(테마 전환·다크모드 조합·구매 흐름·스티커 부착).
- 마이그레이션: 로컬 DB에 V3 적용 확인 후 백엔드 기동.

## 7. 범위 제외 (이번 사이클에서 안 함)

- 되팔기·환불, 기간 한정 판매, 할인.
- 어드민 카탈로그 CRUD (B안 — 구조만 대비).
- 태스크/아이디어당 스티커 여러 개.
- 코인 획득처 추가·이코노미 조정.

## 8. 리스크

- `user_purchases` 개편은 파괴적 — prod 실구매 0건 전제를 마이그레이션 전에 확인.
- 전용 변수 분리(`--chrome-*`, `--pomo-*`) 시 기본 테마 외관이 1픽셀도 안 변해야 함 — 분리 커밋을 독립시켜 육안 대조.
- CC0 에셋 픽셀 밀도가 기존 UI(4px 격자 감성)와 이질적일 수 있음 — 선별 시 16×16/32×32 위주로, 어울리지 않으면 교체.
