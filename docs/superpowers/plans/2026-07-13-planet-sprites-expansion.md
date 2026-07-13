# 행성 도트 리뉴얼 + 확장 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상점 행성 슬롯을 자체 제작 32×32 도트 15종(리드로우 4 + 신규 11, 태양·블랙홀 4프레임 애니)으로 리뉴얼·확장한다.

**Architecture:** Pillow 스크립트(`frontend/scripts/sprites/gen_planets.py`, 리포 커밋)가 PNG를 생성하고, 프론트는 신규 공용 컴포넌트 `PixelSprite`가 정지(`<img>`)/애니(background steps) 렌더를 분기한다. 백엔드는 `ShopCatalog` 상수 리스트에 11종 추가(카탈로그 26→37). 기존 4종은 코드 유지 + 이미지 교체라 마이그레이션 없음. 스펙: `docs/superpowers/specs/2026-07-13-planet-sprites-expansion-design.md`.

**Tech Stack:** Python 3.14 + Pillow 12.3(이 머신 설치 확인됨), React 19 + Vite, Spring Boot(Gradle, JDK21).

## Global Constraints

- 아트 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경, 본체 지름 ~28px(고리·플레어는 캔버스 꽉 채움).
- **다운스케일 제약: 핵심 디테일은 2×2px 클러스터 이상** (모바일에서 22px로 축소 표시됨).
- 정지 스프라이트 32×32, 애니 스프라이트 128×32(가로 4프레임, 각 32×32).
- 각 아트 태스크는 **8배 확대 미리보기 시트 사용자 검수 통과 후에만 커밋** (하드 게이트).
- 백엔드 테스트: `cd backend` 후 `$env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; ./gradlew test` (JDK21 필수 — 기본 java는 25라 JAVA_HOME 지정 필요).
- 프론트 검증: `npm run lint`, `npm run build` (테스트 러너 없음 — dev 서버 스모크로 보완).
- 커밋 메시지: 리포 관례 `Feat:`/`Test:`/`Chore:`/`Docs:` + 한국어 제목, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 푸터.
- 미리보기 시트 등 중간 산출물은 scratchpad에 생성(리포 오염 금지). 커밋 대상은 스크립트 + 최종 PNG만.

## 스프라이트 사양표 (전 태스크 공용 참조)

