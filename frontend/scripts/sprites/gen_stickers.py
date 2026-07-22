# gen_stickers.py — 상점 스티커 16×16 도트 생성기 (8종 전체 자체 제작)
# 사용: python gen_stickers.py                    → frontend/src/assets/shop/에 PNG 저장
#       python gen_stickers.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 투명 배경 (gen_stations.py 규약과 동일)
# 세트 통일 규칙(2026-07-22): 꽉 찬 단색 실루엣 + 공통 베벨(위·왼쪽 가장자리 light,
# 아래·오른쪽 dark), 획 굵기 3px, 본체 12~14px, 스티커별 계열색 1벌(light/base/dark 3톤).
# 별·불꽃 등 밝은 계열도 dark 베벨 테두리가 생겨 라이트 모드에서 형태가 살아남는다.
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


def annulus(img, cx, cy, r_out, r_in, color):
    """단색 링 — 명암은 bevel()이 입힌다.
    r_out 6.6은 상하좌우 정중앙에 2px 혹이 삐져나옴(경계값 6.52) — 6.5 사용."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r_in * r_in <= d2 <= r_out * r_out:
                put(img, x, y, color)


def poly(img, pts, color):
    """다각형 채움 — 픽셀 중심 짝홀(ray casting) 판정"""
    n = len(pts)
    for y in range(img.height):
        for x in range(img.width):
            px_, py_ = x + 0.5, y + 0.5
            inside = False
            j = n - 1
            for i in range(n):
                xi, yi = pts[i]
                xj, yj = pts[j]
                if (yi > py_) != (yj > py_) and px_ < (xj - xi) * (py_ - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            if inside:
                put(img, x, y, color)


def pixmap(img, rows, ox, oy, color):
    """문자열 픽셀맵('X'=칠함) — 16px에서 다각형 근사가 뭉개지는 별·불꽃용"""
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch == 'X':
                put(img, ox + dx, oy + dy, color)


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


# light, base, dark
GREEN = (hx('#8FD97A'), hx('#5FBF4A'), hx('#3F9433'))    # 체크·클로버
RED = (hx('#F08A8A'), hx('#E05252'), hx('#B03A3A'))      # 동그라미·엑스·중요!
PINK = (hx('#F7B8C6'), hx('#EE8FA4'), hx('#C75D77'))     # 하트
GOLD = (hx('#F9DF8B'), hx('#EDBE45'), hx('#B5851E'))     # 별 — 라이트 모드 가독용 딥 골드
ORANGE = (hx('#F5B76B'), hx('#E8863C'), hx('#B85A20'))   # 불꽃
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
    # 디스크 겹침 실루엣 — 잎이 꽉 찬 통통한 클로버. 명암은 세트 공통 베벨만.
    disc(img, 4.7, 3.3, 3.5, base)
    disc(img, 11.3, 3.3, 3.5, base)
    disc(img, 4.7, 9.9, 3.5, base)
    disc(img, 11.3, 9.9, 3.5, base)
    bevel(img, light, dark)
    block(img, 7, 6, STEM, 2, 2)                     # 중심 매듭 (잎 경계 강조)
    stroke(img, [(8, 12), (9, 15)], STEM, thick=1)   # 줄기
    return img


def sticker_heart():
    img = new_canvas()
    light, base, dark = PINK
    disc(img, 5.4, 5.6, 3.5, base)                    # 왼쪽 봉우리
    disc(img, 10.6, 5.6, 3.5, base)                   # 오른쪽 봉우리
    poly(img, [(2.4, 7.2), (13.6, 7.2), (8.0, 14.4)], base)  # 아래 뾰족
    bevel(img, light, dark)
    return img


def sticker_important():
    img = new_canvas()
    light, base, dark = RED
    poly(img, [(4.8, 2.0), (11.2, 2.0), (9.4, 9.9), (6.6, 9.9)], base)  # 테이퍼 느낌표 대
    block(img, 6, 11, base, 4, 3)                     # 점
    px = img.load()
    for cx, cy in [(6, 11), (9, 11), (6, 13), (9, 13)]:
        px[cx, cy] = (0, 0, 0, 0)                     # 점 모서리 컷 → 둥근 점
    bevel(img, light, dark)
    return img


STAR_MAP = [
    '......X......',
    '.....XXX.....',
    '.....XXX.....',
    'XXXXXXXXXXXXX',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
    '...XXXXXXX...',
    '..XXXXXXXXX..',
    '..XXXX.XXXX..',
    '.XXXX...XXXX.',
    '.XX.......XX.',
]

FIRE_MAP = [
    '......X....',
    '......XX...',
    '..X...XX...',
    '..XX.XXX...',
    '..XXXXXXX..',
    '.XXXXXXXXX.',
    '.XXXXXXXXX.',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '..XXXXXXX..',
    '...XXXXX...',
]


def sticker_star():
    img = new_canvas()
    light, base, dark = GOLD
    pixmap(img, STAR_MAP, 1, 2, base)
    bevel(img, light, dark)
    return img


def sticker_fire():
    img = new_canvas()
    light, base, dark = ORANGE
    pixmap(img, FIRE_MAP, 2, 1, base)
    bevel(img, light, dark)
    return img


SPRITES = {
    'sticker_check.png': sticker_check,
    'sticker_circle.png': sticker_circle,
    'sticker_cross.png': sticker_cross,
    'sticker_clover.png': sticker_clover,
    'sticker_heart.png': sticker_heart,
    'sticker_important.png': sticker_important,
    'sticker_star.png': sticker_star,
    'sticker_fire.png': sticker_fire,
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
