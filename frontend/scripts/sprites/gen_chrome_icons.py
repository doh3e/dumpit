# gen_chrome_icons.py — 크롬 아이콘(코인·AI 토큰 번개·설정 톱니·화살촉) 클린 도트 재생성기
# 사용: python gen_chrome_icons.py                    → src/assets/ 아래 4파일 (100×100)
#       python gen_chrome_icons.py --preview OUT.png  → 8배 확대 검수 시트
# 배경: 기존 파일들은 안티앨리어싱 낀 도트"풍" 이미지(수천 색)라 소형 축소 시 자글거렸다.
#       deadline_alarm과 동일 규격(20×20 로지컬 도트 + 5배 NEAREST 확대)으로 다시 그린다.
#       팔레트는 기존 이미지에서 샘플한 값 유지. 재생성 후 gen_icon_sizes.py 재실행 필수.
#       (menu·download는 도트가 아닌 평면 벡터풍이라 재생성 대상 아님)
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets'
GRID = 20
SCALE = 5  # 20×20 → 100×100 (크롬 아이콘군 공통 규격)

EDGE = '#3A1205'    # 진갈색 외곽선 (기존 코인·번개 샘플값 근사)
GOLD = '#F5D41C'
GOLD_HI = '#FAED55'
GOLD_PALE = '#FDF6A0'
SHADE = '#EE9414'
LETTER = '#6E2508'  # 코인 'C' 각인

STEEL_EDGE = '#101822'   # 설정 톱니 — 한색 근흑 외곽 (기존 샘플)
STEEL = '#9BA1A8'
STEEL_HI = '#C9CED4'
STEEL_SHADE = '#565C68'
ARROW_GRAY = '#4A4A4A'   # 화살촉 — 원본과 동일한 플랫 단색


def hx(code):
    code = code.lstrip('#')
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16), 255)


def put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.load()[int(x), int(y)] = color


def disc(img, cx, cy, r, color):
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                put(img, x, y, color)


def ring(img, cx, cy, r_out, r_in, color, cond=None):
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r_in * r_in <= d2 <= r_out * r_out and (cond is None or cond(x, y)):
                put(img, x, y, color)


def draw_coin():
    img = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    cx = cy = 10.0

    # r 8.7/7.7 — 상하좌우 극점이 1px 돌기가 되지 않고 4px 평탄면이 되는 값
    disc(img, cx, cy, 8.7, hx(EDGE))
    disc(img, cx, cy, 7.7, hx(GOLD))

    # 림 셰이딩 — 좌상단 광원 하이라이트, 우하단 그늘
    ring(img, cx, cy, 7.6, 6.1, hx(GOLD_HI), cond=lambda x, y: x <= 9 and y <= 8)
    ring(img, cx, cy, 7.6, 6.1, hx(SHADE), cond=lambda x, y: x >= 11 and y >= 11)
    # 하이라이트 정점 반짝임
    put(img, 5, 4, hx(GOLD_PALE))
    put(img, 6, 4, hx(GOLD_PALE))
    put(img, 5, 5, hx(GOLD_PALE))

    # 'C' 각인 — 우측이 열린 도넛
    ring(img, cx, cy, 4.7, 2.6, hx(LETTER), cond=lambda x, y: not (x >= 11 and 8 <= y <= 11))
    return img