| 파일 | 크기 | 팔레트(밝은→어두운) | 구성 |
|---|---|---|---|
| planet_default.png | 32×32 | #7FD1C8 #3BA7A0 #2A7E7A #1F5F5C | 틸 구체. 좌상단 하이라이트, 가로 음영 밴드 2개. 앱 accent 틸과 조화 |
| planet_crimson.png | 32×32 | #E8837A #C94F4F #96343C #6E2430 | 진홍 구체 + 어두운 용암 균열 2~3줄(2px 폭) |
| planet_ice.png | 32×32 | #EAF7FA #BFE3EC #8FBFCF #6E9FB5 | 얼음 구체 + 각진 크리스탈 면 분할선 |
| planet_ringed.png | 32×32 | 본체 #B79BE0 #9A7BC8 #7A5CA8 / 고리 #E8C170 #B08A4A | 라벤더 구체(지름 ~20px) + 대각 고리(캔버스 폭 활용), 본체 위 고리 그림자 1px |
| planet_moon.png | 32×32 | #E8E8EE #C8C8D0 #9A9AA6 #75757F | 회백 구체 + 크레이터 3~4개(각 3~5px 원, 내부 어두운 톤+테두리 하이라이트) |
| planet_ocean.png | 32×32 | #7FB8E8 #3E7FC1 #2C5F96 #1E4470 | 물의 행성. 밝은 파도 곡선 무늬 2~3줄(2px), 작은 섬 1~2개 생략 가능 |
| planet_sprout.png | 32×32 | #8CD084 #5FA85A #3F7F42 / 흙 #8A6A4A | 초록 구체 + 윗면에서 돋아난 새싹(줄기 2px + 떡잎 2장), 새싹 정원 테마 세트감 |
| planet_earth.png | 32×32 | 바다 #3E6FB8 / 대륙 #57A05B #3F7F42 / 구름 #F2F6F8 | 푸른 구체 + 대륙 2~3덩이(3px+ 클러스터) + 구름 띠 1~2개 |
| planet_jupiter.png | 32×32 | #E8D5A8 #C9955C #A86B3C #7A4A28 / 대적점 #C14F3A | 가로 줄무늬 4~5밴드 + 우하단 대적점(3~4px 타원) |
| planet_blossom.png | 32×32 | 바탕 #E8A8C8 / 꽃잎 #F5D0E0 / 중심 #C86488 | 분홍 구체 + 5도트 꽃 클러스터 3~4개(중심 1px 진한색 + 꽃잎 4px), 로즈 테마 톤 |
| planet_candy.png | 32×32 | #F08CB4 #FDF3F6 #7FD1C8 | 소용돌이 줄무늬 3색 캔디(나선형 스트라이프), 캔디 타이머 세트감 |
| planet_galaxy.png | 32×32 | 팔 #8A63C4 #6A4A9C / 코어 #F5EDE0 #E8C170 | 원반형 나선은하: 밝은 코어 + 나선팔 2개 + 골드 별 점 3~4개. 구체 셰이딩 없음 |
| planet_whale.png | 32×32 | 등 #5B7FBF #43619C / 배 #C8D8F0 / 눈 #1E2A44 | 옆모습 픽셀 고래(몸통 가로 ~26px): 꼬리·지느러미·눈 2px·배 주름 1줄 |
| planet_sun.png | 128×32 | #FBE89A #F5C842 #F09030 #E86A2A | 코어 구체(지름 ~22px) 고정 + 프레임별 플레어 삐죽(2~3px)이 위치·길이 변화하며 명멸 (4프레임) |
| planet_blackhole.png | 128×32 | 중심 #0A0A12 / 원반 #E8C170 #E88A4A #8A63C4 | 검은 중심(지름 ~12px) + 강착원반 고리. 프레임별 원반의 밝은 핫스팟이 시계방향 90°씩 회전 (4프레임) |

---

### Task 1: 생성 스크립트 뼈대 + 리드로우 4종

**Files:**
- Create: `frontend/scripts/sprites/gen_planets.py`
- Modify(덮어쓰기): `frontend/src/assets/shop/planet_default.png`, `planet_crimson.png`, `planet_ice.png`, `planet_ringed.png`

**Interfaces:**
- Produces: `gen_planets.py`의 헬퍼 `new_canvas/disc/sphere_shade/save_sprite/build_preview_sheet`와 `SPRITES` dict — Task 2·3의 draw 함수가 여기 등록됨. PNG 4장(32×32, 기존 파일명 그대로 교체).

- [ ] **Step 1: 스크립트 뼈대 + 헬퍼 작성**

