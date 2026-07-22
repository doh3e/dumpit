# gen_stickers.py — 상점 스티커 16×16 도트 생성기
# 사용: python gen_stickers.py                    → frontend/src/assets/shop/에 PNG 저장
#       python gen_stickers.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경 (gen_stations.py 규약과 동일)
# 세트 통일 규칙(2026-07-22): 단색 실루엣 + 공통 베벨(위·왼쪽 가장자리 light, 아래·오른쪽 dark),
# 획 굵기 3px, 본체 크기 12~13px, 팔레트는 초록/빨강 2벌만 사용
import argparse
from pathlib import Path
from PIL import Image

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'shop'
SIZE = 16


def new_canvas(width=SIZE, height=SIZE):
    return Image.new('RGBA', (width, height), (0, 0, 0, 0))


def hx(code):
    code = code.lstrip('#')
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16), 255)


def put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.load()[x, y] = color


def block(img, x, y, color, w=2, h=2):
    for ox in range(w):
        for oy in range(h):
            put(img, x + ox, y + oy, color)


def stroke(img, points, color, thick=2):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for s in range(steps + 1):
            x = round(x0 + (x1 - x0) * s / steps)
            y = round(y0 + (y1 - y0) * s / steps)
            block(img, x, y, color, thick, thick)


def disc(img, cx, cy, r, color):
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                put(img, x, y, color)


def annulus(img, cx, cy, r_out, r_in, color):
    """단색 링 — 명암은 bevel()이 입힌다.
    r_out 6.6은 상하좌우 정중앙에 2px 혹이 삐져나옴(경계값 6.52) — 6.5 사용."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r_in * r_in <= d2 <= r_out * r_out:
                put(img, x, y, color)


def bevel(img, light, dark):
    """세트 공통 명암 — 위/왼쪽이 빈 픽셀은 light, 아니면서 아래/오른쪽이 빈 픽셀은 dark."""
    px = img.load()
    w, h = img.width, img.height

    def empty(x, y):
        return x < 0 or y < 0 or x >= w or y >= h or px[x, y][3] == 0

    lights, darks = [], []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            if empty(x, y - 1) or empty(x - 1, y):
                lights.append((x, y))
            elif empty(x, y + 1) or empty(x + 1, y):
                darks.append((x, y))
    for p in lights:
        px[p] = light
    for p in darks:
        px[p] = dark


GREEN = (hx('#8FD97A'), hx('#5FBF4A'), hx('#3F9433'))  # light, base, dark
RED = (hx('#F08A8A'), hx('#E05252'), hx('#B03A3A'))
STEM = hx('#2F6B27')


def sticker_check():
    img = new_canvas()
    light, base, dark = GREEN
    stroke(img, [(2, 8), (5, 12), (12, 3)], base, thick=3)
    bevel(img, light, dark)
    return img


def sticker_circle():
    img = new_canvas()
    light, base, dark = RED
    annulus(img, 8, 8, 6.5, 3.5, base)  # 두께 3px — 엑스(thick=3)와 통일
    bevel(img, light, dark)
    return img


def sticker_cross():
    img = new_canvas()
    light, base, dark = RED
    stroke(img, [(2, 2), (11, 11)], base, thick=3)
    stroke(img, [(11, 2), (2, 11)], base, thick=3)
    bevel(img, light, dark)
    return img


def sticker_clover():
    img = new_canvas()
    light, base, dark = GREEN
    px = img.load()
    # 잎 4장 = 5×5 사각 + 십자 갭 1px. 바깥쪽 모서리 3개만 컷(둥근 잎),
    # 중심을 향한 모서리는 남겨 잎들이 가운데(7,7) 매듭으로 모이는 클로버 실루엣.
    # 베벨이 잎마다 따로 걸려 잎 경계가 또렷하다.
    center = (7, 7)
    for x0, y0 in [(2, 2), (8, 2), (2, 8), (8, 8)]:
        block(img, x0, y0, base, 5, 5)
        corners = [(x0, y0), (x0 + 4, y0), (x0, y0 + 4), (x0 + 4, y0 + 4)]
        inner = min(corners, key=lambda c: abs(c[0] - center[0]) + abs(c[1] - center[1]))
        for c in corners:
            if c != inner:
                px[c] = (0, 0, 0, 0)  # 바깥 모서리 컷 → 둥근 잎
    bevel(img, light, dark)
    px[center] = STEM                                # 중심 매듭
    stroke(img, [(7, 13), (9, 15)], STEM, thick=1)   # 줄기 — 중심 아래서 우하단으로
    return img


SPRITES = {
    'sticker_check.png': sticker_check,
    'sticker_circle.png': sticker_circle,
    'sticker_cross.png': sticker_cross,
    'sticker_clover.png': sticker_clover,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', metavar='OUT')
    args = ap.parse_args()
    imgs = {name: fn() for name, fn in SPRITES.items()}
    if args.preview:
        scale, pad = 8, 8
        cell = SIZE * scale + pad
        sheet = Image.new('RGBA', (len(imgs) * cell + pad, cell + pad), (30, 30, 40, 255))
        for i, (name, im) in enumerate(imgs.items()):
            big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            sheet.paste(big, (pad + i * cell, pad), big)
        sheet.save(args.preview)
        print(f'preview -> {args.preview}')
        return
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for name, im in imgs.items():
        im.save(ASSET_DIR / name)
        print(f'saved -> {ASSET_DIR / name}')


if __name__ == '__main__':
    main()
