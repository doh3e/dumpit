# gen_stickers.py — 상점 스티커 16×16 도트 생성기
# 사용: python gen_stickers.py                    → frontend/src/assets/shop/에 PNG 저장
#       python gen_stickers.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경 (gen_stations.py 규약과 동일)
import argparse
import math
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


def ring(img, cx, cy, r_out, r_in, base, light, dark):
    """링. 좌상단 호는 light, 우하단 호는 dark (좌상단 광원)."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r_in * r_in <= d2 <= r_out * r_out:
                ang = math.atan2(dy, dx)  # 우측 0, 위쪽 음수
                if -3.05 < ang < -1.2:
                    put(img, x, y, light)
                elif 0.1 < ang < 1.95:
                    put(img, x, y, dark)
                else:
                    put(img, x, y, base)


def sticker_check():
    img = new_canvas()
    light, green, dark = hx('#8FD97A'), hx('#5FBF4A'), hx('#3F9433')
    pts = [(2, 8), (6, 12), (13, 3)]
    stroke(img, [(x, y + 1) for x, y in pts], dark, thick=3)  # 아래층 음영
    stroke(img, pts, green, thick=3)
    stroke(img, [(6, 9), (13, 3)], light, thick=1)            # 긴 획 상단 하이라이트
    return img


def sticker_circle():
    img = new_canvas()
    ring(img, 8, 8, 6.6, 4.4, hx('#E05252'), hx('#F08A8A'), hx('#B03A3A'))
    return img


def sticker_cross():
    img = new_canvas()
    base, light, dark = hx('#E05252'), hx('#F08A8A'), hx('#B03A3A')
    stroke(img, [(3, 4), (11, 12)], dark, thick=3)
    stroke(img, [(11, 4), (3, 12)], dark, thick=3)
    stroke(img, [(3, 3), (11, 11)], base, thick=3)
    stroke(img, [(11, 3), (3, 11)], base, thick=3)
    stroke(img, [(3, 3), (6, 6)], light, thick=1)             # 좌상단 하이라이트
    return img


def sticker_clover():
    img = new_canvas()
    light, green, dark, stem = hx('#86CC72'), hx('#57A845'), hx('#3C7F31'), hx('#2F6B27')
    disc(img, 4.7, 3.3, 3.5, light)    # 좌상 잎 (광원측)
    disc(img, 11.3, 3.3, 3.5, green)   # 우상 잎
    disc(img, 4.7, 9.9, 3.5, green)    # 좌하 잎
    disc(img, 11.3, 9.9, 3.5, dark)    # 우하 잎 (음영측)
    block(img, 7, 6, stem, 2, 2)       # 중심 매듭 (줄기색으로 잎 경계 강조)
    stroke(img, [(8, 12), (9, 15)], stem, thick=1)  # 줄기 (잎 아래 여백 확보)
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
