# gen_ui_icons.py — UI 이모지 대체용 클린 도트 아이콘 생성기 (도트 통일 1차 증명 배치)
# 사용: python gen_ui_icons.py                    → src/assets/ui_*.png (100×100 마스터)
#       python gen_ui_icons.py --preview OUT.png  → 8배 확대 검수 시트
# 규격: gen_chrome_icons.py와 동일 — 20×20 로지컬 도트, 5배 NEAREST 확대 100×100 마스터.
#       마스터 생성 후 gen_icon_sizes.py 슬롯에 등록·재실행해야 웹 srcset이 나온다.
#       모바일은 100×100 마스터를 그대로 복사(정수배 축소라 도트 보존).
# 스타일: 외곽선 있는 클린 도트(코인·번개 계열) — 1px 웜 다크 외곽선(#3A2C21, 라이트 테마
#       --edge), 좌상단 광원 하이라이트, 아이콘별 계열색은 앱 토큰(accent/starlight/틸)에서.
#       테마 틴트 없음(이모지도 테마 불변이었음) — 단색 마스크 방식은 스펙 검토 시 대안.
import argparse
from pathlib import Path

from PIL import Image

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets'
GRID = 20
SCALE = 5

EDGE = '#3A2C21'      # 웜 다크 외곽선 (라이트 --edge)
GOLD = '#E9B44C'      # --starlight
GOLD_HI = '#FAED55'
GOLD_PALE = '#FDF6A0'
RED = '#D95F52'       # --accent
RED_HI = '#E8836F'
RED_DK = '#B44A40'
TEAL = '#3E8E85'      # --accent2
TEAL_HI = '#5FC4B4'
TEAL_DK = '#2F6E67'
CREAM = '#F0DFBB'     # --chip
CREAM_HI = '#FDF8EE'
CREAM_DK = '#D6BE97'
STEEL = '#9AA0A8'
STEEL_HI = '#C9CDD3'
STEEL_DK = '#6E747C'
AMBER = '#D98E2B'     # --warn (연필 몸통)
AMBER_HI = '#E9B44C'
WOOD = '#E3C08A'
GRAPHITE = '#4A3B2E'


def hx(code):
    code = code.lstrip('#')
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16), 255)


def put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.load()[int(x), int(y)] = color


def row(img, x0, x1, y, color):
    for x in range(x0, x1 + 1):
        put(img, x, y, color)


def col(img, x, y0, y1, color):
    for y in range(y0, y1 + 1):
        put(img, x, y, color)


def rect(img, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        row(img, x0, x1, y, color)


def disc(img, cx, cy, r, color):
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                put(img, x, y, color)


def outline(img, color):
    """채워진 실루엣 바깥 1px 외곽선 — 투명 이웃이 있는 채움 픽셀을 감싼다."""
    px = img.load()
    edge = hx(color)
    filled = {(x, y) for y in range(img.height) for x in range(img.width) if px[x, y][3] > 0}
    ring = set()
    for (x, y) in filled:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < img.width and 0 <= ny < img.height and (nx, ny) not in filled:
                ring.add((nx, ny))
    for (x, y) in ring:
        px[x, y] = edge


def new_canvas():
    return Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))


def draw_sparkle():
    """✨ AI — 4각 반짝이 큰 별 + 우상단 작은 별, 골드."""
    img = new_canvas()
    cx, cy = 9, 11
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = abs(x - cx), abs(y - cy)
            if dx + dy <= 7 and (dx <= 1 or dy <= 1 or dx + dy <= 4):
                put(img, x, y, hx(GOLD))
    # 코어·좌상단 하이라이트
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = abs(x - cx), abs(y - cy)
            if dx + dy <= 2:
                put(img, x, y, hx(GOLD_PALE))
    put(img, cx - 1, cy - 2, hx(GOLD_HI))
    put(img, cx, cy - 3, hx(GOLD_HI))
    put(img, cx - 2, cy - 1, hx(GOLD_HI))
    # 작은 별 (우상단)
    sx, sy = 16, 3
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        put(img, sx + dx, sy + dy, hx(GOLD_HI))
    outline(img, EDGE)
    return img


def draw_pencil():
    """✏️ 편집 — 45° 연필, 앰버 몸통·나무 촉·지우개."""
    img = new_canvas()
    # 몸통 — 45° 대각 밴드 (u=x-y 로 두께, 촉 방향으로 진행)
    for x in range(GRID):
        for y in range(GRID):
            u = x - y            # 축과 수직 방향 위치
            v = x + y            # 축 방향 위치
            if 3 <= u <= 7 and 14 <= v <= 24:
                put(img, x, y, hx(AMBER))
            if u == 7 and 14 <= v <= 24:
                put(img, x, y, hx(AMBER_HI))
            if u == 3 and 14 <= v <= 24:
                put(img, x, y, hx(GRAPHITE))
    # 나무 촉 — 몸통 아래끝에서 점으로 수렴
    for x in range(GRID):
        for y in range(GRID):
            u = x - y
            v = x + y
            if 3 <= u <= 7 and 9 <= v < 14:
                spread = (v - 8) // 1
                if abs(u - 5) * 2 <= (v - 8):
                    put(img, x, y, hx(WOOD))
    # 심
    put(img, 4, 6, hx(GRAPHITE))
    put(img, 5, 5, hx(GRAPHITE))
    put(img, 4, 5, hx(GRAPHITE))
    # 지우개 (위끝) + 금속 밴드
    for x in range(GRID):
        for y in range(GRID):
            u = x - y
            v = x + y
            if 3 <= u <= 7 and 25 <= v <= 27:
                put(img, x, y, hx(STEEL))
            if 3 <= u <= 7 and 28 <= v <= 30:
                put(img, x, y, hx(RED))
    outline(img, EDGE)
    return img


