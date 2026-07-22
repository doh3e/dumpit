# gen_celebs.py — 완료축하 파티클 도트 생성기 (6~24px)
# 사용: python gen_celebs.py                    → frontend/src/assets/shop/에 PNG 저장
#       python gen_celebs.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경 (gen_stations.py 규약과 동일)
import argparse
import math
from pathlib import Path
from PIL import Image

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'shop'


def new_canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


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


def rect(img, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(img, x, y, color)


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


def spark(color_main, color_core, size=6):
    """다이아 파편 — 폭죽 파편·잔반짝 공용"""
    img = new_canvas(size, size)
    m, c = hx(color_main), hx(color_core)
    half = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            if abs(x - half) + abs(y - half) <= half + 0.1:
                put(img, x, y, m)
    block(img, size // 2 - 1, size // 2 - 1, c, 2, 2)
    return img


def celeb_fireworks():
    """대표 아이콘 — 폭죽 로켓"""
    img = new_canvas(16, 16)
    gold, gold_d, coral, white = hx('#F2CE5E'), hx('#C9922E'), hx('#E05252'), hx('#FFF7DE')
    block(img, 6, 2, coral, 4, 3)                       # 탄두
    put(img, 6, 2, white)                               # 하이라이트
    rect(img, 6, 5, 9, 11, gold)                        # 몸통
    rect(img, 9, 5, 9, 11, gold_d)                      # 우측 음영
    put(img, 5, 11, coral); put(img, 10, 11, coral)     # 핀
    put(img, 7, 13, gold); put(img, 8, 14, gold_d)      # 트레일
    put(img, 2, 4, gold); put(img, 13, 6, gold); put(img, 3, 12, gold_d)  # 잔반짝
    return img


def celeb_meteor():
    """우상→좌하 유성 스트릭 (머리가 좌하단)"""
    img = new_canvas(16, 16)
    white, gold, gold_d, indigo = hx('#FFF7DE'), hx('#F2CE5E'), hx('#C9922E'), hx('#8A8FD4')
    stroke(img, [(13, 2), (5, 10)], indigo, thick=1)    # 꼬리 끝 (옅은 남보라)
    stroke(img, [(11, 4), (4, 11)], gold_d, thick=1)
    stroke(img, [(10, 5), (3, 12)], gold, thick=2)      # 꼬리 본체
    disc(img, 3.5, 12.5, 2.2, gold)                     # 머리
    disc(img, 3.0, 12.0, 1.2, white)                    # 머리 코어
    return img


def celeb_meteor_big():
    """전경용 대형 유성 32×32 — 롱테일 + 밝은 코어 (72~112px로 업스케일)"""
    img = new_canvas(32, 32)
    white, gold, gold_d, indigo = hx('#FFF7DE'), hx('#F2CE5E'), hx('#C9922E'), hx('#8A8FD4')
    stroke(img, [(29, 2), (11, 20)], indigo, thick=1)   # 꼬리 끝
    stroke(img, [(27, 4), (9, 22)], gold_d, thick=2)
    stroke(img, [(24, 7), (7, 24)], gold, thick=3)      # 꼬리 본체
    put(img, 22, 6, white); put(img, 15, 14, white)     # 꼬리 반짝
    disc(img, 6.5, 25.5, 3.4, gold)                     # 머리
    disc(img, 5.8, 24.8, 2.0, white)                    # 머리 코어
    return img


def celeb_fw_bloom_a():
    """폭발 초기 블룸 48×48 — 촘촘한 2겹 점 링 + 흰 코어 (~190px 업스케일)"""
    img = new_canvas(48, 48)
    palette = [hx('#F2CE5E'), hx('#E87070'), hx('#58B8A8'), hx('#FFF7DE')]
    for i in range(16):
        ang = i / 16 * 2 * math.pi
        disc(img, 24 + math.cos(ang) * 13, 24 + math.sin(ang) * 13, 1.7, palette[i % 4])
    for i in range(8):
        ang = i / 8 * 2 * math.pi + 0.4
        disc(img, 24 + math.cos(ang) * 7, 24 + math.sin(ang) * 7, 1.3, palette[(i + 1) % 4])
    disc(img, 24, 24, 2.6, hx('#FFF7DE'))
    return img


def celeb_fw_bloom_b():
    """폭발 후기 블룸 48×48 — 넓고 성긴 링, 살짝 아래로 처짐"""
    img = new_canvas(48, 48)
    palette = [hx('#F2CE5E'), hx('#E87070'), hx('#58B8A8')]
    for i in range(20):
        ang = i / 20 * 2 * math.pi + 0.25
        disc(img, 24 + math.cos(ang) * 19, 25.5 + math.sin(ang) * 19, 1.2, palette[i % 3])
    return img


def celeb_meteor_star():
    img = new_canvas(8, 8)
    gold, white = hx('#F2CE5E'), hx('#FFF7DE')
    rect(img, 3, 0, 4, 7, gold)
    rect(img, 0, 3, 7, 4, gold)
    block(img, 3, 3, white, 2, 2)
    return img


def celeb_petal():
    """물방울형(teardrop) 실루엣 — 큰 원에서 작은 원으로 점감하며 끝을 뾰족하게"""
    img = new_canvas(16, 16)
    light, pink, dark = hx('#F9C6D2'), hx('#F2A0B4'), hx('#DB7D96')
    disc(img, 6.5, 6.5, 4.3, pink)                      # 몸체 — 둥근 윗부분
    disc(img, 8.5, 8.5, 3.3, pink)                      # 점감 1
    disc(img, 10.3, 10.3, 2.2, pink)                    # 점감 2
    disc(img, 11.6, 11.6, 1.2, pink)                    # 점감 3 — 뾰족한 끝으로
    disc(img, 12.4, 12.4, 0.6, dark)                    # 끝 음영
    disc(img, 5.0, 5.0, 1.8, light)                     # 좌상단 하이라이트
    return img


def celeb_petal_leaf():
    img = new_canvas(10, 10)
    light, green, dark = hx('#9AD489'), hx('#6FB35C'), hx('#4E8C3F')
    for y in range(10):
        for x in range(10):
            # 대각 잎 모양 — 두 원의 교집합 근사
            if (x - 3) ** 2 + (y - 3) ** 2 <= 26 and (x - 6) ** 2 + (y - 6) ** 2 <= 26:
                put(img, x, y, green)
    stroke(img, [(2, 2), (7, 7)], dark, thick=1)        # 잎맥
    put(img, 2, 3, light); put(img, 3, 2, light); put(img, 3, 3, light)
    return img


def celeb_sprout():
    img = new_canvas(16, 16)
    light, green, dark, stem = hx('#9AD489'), hx('#6FB35C'), hx('#4E8C3F'), hx('#57A845')
    rect(img, 7, 8, 8, 14, stem)                        # 줄기
    disc(img, 4.5, 6.5, 3.0, green)                     # 왼 잎
    disc(img, 3.8, 5.8, 1.3, light)                     # 하이라이트
    disc(img, 11.5, 6.5, 3.0, dark)                     # 오른 잎 (음영측)
    stroke(img, [(6, 8), (7, 9)], green, thick=1)       # 잎-줄기 연결
    stroke(img, [(10, 8), (8, 9)], dark, thick=1)
    return img


def celeb_candy():
    img = new_canvas(16, 16)
    light, coral, dark, gold = hx('#F5A3A3'), hx('#E87070'), hx('#C24E4E'), hx('#F2CE5E')
    disc(img, 8, 8, 3.6, coral)                         # 사탕 본체
    disc(img, 6.8, 6.8, 1.4, light)                     # 하이라이트
    stroke(img, [(9, 6), (6, 9)], dark, thick=1)        # 줄무늬
    for i in range(3):                                  # 포장 리본 (바깥이 넓게)
        rect(img, 2 + i, 5 + i, 2 + i, 11 - i, gold)
        rect(img, 13 - i, 5 + i, 13 - i, 11 - i, gold)
    return img


def celeb_candy_drop():
    img = new_canvas(8, 8)
    light, teal, dark = hx('#8FD9CB'), hx('#58B8A8'), hx('#3E9284')
    disc(img, 4, 4, 3.2, teal)
    disc(img, 3, 3, 1.2, light)
    put(img, 5, 6, dark); put(img, 6, 5, dark)
    return img


def celeb_candy_confetti():
    img = new_canvas(8, 8)
    light, lav = hx('#C9B3E8'), hx('#A98BD4')
    stroke(img, [(1, 5), (5, 1)], lav, thick=3)         # 기울어진 리본 조각
    put(img, 1, 4, light); put(img, 2, 3, light)
    return img


def _bonfire(tongue_top, tip_dx):
    img = new_canvas(24, 24)
    log_l, log_d = hx('#8A5A33'), hx('#6E4526')
    out_o, mid_o, core = hx('#E8863C'), hx('#F2B04C'), hx('#F9E08A')
    stroke(img, [(3, 20), (20, 17)], log_l, thick=3)    # 장작 교차
    stroke(img, [(3, 17), (20, 20)], log_d, thick=3)
    disc(img, 12, 15, 5.0, out_o)                       # 불꽃 층
    disc(img, 12, 14, 3.6, mid_o)
    disc(img, 12, 14.5, 2.0, core)
    stroke(img, [(12, 12), (12 + tip_dx, tongue_top)], out_o, thick=2)   # 위로 솟는 혀
    stroke(img, [(12, 13), (12 + tip_dx, tongue_top + 2)], mid_o, thick=1)
    return img


def celeb_bonfire_a():
    return _bonfire(6, -2)   # 혀가 왼쪽


def celeb_bonfire_b():
    return _bonfire(4, 2)    # 혀가 오른쪽 + 조금 더 높이


def celeb_ember():
    img = new_canvas(6, 6)
    disc(img, 3, 3, 2.2, hx('#E8863C'))
    block(img, 2, 2, hx('#F9E08A'), 2, 2)
    return img


def celeb_fire_glow():
    """모닥불 광륜 48×48 — 내핵 + 체커 디더 링 2겹, 저알파 웜 오렌지.
    CSS에서 ~300px로 업스케일(pixelated)해 청키한 픽셀 글로우로 쓴다."""
    img = new_canvas(48, 48)
    warm = (242, 176, 76)
    for y in range(48):
        for x in range(48):
            dx, dy = x + 0.5 - 24, y + 0.5 - 24
            d = (dx * dx + dy * dy) ** 0.5
            if d <= 10:
                a = 88
            elif d <= 17 and (x + y) % 2 == 0:
                a = 64
            elif d <= 23 and (x + y) % 2 == 0:
                a = 36
            else:
                continue
            img.load()[x, y] = (*warm, a)
    return img


SPRITES = {
    'celeb_fireworks.png': celeb_fireworks,
    'celeb_firework_spark_gold.png': lambda: spark('#F2CE5E', '#FFF7DE'),
    'celeb_firework_spark_coral.png': lambda: spark('#E87070', '#FBD3D3'),
    'celeb_firework_spark_teal.png': lambda: spark('#58B8A8', '#DFF5F0'),
    'celeb_meteor.png': celeb_meteor,
    'celeb_meteor_big.png': celeb_meteor_big,
    'celeb_meteor_star.png': celeb_meteor_star,
    'celeb_fw_bloom_a.png': celeb_fw_bloom_a,
    'celeb_fw_bloom_b.png': celeb_fw_bloom_b,
    'celeb_petal.png': celeb_petal,
    'celeb_petal_leaf.png': celeb_petal_leaf,
    'celeb_sprout.png': celeb_sprout,
    'celeb_sprout_sparkle.png': lambda: spark('#7FD4C0', '#EFFFF8'),
    'celeb_candy.png': celeb_candy,
    'celeb_candy_drop.png': celeb_candy_drop,
    'celeb_candy_confetti.png': celeb_candy_confetti,
    'celeb_bonfire_a.png': celeb_bonfire_a,
    'celeb_bonfire_b.png': celeb_bonfire_b,
    'celeb_ember.png': celeb_ember,
    'celeb_fire_glow.png': celeb_fire_glow,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', metavar='OUT')
    args = ap.parse_args()
    imgs = {name: fn() for name, fn in SPRITES.items()}
    if args.preview:
        scale, pad, cols = 8, 8, 4
        cell = max(im.width for im in imgs.values()) * scale + pad
        rows = (len(imgs) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cell + pad, rows * cell + pad), (30, 30, 40, 255))
        for i, (name, im) in enumerate(imgs.items()):
            big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            sheet.paste(big, (pad + (i % cols) * cell, pad + (i // cols) * cell), big)
        sheet.save(args.preview)
        print(f'preview -> {args.preview}')
        return
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for name, im in imgs.items():
        im.save(ASSET_DIR / name)
        print(f'saved -> {ASSET_DIR / name}')


if __name__ == '__main__':
    main()
