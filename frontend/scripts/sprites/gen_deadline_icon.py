# gen_deadline_icon.py — 상단바 마감임박 배지용 자명종 도트 아이콘 생성기
# 사용: python gen_deadline_icon.py                    → src/assets/deadline_alarm.png (100×100)
#       python gen_deadline_icon.py --preview OUT.png  → 색 변형 비교 시트 (8배 확대, 검수용)
# 스타일: 코인·AI 토큰 아이콘과 동일 결 — 20×20 로지컬 도트 + 5배 확대, edge(#3A2C21) 외곽선,
#         좌상단 광원 하이라이트. 행성(외곽선 없음)과 달리 크롬 아이콘군은 외곽선 있음.
import argparse
from pathlib import Path
from PIL import Image

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets'
GRID = 20
SCALE = 5  # 20×20 → 100×100 (기존 아이콘들과 동일 규격)

EDGE = '#3A2C21'
FACE = '#FFFDF6'
FACE_SHADE = '#F0DFBB'

VARIANTS = {
    # 몸통 [메인, 하이라이트, 그늘]
    'red': ['#D95F52', '#F09355', '#B04A3E'],    # accent 코랄 — 옆의 금색 코인·번개와 대비
    'amber': ['#D98E2B', '#E9B44C', '#B06F1E'],  # warn 앰버 — 마감 토큰색이지만 코인과 비슷해짐
}


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


def ring_arc(img, cx, cy, r_out, r_in, color, x_range=None, y_max=None):
    """도넛 영역 채움 — 하이라이트/그늘 호(弧)용."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if r_in * r_in <= d2 <= r_out * r_out:
                if x_range and not (x_range[0] <= x <= x_range[1]):
                    continue
                if y_max is not None and y > y_max:
                    continue
                put(img, x, y, color)


def line(img, x0, y0, x1, y1, color):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for s in range(steps + 1):
        put(img, round(x0 + (x1 - x0) * s / steps), round(y0 + (y1 - y0) * s / steps), color)


def draw_clock(body):
    main, hi, shade = [hx(c) for c in VARIANTS[body]]
    edge, face, face_shade = hx(EDGE), hx(FACE), hx(FACE_SHADE)
    img = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))

    cx, cy = 10.0, 11.0

    # 종 2개 — 몸통 원이 아래를 덮어 돔만 남는다
    for bx in (5.6, 14.4):
        disc(img, bx, 4.6, 2.6, edge)
        disc(img, bx, 4.6, 1.7, main)
    put(img, 4, 3, hi)   # 종 하이라이트 (좌상단 광원)
    put(img, 13, 3, hi)

    # 다리 — 몸통 하단에 붙는 2×2 블록 계단 (얇은 사선은 16px 표시에서 부서져 보임)
    for bx, by in ((5, 15), (4, 16), (3, 17), (13, 15), (14, 16), (15, 17)):
        for ox in range(2):
            for oy in range(2):
                put(img, bx + ox, by + oy, edge)

    # 몸통: 외곽선 → 림 → 시계판
    disc(img, cx, cy, 6.6, edge)
    disc(img, cx, cy, 5.6, main)
    disc(img, cx, cy, 3.9, face)

    # 림 셰이딩 — 좌상단 하이라이트 호, 우하단 그늘 호
    ring_arc(img, cx, cy, 5.6, 4.1, hi, x_range=(5, 9), y_max=8)
    ring_arc(img, cx, cy, 5.6, 4.1, shade, x_range=(11, 15))
    for y in range(12, 16):
        for x in range(11, 16):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if 4.1 ** 2 <= dx * dx + dy * dy <= 5.6 ** 2:
                put(img, x, y, shade)

    # 시계판 그늘 (우하단 2px 클러스터)
    put(img, 12, 13, face_shade)
    put(img, 11, 14, face_shade)
    put(img, 12, 14, face_shade)

    # 바늘 — 10시 10분 V자 + 중심점
    line(img, 10, 11, 8, 9, edge)
    line(img, 10, 11, 12, 9, edge)
    put(img, 10, 11, edge)

    return img


def upscale(img, factor):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT')
    parser.add_argument('--body', default='red', choices=VARIANTS)
    args = parser.parse_args()

    if args.preview:
        pad, cell = 8, GRID * 8
        sheet = Image.new('RGBA', ((cell + pad) * len(VARIANTS) + pad, cell + pad * 2), (247, 239, 223, 255))
        for i, body in enumerate(VARIANTS):
            sheet.paste(upscale(draw_clock(body), 8), (pad + i * (cell + pad), pad))
        sheet.save(args.preview)
        print(f'preview → {args.preview}')
    else:
        out = ASSET_DIR / 'deadline_alarm.png'
        upscale(draw_clock(args.body), SCALE).save(out)
        print(f'saved → {out}')


if __name__ == '__main__':
    main()