```python
# gen_planets.py — 상점 행성 32×32 도트 생성기
# 사용: python gen_planets.py            → frontend/src/assets/shop/에 PNG 저장
#       python gen_planets.py --preview  → 미리보기 시트만 지정 경로에 저장
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경 (스펙 2026-07-13 참조)
import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw

ASSET_DIR = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'shop'
SIZE = 32

def new_canvas(width=SIZE, height=SIZE):
    return Image.new('RGBA', (width, height), (0, 0, 0, 0))

def hx(code):
    code = code.lstrip('#')
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16), 255)

def disc(img, cx, cy, r, shader):
    """원 내부 픽셀 순회. shader(x, y, nx, ny) -> RGBA 또는 None (nx,ny는 -1~1 정규 좌표)."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                color = shader(x, y, dx / r, dy / r)
                if color is not None:
                    px[x, y] = color

def sphere_shade(palette):
    """좌상단 광원 기본 셰이더. palette는 밝은→어두운 3~4톤 리스트."""
    def shader(x, y, nx, ny):
        # 광원 방향(-0.5,-0.5)과의 거리로 톤 선택
        d = math.hypot(nx + 0.45, ny + 0.45)
        idx = min(int(d / 1.5 * len(palette)), len(palette) - 1)
        return palette[idx]
    return shader

def save_sprite(name, img):
    out = ASSET_DIR / f'{name}.png'
    img.save(out)
    print(f'saved {out} ({img.width}x{img.height})')

def build_preview_sheet(sprites, out_path, scale=8):
    """{이름: 이미지} → 라벨 붙은 8배 확대 시트 (검수용, scratchpad에 저장)."""
    cell_w = max(i.width for i in sprites.values()) * scale + 16
    cell_h = SIZE * scale + 34
    cols = 4
    rows = math.ceil(len(sprites) / cols)
    sheet = Image.new('RGBA', (cell_w * cols, cell_h * rows), (26, 26, 34, 255))
    drawer = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(sprites.items()):
        ox = (i % cols) * cell_w + 8
        oy = (i // cols) * cell_h + 8
        big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
        sheet.paste(big, (ox, oy), big)
        drawer.text((ox, oy + SIZE * scale + 6), name, fill=(230, 230, 230, 255))
    sheet.save(out_path)
    print(f'preview -> {out_path}')

# ---- 스프라이트별 draw 함수 (반환: RGBA Image) ----

def draw_default():
    img = new_canvas()
    pal = [hx('#7FD1C8'), hx('#3BA7A0'), hx('#2A7E7A'), hx('#1F5F5C')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    # 가로 음영 밴드 2개 — 셰이딩 위에 어두운 톤 덧칠
    band = sphere_shade([pal[2], pal[2], pal[3], pal[3]])
    disc(img, 16, 16, 14, lambda x, y, nx, ny: band(x, y, nx, ny) if y in (12, 13, 20, 21) else None)
    return img

SPRITES = {
    'planet_default': draw_default,
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT', help='미리보기 시트만 저장')
    args = parser.parse_args()
    rendered = {name: fn() for name, fn in SPRITES.items()}
    if args.preview:
        build_preview_sheet(rendered, args.preview)
        return
    for name, img in rendered.items():
        save_sprite(name, img)

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 리드로우 3종 draw 함수 추가** — `draw_crimson`(용암 균열), `draw_ice`(크리스탈 면), `draw_ringed`(구체 지름 ~20px + 대각 고리 + 본체 위 고리 그림자 1px)를 사양표 팔레트로 작성해 `SPRITES`에 등록. 균열·면 분할선은 좌표 리스트를 직접 찍는 방식(2px 폭 유지). 고리는 타원 방정식 픽셀 순회(두께 2~3px, 본체 뒤쪽은 그리지 않음).

- [ ] **Step 3: 미리보기 생성·확인**

Run: `python frontend/scripts/sprites/gen_planets.py --preview "<scratchpad>/planets_task1.png"`
Expected: 시트 PNG 생성. Read 도구로 열어 스스로 1차 확인(팔레트·실루엣·클러스터 규칙).

- [ ] **Step 4: 사용자 검수 (하드 게이트)** — 미리보기 시트를 사용자에게 보여주고 피드백 반영 반복. **컨펌 전 커밋 금지.** 기존 16×16 대비 인상이 유지되는지(같은 코드의 "같은 행성"으로 인식되는지) 명시적으로 확인.

- [ ] **Step 5: PNG 생성**

Run: `python frontend/scripts/sprites/gen_planets.py`
Expected: `frontend/src/assets/shop/planet_{default,crimson,ice,ringed}.png` 4장 덮어쓰기(32×32).

- [ ] **Step 6: 프론트 빌드 확인**

Run: `cd frontend; npm run build`
Expected: 성공 (기존 import 경로 그대로라 코드 변경 불필요).

- [ ] **Step 7: Commit**

```
git add frontend/scripts/sprites/gen_planets.py frontend/src/assets/shop/planet_default.png frontend/src/assets/shop/planet_crimson.png frontend/src/assets/shop/planet_ice.png frontend/src/assets/shop/planet_ringed.png
git commit -m "Feat: 행성 도트 생성 스크립트 + 기존 4종 32x32 리드로우"
```

---

### Task 2: 신규 정지 스프라이트 9종

**Files:**
- Modify: `frontend/scripts/sprites/gen_planets.py`
- Create: `frontend/src/assets/shop/planet_{moon,ocean,sprout,earth,jupiter,blossom,candy,galaxy,whale}.png`

**Interfaces:**
- Consumes: Task 1 헬퍼(`disc`, `sphere_shade`, `SPRITES` 등록 패턴).
- Produces: 32×32 PNG 9장 — Task 5의 registry import 대상. 파일명은 위 Create 목록 그대로.

- [ ] **Step 1: draw 함수 9종 작성** — 사양표의 팔레트·구성대로 `draw_moon/ocean/sprout/earth/jupiter/blossom/candy/galaxy/whale` 작성, `SPRITES`에 등록. 주의점:
  - 크레이터·꽃·대적점 등 포인트 디테일은 최소 2×2px (Global Constraints).
  - `galaxy`는 구체 셰이딩 없이 나선팔을 각도 함수(θ에 비례해 반지름 증가)로 찍고, `whale`은 좌우 비대칭 실루엣이므로 좌표 리스트 직접 정의가 깔끔함.
  - `sprout`의 새싹, `ringed`의 고리처럼 본체 밖으로 나가는 요소는 캔버스 32×32 안에서 해결(잘림 금지).

- [ ] **Step 2: 미리보기 생성·확인**

Run: `python frontend/scripts/sprites/gen_planets.py --preview "<scratchpad>/planets_task2.png"`
Expected: 13종 시트(Task 1 포함). Read로 1차 자체 검토.

- [ ] **Step 3: 사용자 검수 (하드 게이트)** — 9종 각각 컨셉 전달력 확인, 피드백 반영 반복. **컨펌 전 커밋 금지.**

- [ ] **Step 4: PNG 생성 + 크기 검증**

Run: `python frontend/scripts/sprites/gen_planets.py`
Expected: 신규 9장 생성. 이어서 PowerShell로 전 파일 32×32 확인:
`Add-Type -AssemblyName System.Drawing; Get-ChildItem frontend\src\assets\shop\planet_*.png | % { $i=[System.Drawing.Image]::FromFile($_.FullName); "$($_.Name): $($i.Width)x$($i.Height)"; $i.Dispose() }`

- [ ] **Step 5: Commit**

```
git add frontend/scripts/sprites/gen_planets.py frontend/src/assets/shop/planet_moon.png frontend/src/assets/shop/planet_ocean.png frontend/src/assets/shop/planet_sprout.png frontend/src/assets/shop/planet_earth.png frontend/src/assets/shop/planet_jupiter.png frontend/src/assets/shop/planet_blossom.png frontend/src/assets/shop/planet_candy.png frontend/src/assets/shop/planet_galaxy.png frontend/src/assets/shop/planet_whale.png
git commit -m "Feat: 신규 행성 도트 9종 (달·바다·식물·지구·목성·꽃·사탕·은하·고래)"
```

---

### Task 3: 애니 스프라이트 2종 (태양·블랙홀, 128×32)

**Files:**
- Modify: `frontend/scripts/sprites/gen_planets.py`
- Create: `frontend/src/assets/shop/planet_sun.png`, `frontend/src/assets/shop/planet_blackhole.png`

**Interfaces:**
- Consumes: Task 1 헬퍼.
- Produces: 128×32(가로 4프레임) PNG 2장. 프레임 1(x 0~31)이 정지 대표 컷 — reduced-motion과 상점 첫 노출에서 이 프레임이 보이므로 단독으로도 완성도 있어야 함.

- [ ] **Step 1: 프레임 합성 헬퍼 + draw 함수 2종 작성**

```python
def frames_sheet(frame_fns):
    """[fn, fn, ...] → 가로로 이어붙인 시트."""
    frames = [fn() for fn in frame_fns]
    sheet = Image.new('RGBA', (SIZE * len(frames), SIZE), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * SIZE, 0), f)
    return sheet