def shade_outline(filled, main, hi, shade, edge):
    """마스크 → 본체 채움 + 경계 인접 px 광원 셰이딩(좌상 하이라이트·우하 그늘) + 1px 팽창 외곽선."""
    img = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    for y in range(GRID):
        for x in range(GRID):
            if not filled(x, y):
                continue
            color = hx(main)
            if not filled(x + 1, y) or not filled(x, y + 1):
                color = hx(shade)     # 우·하 경계 그늘
            if not filled(x - 1, y) or not filled(x, y - 1):
                color = hx(hi)        # 좌·상 경계 하이라이트 (그늘보다 우선)
            put(img, x, y, color)
    for y in range(GRID):
        for x in range(GRID):
            if filled(x, y):
                continue
            if any(filled(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                put(img, x, y, hx(edge))
    return img


# 번개 폴리곤 (20×20 로지컬 그리드 좌표) — 우상단 어깨에서 좌하단 꼬리로 내려가는 지그재그
BOLT = [(11, 1), (17, 1), (12, 8), (16, 8), (5, 18), (9, 11), (5, 11)]


def draw_token():
    mask = Image.new('L', (GRID, GRID), 0)
    ImageDraw.Draw(mask).polygon(BOLT, fill=255)
    mpx = mask.load()

    def filled(x, y):
        return 0 <= x < GRID and 0 <= y < GRID and mpx[x, y] > 0

    img = shade_outline(filled, GOLD, GOLD_HI, SHADE, EDGE)

    # 어깨 반짝임
    put(img, 12, 2, hx(GOLD_PALE))
    put(img, 13, 2, hx(GOLD_PALE))
    return img


def draw_setting():
    """8치 톱니 기어 — 몸통 원 + 45° 간격 사각 이빨 − 중앙 구멍."""
    cx = cy = 10.0
    teeth = []
    for k in range(8):
        a = math.radians(k * 45)
        teeth.append((cx + 7.3 * math.cos(a), cy + 7.3 * math.sin(a)))

    def filled(x, y):
        if not (0 <= x < GRID and 0 <= y < GRID):
            return False
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        d2 = dx * dx + dy * dy
        if d2 <= 3.0 ** 2:
            return False  # 중앙 구멍
        if d2 <= 6.4 ** 2:
            return True
        return any(abs(x + 0.5 - tx) <= 1.5 and abs(y + 0.5 - ty) <= 1.5 for tx, ty in teeth)

    img = shade_outline(filled, STEEL, STEEL_HI, STEEL_SHADE, STEEL_EDGE)
    # 좌상단 림 반짝임
    put(img, 6, 4, hx('#E8ECF0'))
    return img


def draw_arrowhead():
    """뽀모도로 위젯 열기(팝아웃) — 좌하단으로 나는 화살 + 우상단 다이아 궤적. 원본과 동일한 플랫 단색."""
    img = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    c = hx(ARROW_GRAY)

    # 다이아 궤적: 상단 4개 + 우측 3개 (원본 모티프 유지) — 중심 간격 4로 팔 끝 사이 1px 띄움
    for dx_, dy_ in [(5, 2), (9, 2), (13, 2), (17, 2), (17, 6), (17, 10), (17, 14)]:
        put(img, dx_, dy_ - 1, c)
        put(img, dx_ - 1, dy_, c)
        put(img, dx_, dy_, c)
        put(img, dx_ + 1, dy_, c)
        put(img, dx_, dy_ + 1, c)

    # 화살촉 — 좌하단 꼭짓점(2,17)이 촉끝인 직각삼각형 (빗변 y=x+7)
    for y in range(9, 18):
        for x in range(2, 2 + (y - 9) + 1):
            put(img, x, y, c)

    # 화살대 — 촉 빗변(6,13)에 물려서 우상단으로 2px 대각선
    for x in range(6, 13):
        put(img, x, 19 - x, c)
        put(img, x + 1, 19 - x, c)
    return img


def upscale(img, factor):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT')
    args = parser.parse_args()

    icons = {
        'coin_image.png': draw_coin(),
        'remain_ai_token.png': draw_token(),
        'setting_image.png': draw_setting(),
        'arrowheads.png': draw_arrowhead(),
    }

    if args.preview:
        pad, cell = 8, GRID * 8
        sheet = Image.new('RGBA', ((cell + pad) * len(icons) + pad, cell + pad * 2), (247, 239, 223, 255))
        for i, im in enumerate(icons.values()):
            sheet.paste(upscale(im, 8), (pad + i * (cell + pad), pad), upscale(im, 8))
        sheet.save(args.preview)
        print(f'preview → {args.preview}')
    else:
        for name, im in icons.items():
            out = ASSET_DIR / name
            upscale(im, SCALE).save(out, optimize=True)
            print(f'saved → {out}')


if __name__ == '__main__':
    main()
