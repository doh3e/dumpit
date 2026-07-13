# gen_patterns.py — 배경 패턴(96×96) + 크롬 엣지 장식(24×24) 도트 타일 생성기
# 사용: python gen_patterns.py            → frontend/src/assets/shop/에 PNG 저장
#       python gen_patterns.py --preview OUT.png  → 실톤 합성 미리보기(검수용)
# 원칙: 저대비(본문 가독성 방해 금지), 세로 연속형 타일은 상하 경계 접점 일치
# (스펙: docs/superpowers/specs/2026-07-13-theme-crossslot-design.md)
import argparse
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

from gen_planets import hx, put, block, ASSET_DIR

PATTERN_SIZE = 96
DECO_SIZE = 48  # 크롬 전면 산포 타일 — 엣지 스트립은 '금 간 줄'로 오독돼 전면 패턴으로 전환 (2026-07-13 검수)

# 합성 미리보기용 실제 스킨 톤 (라이트/다크: bg 패턴은 --bg, 크롬 장식은 --chrome-bg)
BASE_TONES = {
    'pattern_wood': ('#F1E5D2', '#241B10'),
    'pattern_candy': ('#F7E7EE', '#2A1722'),
    'pattern_sprout': ('#EAF2E3', '#1B2617'),   # 기존 패턴 톤 검수용
    'pattern_galaxy': ('#E9EAF6', '#151329'),
    'deco_sprout': ('#EAF2E3', '#26351F'),
    'deco_galaxy': ('#E9EAF6', '#201D3D'),
    'deco_wood': ('#F1E5D2', '#2A2118'),
    'deco_candy': ('#F7E7EE', '#3A2230'),
}


def canvas(size):
    return Image.new('RGBA', (size, size), (0, 0, 0, 0))


# ---- 배경 패턴 (96×96) ----

def pattern_wood(dark):
    # 세로 나뭇결 — 가는 결 라인(지터) + 옹이 2개, 상하 경계 접점 일치
    img = canvas(PATTERN_SIZE)
    grain = hx('#3B2F1E') if dark else hx('#E7D5B8')
    knot = hx('#4E3F2A') if dark else hx('#D6BE97')
    rng = random.Random(7)
    for gx in (10, 26, 44, 61, 78):
        jitter = rng.choice([0, 1, 2])
        x = gx
        for y in range(PATTERN_SIZE):
            # 6px마다 지터가 바뀌되 y=0과 y=96의 x가 같도록 사인 기반
            offset = round(math.sin((y / PATTERN_SIZE) * 2 * math.pi + jitter) * 1.5)
            if y % 3 != 2:  # 점선 결 — 촘촘하면 과함
                put(img, x + offset, y, grain)
    # 옹이 — 작은 동심 타원
    for (kx, ky) in ((35, 22), (69, 66)):
        for t in range(0, 360, 12):
            ex = round(kx + 4 * math.cos(math.radians(t)))
            ey = round(ky + 2.5 * math.sin(math.radians(t)))
            put(img, ex, ey, knot)
        put(img, kx, ky, knot)
    return img


def pattern_candy(dark):
    # 스프링클 — 3방향 막대 + 도트, 분홍·민트·크림 저밀도 산포
    img = canvas(PATTERN_SIZE)
    if dark:
        colors = [hx('#6E4258'), hx('#3E6E66'), hx('#5E4A50')]
    else:
        colors = [hx('#F2B8CD'), hx('#A8DCD4'), hx('#EFE0C8')]
    rng = random.Random(11)
    spots = [(8, 12), (34, 6), (70, 14), (20, 38), (56, 32), (86, 44),
             (10, 66), (44, 60), (74, 78), (28, 86)]
    for i, (sx, sy) in enumerate(spots):
        color = colors[i % 3]
        kind = rng.choice(['h', 'v', 'd', 'dot'])
        if kind == 'h':
            block(img, sx, sy, color, 5, 2)
        elif kind == 'v':
            block(img, sx, sy, color, 2, 5)
        elif kind == 'd':
            for s in range(4):
                block(img, sx + s, sy + s, color, 2, 1)
        else:
            block(img, sx, sy, color, 2, 2)
    return img


# ---- 크롬 엣지 장식 (24×24) ----