def draw_sun():
    def frame(k):  # k = 0..3
        img = new_canvas()
        pal = [hx('#FBE89A'), hx('#F5C842'), hx('#F09030'), hx('#E86A2A')]
        disc(img, 16, 16, 11, sphere_shade(pal))
        # 플레어: 8방향 삐죽, 프레임마다 길이 패턴이 교대로 바뀜 (명멸)
        for j, (dx, dy) in enumerate([(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]):
            length = 3 if (j + k) % 2 == 0 else 2
            norm = math.hypot(dx, dy)
            for step in range(length):
                r = 12 + step
                x, y = int(16 + dx / norm * r), int(16 + dy / norm * r)
                for ox in range(2):      # 2px 클러스터 유지
                    for oy in range(2):
                        if 0 <= x+ox < SIZE and 0 <= y+oy < SIZE:
                            img.load()[x+ox, y+oy] = pal[1] if step < 2 else pal[2]
        return img
    return frames_sheet([lambda k=k: frame(k) for k in range(4)])

def draw_blackhole():
    def frame(k):  # 핫스팟이 시계방향 90°씩 회전
        img = new_canvas()
        ring_pal = [hx('#E8C170'), hx('#E88A4A'), hx('#8A63C4')]
        hot_angle = k * (math.pi / 2)
        def shader(x, y, nx, ny):
            d = math.hypot(nx, ny)
            if d < 0.42:
                return hx('#0A0A12')                     # 사건의 지평선
            angle = (math.atan2(ny, nx) - hot_angle) % (2 * math.pi)
            idx = 0 if angle < math.pi * 0.5 else (1 if angle < math.pi * 1.2 else 2)
            return ring_pal[idx]
        disc(img, 16, 16, 14, shader)
        return img
    return frames_sheet([lambda k=k: frame(k) for k in range(4)])

SPRITES['planet_sun'] = draw_sun
SPRITES['planet_blackhole'] = draw_blackhole
```

- [ ] **Step 2: 미리보기 생성·확인** — 시트라 4프레임이 나란히 보임. 프레임 간 변화량(명멸·회전)이 읽히는지 확인.

Run: `python frontend/scripts/sprites/gen_planets.py --preview "<scratchpad>/planets_task3.png"`

- [ ] **Step 3: 사용자 검수 (하드 게이트)** — 프레임 연속성·프레임1 단독 완성도 확인. **컨펌 전 커밋 금지.**

- [ ] **Step 4: PNG 생성 + 크기 검증**

Run: `python frontend/scripts/sprites/gen_planets.py`
Expected: `planet_sun.png`, `planet_blackhole.png` 각 128×32 (Task 2 Step 4의 PowerShell로 확인).

- [ ] **Step 5: Commit**

```
git add frontend/scripts/sprites/gen_planets.py frontend/src/assets/shop/planet_sun.png frontend/src/assets/shop/planet_blackhole.png
git commit -m "Feat: 태양·블랙홀 4프레임 애니 도트 (128x32 시트)"
```

---

### Task 4: 백엔드 카탈로그 11종 추가 (TDD)

**Files:**
- Modify: `backend/src/main/java/com/dumpit/shop/ShopCatalog.java` (ITEMS 리스트)
- Test: `backend/src/test/java/com/dumpit/shop/ShopCatalogTest.java`, `backend/src/test/java/com/dumpit/api/ShopApiTest.java`

**Interfaces:**
- Produces: 카탈로그 코드 11종 — `planet.moon/ocean/sprout/earth/jupiter/blossom/candy/galaxy/whale/sun/blackhole` (전부 Slot PLANET, Tier CONCEPT). Task 5 registry 키와 정확히 일치해야 함.

- [ ] **Step 1: 테스트를 37로 갱신 (실패 확인용)**
  - `ShopCatalogTest.java`: `카탈로그는_26개_아이템을_가진다` → `카탈로그는_37개_아이템을_가진다`, `hasSize(26)`→`hasSize(37)` / `코드는_전부_유일하다`의 `hasSize(26)`→`hasSize(37)`.
  - `ShopApiTest.java`: 메서드명 `카탈로그_26종_반환_...`→`카탈로그_37종_반환_...`, L64 `hasSize(26)`→`hasSize(37)`, L112 `.value(26)`→`.value(37)`.

- [ ] **Step 2: 실패 확인**

Run: `cd backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; ./gradlew test --tests "com.dumpit.shop.ShopCatalogTest" --tests "com.dumpit.api.ShopApiTest"`
Expected: FAIL — expected size 37 but was 26 (3개 테스트).

- [ ] **Step 3: ShopCatalog.java에 11종 추가** — `planet.ringed` 행 바로 아래에 삽입:

```java
ShopItem.theme("planet.moon",      PLANET, "달",       "고요한 크레이터의 달이에요.",           400, CONCEPT),
ShopItem.theme("planet.ocean",     PLANET, "바다 행성",  "파도가 일렁이는 물의 행성이에요.",       450, CONCEPT),
ShopItem.theme("planet.sprout",    PLANET, "식물 행성",  "새싹이 자라나는 초록 행성이에요.",       450, CONCEPT),
ShopItem.theme("planet.earth",     PLANET, "지구",      "우리가 사는 푸른 행성이에요.",           500, CONCEPT),
ShopItem.theme("planet.jupiter",   PLANET, "목성",      "대적점 소용돌이의 거대 행성이에요.",     500, CONCEPT),
ShopItem.theme("planet.blossom",   PLANET, "꽃 행성",   "꽃잎으로 뒤덮인 향기로운 행성이에요.",    500, CONCEPT),
ShopItem.theme("planet.candy",     PLANET, "사탕 행성",  "달콤한 소용돌이 사탕 행성이에요.",       500, CONCEPT),
ShopItem.theme("planet.galaxy",    PLANET, "나선 은하",  "소용돌이치는 나선 은하예요.",           600, CONCEPT),
ShopItem.theme("planet.whale",     PLANET, "우주 고래",  "궤도를 유영하는 우주 고래예요.",         800, CONCEPT),
ShopItem.theme("planet.sun",       PLANET, "태양",      "이글이글 타오르는 태양이에요.",          800, CONCEPT),
ShopItem.theme("planet.blackhole", PLANET, "블랙홀",    "모든 빛을 삼키는 블랙홀이에요.",        1000, CONCEPT),
```

- [ ] **Step 4: 통과 확인 (전체)**

Run: `cd backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; ./gradlew test`
Expected: 전체 PASS (기존 278개 + 카운트 단언 변경분. 쿼리카운트 상한 테스트는 카탈로그가 인메모리라 37종에도 영향 없음 — L114 주석 근거).

- [ ] **Step 5: Commit**

```
git add backend/src/main/java/com/dumpit/shop/ShopCatalog.java backend/src/test/java/com/dumpit/shop/ShopCatalogTest.java backend/src/test/java/com/dumpit/api/ShopApiTest.java
git commit -m "Feat: 상점 행성 슬롯 신규 11종 카탈로그 추가 (26->37)"
```

---

### Task 5: PixelSprite 컴포넌트 + registry 15종 + 소비처 교체

**Files:**
- Create: `frontend/src/components/PixelSprite.jsx`
- Modify: `frontend/src/shop/registry.js`, `frontend/src/components/OrbitProgress.jsx:31-40`, `frontend/src/pages/ShopPage.jsx:83-98`(ItemPreview), `frontend/src/index.css`(keyframes + reduced-motion)

**Interfaces:**
- Consumes: Task 1~3의 PNG 15장, Task 4의 카탈로그 코드(registry 키로 동일 문자열 사용).
- Produces: `PixelSprite({ sprite, className, style })` — sprite는 registry 엔트리 `{ name, img, frames?, fps? }`. `frames` 존재 시 애니 div, 아니면 `<img>`.

- [ ] **Step 1: registry.js 확장** — 신규 11 import + PLANET_SPRITES를 15종으로:

```js
import planetMoon from '../assets/shop/planet_moon.png'
import planetOcean from '../assets/shop/planet_ocean.png'
import planetSprout from '../assets/shop/planet_sprout.png'
import planetEarth from '../assets/shop/planet_earth.png'
import planetJupiter from '../assets/shop/planet_jupiter.png'
import planetBlossom from '../assets/shop/planet_blossom.png'
import planetCandy from '../assets/shop/planet_candy.png'
import planetGalaxy from '../assets/shop/planet_galaxy.png'
import planetWhale from '../assets/shop/planet_whale.png'
import planetSun from '../assets/shop/planet_sun.png'
import planetBlackhole from '../assets/shop/planet_blackhole.png'

export const PLANET_SPRITES = {
  default: { name: '기본 행성', img: planetDefault },
  'planet.crimson': { name: '진홍 행성', img: planetCrimson },
  'planet.ice': { name: '얼음 행성', img: planetIce },
  'planet.ringed': { name: '고리 행성', img: planetRinged },
  'planet.moon': { name: '달', img: planetMoon },
  'planet.ocean': { name: '바다 행성', img: planetOcean },
  'planet.sprout': { name: '식물 행성', img: planetSprout },
  'planet.earth': { name: '지구', img: planetEarth },
  'planet.jupiter': { name: '목성', img: planetJupiter },
  'planet.blossom': { name: '꽃 행성', img: planetBlossom },
  'planet.candy': { name: '사탕 행성', img: planetCandy },
  'planet.galaxy': { name: '나선 은하', img: planetGalaxy },
  'planet.whale': { name: '우주 고래', img: planetWhale },
  'planet.sun': { name: '태양', img: planetSun, frames: 4, fps: 5 },
  'planet.blackhole': { name: '블랙홀', img: planetBlackhole, frames: 4, fps: 5 },
}
```

- [ ] **Step 2: PixelSprite.jsx 작성**

```jsx
// 도트 스프라이트 공용 렌더러 — frames 메타가 있으면 시트 애니, 없으면 정지 img.
// 애니는 가로 4프레임 시트 전제 (keyframes pixel-sprite-4, index.css).
export default function PixelSprite({ sprite, className = '', style }) {
  if (!sprite) return null
  if (!sprite.frames) {
    return (
      <img
        src={sprite.img}
        alt=""
        className={className}
        style={{ imageRendering: 'pixelated', ...style }}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={`pixel-sprite-anim ${className}`}
      style={{
        backgroundImage: `url(${sprite.img})`,
        backgroundSize: `${sprite.frames * 100}% 100%`,
        imageRendering: 'pixelated',
        animationDuration: `${sprite.frames / (sprite.fps ?? 5)}s`,
        ...style,
      }}
    />
  )
}
```

- [ ] **Step 3: index.css에 keyframes + reduced-motion**

```css
/* 도트 시트 애니 — 4프레임 전용: steps(4)가 0/33.33/66.67/100% 위치 = 프레임 1~4 */
.pixel-sprite-anim {
  animation: pixel-sprite-4 0.8s steps(4) infinite;
}
@keyframes pixel-sprite-4 {
  from { background-position-x: 0%; }
  to { background-position-x: 133.3333%; }
}
```

기존 `prefers-reduced-motion` 블록에 `.pixel-sprite-anim { animation: none; }` 추가(첫 프레임 고정).

- [ ] **Step 4: OrbitProgress.jsx 교체** — 기존 `<img …>`(L31-40)를:

```jsx
<PixelSprite
  sprite={spriteFor(PLANET_SPRITES, user?.equipments?.PLANET)}
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
  style={{
    width: 'calc(var(--orbit-size) * 0.34375)',
    height: 'calc(var(--orbit-size) * 0.34375)',
  }}
/>
```

import 추가: `import PixelSprite from './PixelSprite'`.

- [ ] **Step 5: ShopPage ItemPreview 교체** — L90-97의 `<img …>`를 `<PixelSprite sprite={sprite} className="w-10 h-10 flex-shrink-0" />`로 (정지분엔 `object-contain`이 필요 없어짐 — 스프라이트 전부 정방형). import 추가.

- [ ] **Step 6: lint + build**

Run: `cd frontend; npm run lint; npm run build`
Expected: 둘 다 성공.

- [ ] **Step 7: dev 서버 스모크** — `npm run dev` 후 확인:
  - 대시보드 히어로 행성 표시(창 폭 줄여 22px 축소 품질 확인).
  - 상점 행성 섹션 15종 미리보기 + 태양·블랙홀 카드에서 애니 재생.
  - 태양 또는 블랙홀 구매→장착→히어로에서 애니 재생.
  - OS 모션 감소 설정(또는 DevTools 에뮬레이션)에서 애니 정지·첫 프레임 표시.

- [ ] **Step 8: Commit**

```
git add frontend/src/components/PixelSprite.jsx frontend/src/shop/registry.js frontend/src/components/OrbitProgress.jsx frontend/src/pages/ShopPage.jsx frontend/src/index.css
git commit -m "Feat: PixelSprite 공용 렌더러 + 행성 registry 15종 확장"
```

---

### Task 6: ATTRIBUTIONS 갱신 + 최종 검증

**Files:**
- Modify: `docs/ATTRIBUTIONS.md`

**Interfaces:**
- Consumes: 전 태스크 산출물.

- [ ] **Step 1: ATTRIBUTIONS.md 행성 4행 교체** — 표의 `planet_*.png` 4행을 삭제하고 아래 1행으로 대체(신규 11종 포함):

```markdown
| planet_*.png (15종) | (자체 제작) | — | — | Pillow 스크립트 제작 (frontend/scripts/sprites/gen_planets.py) |
```

peony 팩 행(완료축하·정거장·별 스티커·패턴)과 출처 링크 절은 유지 — 상점 하단 크레딧 표기도 그대로.

- [ ] **Step 2: 전체 검증**

Run: `cd backend; $env:JAVA_HOME = 'C:\Program Files\RedHat\java-21-openjdk-21.0.10.0.7-1'; ./gradlew test` → 전체 PASS
Run: `cd frontend; npm run lint; npm run build` → 성공

- [ ] **Step 3: Commit**

```
git add docs/ATTRIBUTIONS.md
git commit -m "Docs: 행성 도트 자체 제작 전환 출처 갱신"
```

- [ ] **Step 4: 계획 체크박스 최종 갱신 + 메모리의 main 배포 스모크 목록에 '상점 행성 15종·애니' 항목 반영**

---

## 배포 메모

- 기존 구매자(planet.crimson/ice/ringed)는 코드 유지라 마이그레이션 없음 — 이미지가 32×32로 자동 업그레이드.
- main 배포 시 스모크: 히어로 행성 표시, 상점 15종 렌더, 태양·블랙홀 애니, reduced-motion 정지.