def draw_pin():
    """📌 고정 — 압정: 돔 캡 + 목 + 넓은 받침판 + 바늘."""
    img = new_canvas()
    # 돔 캡
    disc(img, 9.5, 5.2, 3.9, hx(RED))
    disc(img, 8.2, 4.0, 1.5, hx(RED_HI))
    row(img, 6, 13, 8, hx(RED_DK))
    # 목 (좁아짐)
    row(img, 8, 11, 9, hx(RED_DK))
    # 받침판 (넓게)
    row(img, 5, 14, 10, hx(RED))
    row(img, 5, 14, 11, hx(RED_DK))
    # 바늘 — 1px 심 + 그늘, 끝 테이퍼
    col(img, 9, 12, 16, hx(STEEL_HI))
    col(img, 10, 12, 15, hx(STEEL_DK))
    put(img, 9, 17, hx(STEEL))
    outline(img, EDGE)
    return img


def draw_bulb():
    """💡 아이디어 — 골드 전구 + 스틸 베이스."""
    img = new_canvas()
    disc(img, 10, 8, 5.6, hx(GOLD))
    disc(img, 8.4, 6.4, 2.4, hx(GOLD_PALE))
    put(img, 7, 5, hx(GOLD_HI))
    put(img, 8, 5, hx(GOLD_HI))
    # 목 부분 좁아지는 유리
    row(img, 8, 12, 13, hx(GOLD))
    # 베이스 (나사산)
    row(img, 8, 12, 14, hx(STEEL_HI))
    row(img, 8, 12, 15, hx(STEEL))
    row(img, 8, 12, 16, hx(STEEL_DK))
    row(img, 9, 11, 17, hx(STEEL))
    outline(img, EDGE)
    return img


def draw_home():
    """🏠 홈 — 붉은 지붕 + 크림 벽 + 문."""
    img = new_canvas()
    # 지붕 — 꼭짓점 (9·10, y=3)에서 처마(y=9)로 넓어지는 삼각
    for dy in range(0, 7):
        y = 3 + dy
        row(img, 9 - dy, 10 + dy, y, hx(RED))
    # 지붕 좌상단 하이라이트
    for dy in range(0, 3):
        put(img, 10 - dy - 1, 3 + dy, hx(RED_HI))
    # 벽
    rect(img, 5, 10, 15, 16, hx(CREAM))
    rect(img, 5, 10, 15, 10, hx(CREAM_HI))
    # 문
    rect(img, 9, 12, 11, 16, hx(GRAPHITE))
    put(img, 10, 14, hx(GOLD))
    outline(img, EDGE)
    return img


def draw_loop():
    """🔁 루틴 — 틸 순환 링 + 아래로/위로 도는 화살촉 2개."""
    img = new_canvas()
    cx = cy = 10.0
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if 4.2 * 4.2 <= d2 <= 6.6 * 6.6:
                put(img, x, y, hx(TEAL))
    # 트임 두 곳 — 왼쪽 하단(시계방향 진행), 오른쪽 상단(대칭)
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx <= -3.0 and 0.5 <= dy <= 4.5:
                put(img, x, y, (0, 0, 0, 0))
            if dx >= 3.0 and -4.5 <= dy <= -0.5:
                put(img, x, y, (0, 0, 0, 0))
    # 왼쪽 화살촉 (아래 방향)
    for i, (x0, x1) in enumerate([(2, 7), (3, 6), (4, 5)]):
        row(img, x0, x1, 10 + i, hx(TEAL))
    # 오른쪽 화살촉 (위 방향)
    for i, (x0, x1) in enumerate([(12, 17), (13, 16), (14, 15)]):
        row(img, x0, x1, 9 - i, hx(TEAL))
    # 상단 밴드 하이라이트
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if 4.9 * 4.9 <= d2 <= 6.6 * 6.6 and dy < -3 and dx < 2 and img.load()[x, y][3] > 0:
                put(img, x, y, hx(TEAL_HI))
    outline(img, EDGE)
    return img


ICONS = {
    'ui_sparkle': draw_sparkle,
    'ui_pencil': draw_pencil,
    'ui_pin': draw_pin,
    'ui_bulb': draw_bulb,
    'ui_home': draw_home,
    'ui_loop': draw_loop,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT')
    args = parser.parse_args()

    sprites = {name: fn() for name, fn in ICONS.items()}

    if args.preview:
        pad, cell = 8, GRID * 8
        sheet = Image.new('RGBA', (len(sprites) * (cell + pad) + pad, cell + 2 * pad), (34, 30, 42, 255))
        for i, (name, im) in enumerate(sprites.items()):
            big = im.resize((cell, cell), Image.NEAREST)
            sheet.paste(big, (pad + i * (cell + pad), pad), big)
        sheet.save(args.preview)
        print(f'preview → {args.preview}')
        return

    for name, im in sprites.items():
        master = im.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
        master.save(ASSET_DIR / f'{name}.png', optimize=True)
        print(f'{name}.png (100×100)')
    print(f'→ {ASSET_DIR}')


if __name__ == '__main__':
    main()