def _leaf_sprig(img, x, y, stem, leaf, flip=1):
    """덩굴 조각 — 짧은 휜 줄기 + 잎 2장."""
    for s in range(5):
        put(img, x + s * flip, y - (s // 2), stem)
    block(img, x + 2 * flip, y - 4, leaf, 2, 2)
    block(img, x + 5 * flip, y - 1, leaf, 2, 2)


def deco_sprout(dark):
    # 덩굴 잎 산포 — 전면 타일 (저대비·저밀도: 덩굴 조각 1 + 낱잎 1)
    # 메뉴 글자 가독성 피드백(2026-07-13)으로 배경톤에 근접한 색 + 밀도 절반
    img = canvas(DECO_SIZE)
    stem = hx('#31422A') if dark else hx('#D3E3C0')
    leaf = hx('#3A5030') if dark else hx('#C2D8A9')
    _leaf_sprig(img, 10, 16, stem, leaf, 1)
    block(img, 34, 38, leaf, 2, 2)
    return img


def deco_galaxy(dark):
    # 별무리 산포 — 십자 반짝이 1 + 점 별 3
    img = canvas(DECO_SIZE)
    star = hx('#7A82C9') if dark else hx('#B4BAE0')
    gold = hx('#D9A83E') if dark else hx('#D0A64E')
    cx, cy = 14, 10
    for (ox, oy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        put(img, cx + ox, cy + oy, star)
    block(img, 34, 22, gold, 1, 1)
    put(img, 8, 34, star)
    put(img, 38, 40, star)
    put(img, 24, 44, star)
    return img


def deco_wood(dark):
    # 은은한 세로 나뭇결 — 전면 (chrome 톤, 배경 패턴보다 성김)
    img = canvas(DECO_SIZE)
    line = hx('#3A2E20') if dark else hx('#E3D2B2')
    node = hx('#463828') if dark else hx('#D6BE97')
    for gx, phase in ((10, 0.0), (26, 2.1), (40, 4.2)):
        for y in range(DECO_SIZE):
            offset = round(math.sin((y / DECO_SIZE) * 2 * math.pi + phase) * 1.5)
            if y % 3 != 2:
                put(img, gx + offset, y, line)
    for t in range(0, 360, 20):
        put(img, round(20 + 3 * math.cos(math.radians(t))), round(30 + 2 * math.sin(math.radians(t))), node)
    return img


def deco_candy(dark):
    # 스프링클 산포 — 전면 타일
    img = canvas(DECO_SIZE)
    if dark:
        colors = [hx('#8E5670'), hx('#4E8A80'), hx('#6E5860')]
    else:
        colors = [hx('#E8A8C4'), hx('#8FCEC4'), hx('#E5D2B8')]
    for s in range(3):
        block(img, 6 + s, 8 + s, colors[0], 2, 1)
    for s in range(3):
        block(img, 30 + s, 20 + s, colors[1], 2, 1)
    block(img, 14, 34, colors[2], 2, 2)
    block(img, 38, 42, colors[0], 2, 5)
    put(img, 42, 10, colors[1])
    put(img, 22, 44, colors[0])
    return img


TILES = {
    'pattern_wood_light': lambda: pattern_wood(False),
    'pattern_wood_dark': lambda: pattern_wood(True),
    'pattern_candy_light': lambda: pattern_candy(False),
    'pattern_candy_dark': lambda: pattern_candy(True),
    'deco_sprout_light': lambda: deco_sprout(False),
    'deco_sprout_dark': lambda: deco_sprout(True),
    'deco_galaxy_light': lambda: deco_galaxy(False),
    'deco_galaxy_dark': lambda: deco_galaxy(True),
    'deco_wood_light': lambda: deco_wood(False),
    'deco_wood_dark': lambda: deco_wood(True),
    'deco_candy_light': lambda: deco_candy(False),
    'deco_candy_dark': lambda: deco_candy(True),
}


def composite_cell(tile, base_hex, w, h, scale=2):
    """타일을 실톤 배경 위에 타일링해 확대 — 검수는 실사용 모습으로."""
    base = Image.new('RGBA', (w, h), hx(base_hex))
    for ty in range(0, h, tile.height):
        for tx in range(0, w, tile.width):
            base.paste(tile, (tx, ty), tile)
    return base.resize((w * scale, h * scale), Image.NEAREST)


def build_preview(out_path):
    pad, label_h = 10, 26
    cells = []
    # 배경 패턴(기존 포함): 192×96 영역 타일링
    for name in ('pattern_sprout', 'pattern_galaxy', 'pattern_wood', 'pattern_candy'):
        light_hex, dark_hex = BASE_TONES[name]
        for mode, base in (('light', light_hex), ('dark', dark_hex)):
            key = f'{name}_{mode}'
            tile = TILES[key]() if key in TILES else Image.open(ASSET_DIR / f'{key}.png').convert('RGBA')
            cells.append((key, composite_cell(tile, base, 192, 96, 2)))
    # 크롬 장식: 사이드바 목업(112×216) + 상단바 목업(288×48) 전면 타일링
    for name in ('deco_sprout', 'deco_galaxy', 'deco_wood', 'deco_candy'):
        light_hex, dark_hex = BASE_TONES[name]
        for mode, base in (('light', light_hex), ('dark', dark_hex)):
            key = f'{name}_{mode}'
            tile = TILES[key]()
            v = composite_cell(tile, base, 112, 216, 2)
            h = composite_cell(tile, base, 288, 48, 2)
            combo = Image.new('RGBA', (max(v.width + h.width + 12, 1), max(v.height, h.height)), (26, 26, 34, 255))
            combo.paste(v, (0, 0))
            combo.paste(h, (v.width + 12, 0))
            cells.append((key, combo))
    row_w = max(c.width for _, c in cells) + pad * 2
    cols = 2
    rows = math.ceil(len(cells) / cols)
    cell_h = max(c.height for _, c in cells) + label_h + pad
    sheet = Image.new('RGBA', (row_w * cols, cell_h * rows), (26, 26, 34, 255))
    drawer = ImageDraw.Draw(sheet)
    for i, (name, cell) in enumerate(cells):
        ox = (i % cols) * row_w + pad
        oy = (i // cols) * cell_h + pad
        sheet.paste(cell, (ox, oy))
        drawer.text((ox, oy + cell.height + 4), name, fill=(230, 230, 230, 255))
    sheet.save(out_path)
    print(f'preview -> {out_path}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT', help='합성 미리보기만 저장')
    args = parser.parse_args()
    if args.preview:
        build_preview(args.preview)
        return
    for name, fn in TILES.items():
        img = fn()
        img.save(ASSET_DIR / f'{name}.png')
        print(f'saved {ASSET_DIR / name}.png ({img.width}x{img.height})')


if __name__ == '__main__':
    main()
