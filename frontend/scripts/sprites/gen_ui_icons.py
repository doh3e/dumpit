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
GREEN = '#5C8A3C'     # forest 테마 accent — 나무·새싹 계열
GREEN_HI = '#8FBF6F'
GREEN_DK = '#3E6128'
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


def draw_scissors():
    """✂️ 태스크 전환 — 스틸 날 X자 + 레드 링 손잡이."""
    img = new_canvas()
    # 날 두 개 — (4,3)→(13,12), (15,3)→(6,12) 굵기 2
    for t in range(10):
        x, y = 4 + t, 3 + t
        put(img, x, y, hx(STEEL_HI))
        put(img, x + 1, y, hx(STEEL))
    for t in range(10):
        x, y = 15 - t, 3 + t
        put(img, x, y, hx(STEEL_HI))
        put(img, x - 1, y, hx(STEEL))
    # 축 나사
    put(img, 9, 8, hx(GOLD))
    put(img, 10, 8, hx(GOLD))
    # 손잡이 링 (좌우)
    for cx, cy in ((5.5, 15.0), (14.5, 15.0)):
        for y in range(GRID):
            for x in range(GRID):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d2 = dx * dx + dy * dy
                if 1.6 * 1.6 <= d2 <= 3.2 * 3.2:
                    put(img, x, y, hx(RED))
    outline(img, EDGE)
    return img


def draw_puzzle():
    """🧩 AI로 쪼개기 — 틸 퍼즐 조각(위 돌기 + 오른쪽 돌기)."""
    img = new_canvas()
    rect(img, 3, 6, 13, 17, hx(TEAL))
    # 위 돌기
    rect(img, 6, 3, 9, 6, hx(TEAL))
    row(img, 7, 8, 2, hx(TEAL))
    # 오른쪽 돌기
    rect(img, 13, 10, 16, 13, hx(TEAL))
    col(img, 17, 11, 12, hx(TEAL))
    # 좌상단 하이라이트
    row(img, 3, 5, 6, hx(TEAL_HI))
    col(img, 3, 6, 9, hx(TEAL_HI))
    put(img, 6, 3, hx(TEAL_HI))
    put(img, 7, 2, hx(TEAL_HI))
    # 우하단 그늘
    row(img, 4, 13, 17, hx(TEAL_DK))
    col(img, 13, 14, 17, hx(TEAL_DK))
    put(img, 16, 13, hx(TEAL_DK))
    outline(img, EDGE)
    return img


def draw_user():
    """👤 MY — 크림 두상 + 둥근 어깨 실루엣."""
    img = new_canvas()
    disc(img, 9.5, 6.0, 3.9, hx(CREAM))
    disc(img, 8.0, 4.6, 1.4, hx(CREAM_HI))
    # 어깨 — 둥근 돔 (아래 잘린 원)
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 17.5
            if dx * dx + dy * dy <= 6.4 * 6.4 and y >= 12 and y <= 17:
                put(img, x, y, hx(CREAM))
    # 어깨선 하이라이트·하단 그늘
    for x in range(4, 16):
        for y in range(11, 14):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 17.5
            d2 = dx * dx + dy * dy
            if 5.4 * 5.4 <= d2 <= 6.4 * 6.4 and y >= 12:
                put(img, x, y, hx(CREAM_HI))
    row(img, 4, 15, 17, hx(CREAM_DK))
    outline(img, EDGE)
    return img


def draw_megaphone():
    """📢 공지 — 앰버 확성기(오른쪽 나팔) + 소리선."""
    img = new_canvas()
    # 몸통 — 오른쪽으로 넓어지는 혼
    for x in range(3, 12):
        spread = (x - 3) // 2
        y0, y1 = 8 - spread, 12 + spread
        col(img, x, y0, y1, hx(AMBER))
    # 나팔 입구 (세로 밴드)
    col(img, 12, 3, 17, hx(GOLD))
    col(img, 13, 4, 16, hx(AMBER))
    # 손잡이
    rect(img, 5, 13, 8, 16, hx(RED))
    # 상단 하이라이트
    for x in range(3, 12):
        spread = (x - 3) // 2
        put(img, x, 8 - spread, hx(AMBER_HI))
    # 소리선
    put(img, 15, 6, hx(GOLD))
    put(img, 16, 5, hx(GOLD))
    put(img, 16, 10, hx(GOLD))
    put(img, 17, 10, hx(GOLD))
    put(img, 15, 14, hx(GOLD))
    put(img, 16, 15, hx(GOLD))
    outline(img, EDGE)
    return img


def draw_bubble():
    """💭 브레인덤프 — 크림 생각 구름 + 꼬리 점 2개."""
    img = new_canvas()
    disc(img, 7.5, 7.0, 3.6, hx(CREAM_HI))
    disc(img, 12.5, 7.5, 3.2, hx(CREAM_HI))
    disc(img, 10.0, 9.5, 3.8, hx(CREAM_HI))
    disc(img, 5.5, 9.0, 2.6, hx(CREAM_HI))
    disc(img, 14.5, 9.5, 2.4, hx(CREAM_HI))
    # 아랫면 살짝 톤 다운
    for y in range(10, 14):
        for x in range(GRID):
            if img.load()[x, y][3] > 0:
                put(img, x, y, hx(CREAM))
    # 꼬리 점
    rect(img, 6, 14, 7, 15, hx(CREAM))
    put(img, 4, 17, hx(CREAM))
    outline(img, EDGE)
    return img


def draw_cart():
    """🛒 상점 — 틸 바구니 + 스틸 손잡이 + 바퀴."""
    img = new_canvas()
    # 손잡이
    put(img, 2, 4, hx(STEEL))
    put(img, 3, 4, hx(STEEL))
    put(img, 4, 5, hx(STEEL))
    put(img, 4, 6, hx(STEEL))
    # 바구니 — 오른쪽 아래로 살짝 좁아지는 사다리꼴
    for dy in range(6):
        y = 6 + dy
        x0 = 4 + (dy // 2)
        x1 = 16 - (dy // 3)
        row(img, x0, x1, y, hx(TEAL))
    row(img, 4, 16, 6, hx(TEAL_HI))
    # 바구니 살
    for x in (7, 10, 13):
        col(img, x, 8, 10, hx(TEAL_DK))
    # 바퀴
    disc(img, 7.5, 15.5, 2.1, hx(STEEL))
    disc(img, 14.5, 15.5, 2.1, hx(STEEL))
    put(img, 7, 15, hx(STEEL_HI))
    put(img, 14, 15, hx(STEEL_HI))
    put(img, 8, 16, hx(STEEL_DK))
    put(img, 15, 16, hx(STEEL_DK))
    outline(img, EDGE)
    return img


def draw_question():
    """❓ 도움말 — 골드 물음표."""
    img = new_canvas()
    # 갈고리 — 링 상반부 + 오른쪽 하강
    cx, cy = 9.5, 7.0
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if 2.6 * 2.6 <= d2 <= 5.0 * 5.0 and (dy <= 0 or dx >= 1.2):
                put(img, x, y, hx(GOLD))
    # 목 — 중앙으로 꺾여 내려옴
    col(img, 9, 11, 13, hx(GOLD))
    col(img, 10, 11, 13, hx(GOLD))
    # 점
    rect(img, 9, 16, 10, 17, hx(GOLD))
    # 하이라이트
    put(img, 7, 3, hx(GOLD_HI))
    put(img, 8, 3, hx(GOLD_HI))
    put(img, 6, 4, hx(GOLD_HI))
    outline(img, EDGE)
    return img


def draw_envelope():
    """✉️ 문의 — 크림 봉투 + 플랩 V선."""
    img = new_canvas()
    rect(img, 2, 5, 17, 15, hx(CREAM_HI))
    # 플랩 — 양 끝에서 중앙(9·10, y=11)으로
    for t in range(8):
        y = 5 + t
        if y > 11:
            break
        put(img, 2 + t, y, hx(CREAM_DK))
        put(img, 17 - t, y, hx(CREAM_DK))
    row(img, 9, 10, 11, hx(CREAM_DK))
    put(img, 8, 10, hx(CREAM_DK))
    put(img, 11, 10, hx(CREAM_DK))
    # 아랫면 톤
    row(img, 2, 17, 15, hx(CREAM))
    outline(img, EDGE)
    return img


def draw_document():
    """📄 약관 — 접힌 귀퉁이 문서 + 본문 줄."""
    img = new_canvas()
    rect(img, 4, 2, 15, 17, hx(CREAM_HI))
    # 접힌 귀퉁이 (우상단) — 삼각형만큼 파내고 접힘 사선 + 접힌 면
    for t in range(5):
        row(img, 11 + t, 15, 2 + t, (0, 0, 0, 0))
    for t in range(5):
        put(img, 11 + t, 2 + t, hx(CREAM))       # 접힌 면 (사선 아래 한 줄)
        put(img, 10 + t, 2 + t, hx(CREAM_DK))    # 접힘 사선
    # 본문 줄
    for y in (8, 11, 14):
        row(img, 6, 13, y, hx(STEEL))
    outline(img, EDGE)
    return img


def draw_lock():
    """🔒 개인정보 — 골드 자물쇠 + 스틸 고리."""
    img = new_canvas()
    # 고리 (상단 아치)
    cx, cy = 9.5, 7.0
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if 2.2 * 2.2 <= d2 <= 4.0 * 4.0 and dy <= 0.5:
                put(img, x, y, hx(STEEL))
    # 몸통
    rect(img, 4, 8, 15, 16, hx(GOLD))
    row(img, 4, 15, 8, hx(GOLD_HI))
    col(img, 4, 8, 16, hx(GOLD_HI))
    row(img, 4, 15, 16, hx(AMBER))
    # 열쇠 구멍
    disc(img, 9.5, 11.5, 1.4, hx(GRAPHITE))
    rect(img, 9, 12, 10, 14, hx(GRAPHITE))
    outline(img, EDGE)
    return img


def draw_moon():
    """🌙 언젠가/다크 — 골드 초승달 (우상단이 파인 크레센트)."""
    img = new_canvas()
    disc(img, 9.5, 10.0, 6.6, hx(GOLD))
    # 파냄 — 우상단으로 치우친 원
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 12.6, y + 0.5 - 7.2
            if dx * dx + dy * dy <= 5.6 * 5.6:
                put(img, x, y, (0, 0, 0, 0))
    # 왼쪽 바깥 림 하이라이트
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 10.0
            d2 = dx * dx + dy * dy
            if 5.4 * 5.4 <= d2 <= 6.6 * 6.6 and dx < -2.5 and img.load()[x, y][3] > 0:
                put(img, x, y, hx(GOLD_HI))
    put(img, 6, 14, hx(GOLD_PALE))
    outline(img, EDGE)
    return img


def draw_calendar():
    """📅 직접 마감/날짜 — 레드 헤더 달력 + 바인더 링 + 날짜 점."""
    img = new_canvas()
    rect(img, 3, 5, 16, 17, hx(CREAM_HI))
    rect(img, 3, 5, 16, 8, hx(RED))
    row(img, 3, 16, 5, hx(RED_HI))
    # 바인더 링
    for x in (6, 13):
        rect(img, x, 3, x + 1, 5, hx(STEEL))
        put(img, x, 3, hx(STEEL_DK))
    # 날짜 점 3×3
    for i, y in enumerate((10, 13, 16)):
        for j, x in enumerate((5, 9, 13)):
            rect(img, x, y, x + 1, y, hx(CREAM_DK) if (i + j) % 2 else hx(STEEL))
    outline(img, EDGE)
    return img


def draw_briefcase():
    """💼 업무 — 앰버 서류가방: 손잡이 + 몸통 + 골드 잠금쇠."""
    img = new_canvas()
    # 손잡이
    rect(img, 8, 3, 11, 5, hx(AMBER))
    rect(img, 9, 4, 10, 5, (0, 0, 0, 0))
    # 몸통
    rect(img, 3, 6, 16, 16, hx(AMBER))
    row(img, 3, 16, 6, hx(AMBER_HI))
    col(img, 3, 6, 16, hx(AMBER_HI))
    # 가운데 이음선 + 잠금쇠
    row(img, 3, 16, 10, hx(GRAPHITE))
    rect(img, 8, 9, 11, 11, hx(GOLD))
    put(img, 8, 9, hx(GOLD_HI))
    # 하단 그늘
    row(img, 3, 16, 16, hx(GRAPHITE))
    outline(img, EDGE)
    return img


def draw_books():
    """📚 학업 — 3권 눕혀 쌓은 책: 레드·틸·골드."""
    img = new_canvas()
    # 아래(골드, 제일 넓음)
    rect(img, 3, 13, 16, 16, hx(GOLD))
    col(img, 14, 13, 16, hx(GOLD_HI))     # 페이지 단면
    col(img, 15, 13, 16, hx(CREAM_HI))
    # 중간(틸, 살짝 왼쪽)
    rect(img, 2, 9, 15, 12, hx(TEAL))
    col(img, 13, 9, 12, hx(TEAL_HI))
    col(img, 14, 9, 12, hx(CREAM_HI))
    # 위(레드, 좁게)
    rect(img, 4, 5, 14, 8, hx(RED))
    col(img, 12, 5, 8, hx(RED_HI))
    col(img, 13, 5, 8, hx(CREAM_HI))
    outline(img, EDGE)
    return img


def draw_broom():
    """🧹 집안일 — 대각 빗자루: 앰버 자루 + 레드 밴드 + 골드 빗살."""
    img = new_canvas()
    # 자루 (우상단 → 좌하단)
    for t in range(9):
        put(img, 14 - t, 2 + t, hx(AMBER))
        put(img, 15 - t, 2 + t, hx(AMBER_HI))
    # 밴드
    for t in range(2):
        put(img, 6 - t + 1, 10 + t, hx(RED))
        put(img, 7 - t + 1, 10 + t, hx(RED))
        put(img, 8 - t + 1, 10 + t, hx(RED_DK))
    # 빗살 — 좌하단으로 퍼지는 부채
    for i, (x0, x1) in enumerate([(4, 8), (3, 8), (2, 8), (2, 7), (1, 6)]):
        row(img, x0, x1, 12 + i, hx(GOLD))
    put(img, 4, 12, hx(GOLD_HI))
    put(img, 3, 13, hx(GOLD_HI))
    for x in (2, 4, 6):
        put(img, x, 16, hx(AMBER))
    outline(img, EDGE)
    return img


def draw_dumbbell():
    """💪 건강 — 아령: 스틸 바 + 다크 플레이트 (사용자 승인 대체 도상)."""
    img = new_canvas()
    # 바
    rect(img, 4, 9, 15, 10, hx(STEEL))
    row(img, 4, 15, 9, hx(STEEL_HI))
    # 안쪽 플레이트 (크게)
    rect(img, 4, 5, 6, 14, hx(STEEL_DK))
    rect(img, 13, 5, 15, 14, hx(STEEL_DK))
    col(img, 4, 5, 14, hx(STEEL))
    col(img, 13, 5, 14, hx(STEEL))
    # 바깥 플레이트 (작게)
    rect(img, 2, 7, 3, 12, hx(GRAPHITE))
    rect(img, 16, 7, 17, 12, hx(GRAPHITE))
    outline(img, EDGE)
    return img


def draw_gamepad():
    """🎮 취미 — 틸 게임패드: 십자키 + 버튼 2개."""
    img = new_canvas()
    # 몸통 — 가로로 넓은 라운드
    rect(img, 3, 6, 16, 13, hx(TEAL))
    rect(img, 2, 8, 17, 12, hx(TEAL))
    rect(img, 2, 13, 4, 14, hx(TEAL_DK))    # 왼쪽 그립
    rect(img, 15, 13, 17, 14, hx(TEAL_DK))  # 오른쪽 그립
    row(img, 3, 16, 6, hx(TEAL_HI))
    # 십자키 — 가로·세로 2px 팔 십자
    rect(img, 3, 9, 9, 10, hx(GRAPHITE))
    rect(img, 5, 7, 7, 12, hx(GRAPHITE))
    # 버튼 2×2
    rect(img, 12, 7, 13, 8, hx(RED))
    rect(img, 14, 10, 15, 11, hx(GOLD))
    outline(img, EDGE)
    return img


def draw_tree():
    """🌳 상위 아이디어 — 그린 수관 + 앰버 줄기."""
    img = new_canvas()
    disc(img, 9.5, 7.0, 5.2, hx(GREEN))
    disc(img, 6.5, 9.0, 3.4, hx(GREEN))
    disc(img, 13.0, 9.0, 3.2, hx(GREEN))
    disc(img, 7.6, 5.4, 1.8, hx(GREEN_HI))
    # 수관 아랫면 그늘
    for y in range(10, 13):
        for x in range(GRID):
            if img.load()[x, y][3] > 0:
                put(img, x, y, hx(GREEN_DK))
    # 줄기
    rect(img, 8, 12, 10, 17, hx(AMBER))
    col(img, 8, 12, 17, hx(AMBER_HI))
    outline(img, EDGE)
    return img


def draw_sprout():
    """🌱 하위 아이디어 — 새싹: V자로 벌어진 잎 두 장 + 줄기."""
    img = new_canvas()
    # 줄기
    col(img, 9, 9, 17, hx(GREEN_DK))
    col(img, 10, 9, 17, hx(GREEN))
    # 왼 잎 — 좌상단 끝(3,4)에서 줄기(8,10)로 붙는 눈물꼴
    for i, (x0, x1) in enumerate([(3, 4), (3, 6), (4, 7), (5, 8), (7, 8)]):
        row(img, x0, x1, 4 + i, hx(GREEN))
    put(img, 3, 4, hx(GREEN_HI))
    put(img, 3, 5, hx(GREEN_HI))
    put(img, 4, 5, hx(GREEN_HI))
    # 오른 잎 — 우상단 끝(16,3)에서 줄기(11,9)로, 조금 더 길게
    for i, (x0, x1) in enumerate([(15, 16), (13, 16), (12, 15), (11, 14), (11, 12)]):
        row(img, x0, x1, 3 + i, hx(GREEN_HI))
    put(img, 16, 3, hx(GREEN_HI))
    outline(img, EDGE)
    return img


def draw_eye():
    """👁 미리보기 — 크림 흰자 + 틸 홍채."""
    img = new_canvas()
    # 아몬드형 흰자 — 두 원의 교집합
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 10.0
            if (dx * dx) / (7.2 * 7.2) + (dy * dy) / (4.4 * 4.4) <= 1:
                put(img, x, y, hx(CREAM_HI))
    disc(img, 9.5, 10.0, 3.0, hx(TEAL))
    disc(img, 9.5, 10.0, 1.4, hx(GRAPHITE))
    put(img, 8, 8, hx(CREAM_HI))
    outline(img, EDGE)
    return img


def draw_sun():
    """☀️ 라이트 테마 — 골드 해 + 광선."""
    img = new_canvas()
    disc(img, 9.5, 9.5, 4.4, hx(GOLD))
    disc(img, 8.2, 8.2, 1.6, hx(GOLD_HI))
    # 광선 8방향
    for x0, y0, x1, y1 in [(9, 1, 10, 2), (9, 17, 10, 18), (1, 9, 2, 10), (17, 9, 18, 10)]:
        rect(img, x0, y0, x1, y1, hx(GOLD))
    for x, y in [(3, 3), (15, 3), (3, 16), (15, 16)]:
        put(img, x, y, hx(GOLD))
        put(img, x + 1, y - 1 if y == 16 else y + 1, hx(GOLD))
    outline(img, EDGE)
    return img


def draw_phone():
    """📱 시스템 테마 — 다크 베젤 + 틸 화면."""
    img = new_canvas()
    rect(img, 6, 2, 13, 17, hx(GRAPHITE))
    rect(img, 7, 4, 12, 14, hx(TEAL))
    rect(img, 7, 4, 12, 5, hx(TEAL_HI))
    # 홈 버튼·스피커
    row(img, 9, 10, 16, hx(STEEL))
    row(img, 9, 10, 3, hx(STEEL_DK))
    outline(img, EDGE)
    return img


def draw_ban():
    """🙅 없이/금지 — 레드 링 + 대각 슬래시."""
    img = new_canvas()
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 9.5
            d2 = dx * dx + dy * dy
            if 4.6 * 4.6 <= d2 <= 6.8 * 6.8:
                put(img, x, y, hx(RED))
    # 슬래시 (좌하 → 우상)
    for t in range(10):
        put(img, 5 + t, 14 - t, hx(RED))
        put(img, 6 + t, 14 - t, hx(RED))
    # 좌상단 하이라이트
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 9.5, y + 0.5 - 9.5
            d2 = dx * dx + dy * dy
            if 5.5 * 5.5 <= d2 <= 6.8 * 6.8 and dx < 0 and dy < 0 and img.load()[x, y][3] > 0:
                put(img, x, y, hx(RED_HI))
    outline(img, EDGE)
    return img


def draw_checkbox_off():
    """⬜ 추출 제외 — 빈 크림 박스."""
    img = new_canvas()
    rect(img, 3, 3, 16, 16, hx(CREAM))
    rect(img, 5, 5, 14, 14, hx(CREAM_HI))
    outline(img, EDGE)
    return img


def draw_checkbox_on():
    """✅ 추출 저장 — 틸 박스 + 크림 체크."""
    img = new_canvas()
    rect(img, 3, 3, 16, 16, hx(TEAL))
    row(img, 3, 16, 3, hx(TEAL_HI))
    col(img, 3, 3, 16, hx(TEAL_HI))
    # 체크 — 내려긋기(5,9)→(8,12), 올려긋기(8,12)→(14,6), 2px 굵기
    down = [(5, 9), (6, 10), (7, 11), (8, 12)]
    up = [(9, 11), (10, 10), (11, 9), (12, 8), (13, 7), (14, 6)]
    for (x, y) in down + up:
        put(img, x, y, hx(CREAM_HI))
        put(img, x, y - 1, hx(CREAM_HI))
    outline(img, EDGE)
    return img


def draw_clipboard():
    """📋 대시보드 — 크림 보드 + 스틸 클립 + 체크 줄."""
    img = new_canvas()
    rect(img, 4, 3, 15, 17, hx(AMBER))
    rect(img, 5, 4, 14, 16, hx(CREAM_HI))
    # 클립
    rect(img, 7, 2, 12, 4, hx(STEEL))
    row(img, 8, 11, 2, hx(STEEL_HI))
    # 줄 + 체크 점
    for y in (7, 10, 13):
        put(img, 7, y, hx(TEAL))
        row(img, 9, 12, y, hx(STEEL))
    outline(img, EDGE)
    return img


def draw_rocket():
    """🚀 다 비웠어요 — 레드 노즈 + 크림 몸통 + 불꽃."""
    img = new_canvas()
    # 노즈 콘
    for i, (x0, x1) in enumerate([(9, 10), (8, 11), (8, 11)]):
        row(img, x0, x1, 1 + i, hx(RED))
    # 몸통
    rect(img, 7, 4, 12, 12, hx(CREAM_HI))
    col(img, 7, 4, 12, hx(CREAM))
    # 창
    disc(img, 10.0, 7.0, 1.7, hx(TEAL))
    put(img, 9, 6, hx(TEAL_HI))
    # 핀 (좌우 날개)
    for i in range(3):
        put(img, 6 - i if i < 2 else 4, 10 + i, hx(RED))
        put(img, 6, 10 + i, hx(RED))
        put(img, 13, 10 + i, hx(RED_DK))
        put(img, 13 + (i if i < 2 else 1), 10 + i, hx(RED_DK))
    row(img, 4, 6, 12, hx(RED))
    row(img, 13, 15, 12, hx(RED_DK))
    # 불꽃
    rect(img, 8, 13, 11, 14, hx(GOLD))
    row(img, 9, 10, 15, hx(AMBER))
    put(img, 9, 16, hx(RED))
    put(img, 10, 16, hx(RED))
    put(img, 9, 17, hx(GOLD_HI))
    outline(img, EDGE)
    return img


def draw_target():
    """🎯 집중 대상 — 레드·크림 동심원 과녁."""
    img = new_canvas()
    disc(img, 9.5, 9.5, 7.2, hx(RED))
    disc(img, 9.5, 9.5, 5.2, hx(CREAM_HI))
    disc(img, 9.5, 9.5, 3.2, hx(RED))
    disc(img, 9.5, 9.5, 1.4, hx(GRAPHITE))
    put(img, 6, 5, hx(RED_HI))
    put(img, 7, 4, hx(RED_HI))
    outline(img, EDGE)
    return img


def draw_coffee():
    """☕ 휴식 — 틸 머그 + 김."""
    img = new_canvas()
    # 머그
    rect(img, 4, 8, 12, 16, hx(TEAL))
    col(img, 4, 8, 16, hx(TEAL_HI))
    row(img, 4, 12, 16, hx(TEAL_DK))
    # 커피 표면
    row(img, 5, 11, 8, hx(AMBER))
    # 손잡이
    for (x, y) in [(13, 10), (14, 10), (15, 11), (15, 12), (14, 13), (13, 13)]:
        put(img, x, y, hx(TEAL_DK))
    # 김 두 줄
    for (x, y) in [(6, 5), (6, 4), (7, 3), (10, 5), (10, 4), (9, 3)]:
        put(img, x, y, hx(STEEL_HI))
    outline(img, EDGE)
    return img


def draw_party():
    """🎉 축하 — 좌하단 꼭짓점에서 우상단으로 벌어지는 폭죽 콘 + 색색 콘페티."""
    img = new_canvas()
    # 콘 — 꼭짓점 O(2,17), 우상 방향 쐐기
    for y in range(GRID):
        for x in range(GRID):
            u, v = x - 2, 17 - y
            if u < 0 or v < 0:
                continue
            if v <= 1.4 * u and v >= 0.4 * u and u + v <= 11:
                put(img, x, y, hx(AMBER))
    # 콘 줄무늬 (입구 쪽)
    for y in range(GRID):
        for x in range(GRID):
            u, v = x - 2, 17 - y
            if 0 <= u and 0 <= v and 1.4 * u >= v >= 0.4 * u:
                if 9 <= u + v <= 11:
                    put(img, x, y, hx(GOLD))
                elif 6 <= u + v <= 7:
                    put(img, x, y, hx(RED))
    put(img, 2, 17, hx(AMBER_HI))
    put(img, 3, 16, hx(AMBER_HI))
    # 콘페티
    for (x, y, c) in [
        (7, 4, GOLD), (10, 2, TEAL), (13, 4, RED), (16, 2, GOLD_HI),
        (12, 7, GREEN_HI), (15, 7, TEAL_HI), (17, 5, RED_HI),
        (14, 10, GOLD), (17, 9, TEAL), (16, 13, RED),
    ]:
        put(img, x, y, hx(c))
        put(img, x + 1, y, hx(c))
    outline(img, EDGE)
    return img


def draw_star5():
    """🌟 별 기록 — 골드 5각 별."""
    img = new_canvas()
    import math as _math
    cx, cy, r_out, r_in = 9.5, 10.0, 7.6, 3.2
    pts = []
    for i in range(10):
        ang = -_math.pi / 2 + i * _math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * _math.cos(ang), cy + r * _math.sin(ang)))
    # 폴리곤 채움 (짝수-홀수 규칙)
    for y in range(GRID):
        for x in range(GRID):
            px, py = x + 0.5, y + 0.5
            inside = False
            j = len(pts) - 1
            for i in range(len(pts)):
                xi, yi = pts[i]
                xj, yj = pts[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            if inside:
                put(img, x, y, hx(GOLD))
    put(img, 8, 6, hx(GOLD_HI))
    put(img, 9, 5, hx(GOLD_HI))
    put(img, 8, 7, hx(GOLD_HI))
    outline(img, EDGE)
    return img


def draw_chart():
    """📊 통계 — 3색 막대그래프."""
    img = new_canvas()
    # 바닥선
    row(img, 3, 16, 16, hx(STEEL_DK))
    # 막대: 레드(낮음)·골드(중간)·틸(높음)
    rect(img, 4, 11, 6, 15, hx(RED))
    row(img, 4, 6, 11, hx(RED_HI))
    rect(img, 8, 7, 10, 15, hx(GOLD))
    row(img, 8, 10, 7, hx(GOLD_HI))
    rect(img, 12, 4, 14, 15, hx(TEAL))
    row(img, 12, 14, 4, hx(TEAL_HI))
    outline(img, EDGE)
    return img


def draw_palette():
    """🎨 테마 — 앰버 팔레트 + 물감 4점."""
    img = new_canvas()
    disc(img, 9.5, 10.0, 7.0, hx(WOOD))
    # 엄지 구멍 (우하단 파냄)
    for y in range(GRID):
        for x in range(GRID):
            dx, dy = x + 0.5 - 14.0, y + 0.5 - 13.5
            if dx * dx + dy * dy <= 2.6 * 2.6:
                put(img, x, y, (0, 0, 0, 0))
    put(img, 5, 5, hx(CREAM_HI))
    put(img, 6, 4, hx(CREAM_HI))
    # 물감
    for (x, y, c) in [(6, 7, RED), (10, 5, TEAL), (13, 7, GOLD), (5, 12, GREEN)]:
        put(img, x, y, hx(c))
        put(img, x + 1, y, hx(c))
        put(img, x, y + 1, hx(c))
        put(img, x + 1, y + 1, hx(c))
    outline(img, EDGE)
    return img


def draw_bell():
    """🔔 알림 — 골드 종 + 추."""
    img = new_canvas()
    # 꼭지
    rect(img, 9, 2, 10, 3, hx(GOLD))
    # 몸통 — 위가 좁고 아래로 벌어지는 종
    disc(img, 9.5, 8.0, 4.2, hx(GOLD))
    for dy in range(4):
        y = 10 + dy
        half = 4 + (dy // 2)
        row(img, 10 - half - 0, 9 + half, y, hx(GOLD))
    disc(img, 7.8, 6.2, 1.5, hx(GOLD_HI))
    # 치마단
    row(img, 4, 15, 13, hx(AMBER))
    # 추
    rect(img, 9, 14, 10, 15, hx(GRAPHITE))
    outline(img, EDGE)
    return img


def draw_clock():
    """🕐 시간 — 크림 문자반 + 스틸 링 + 바늘."""
    img = new_canvas()
    disc(img, 9.5, 9.5, 7.2, hx(STEEL))
    disc(img, 9.5, 9.5, 6.0, hx(CREAM_HI))
    # 눈금 4방향
    put(img, 9, 4, hx(STEEL_DK))
    put(img, 9, 15, hx(STEEL_DK))
    put(img, 4, 9, hx(STEEL_DK))
    put(img, 15, 9, hx(STEEL_DK))
    # 바늘 — 10시 10분
    col(img, 9, 6, 9, hx(GRAPHITE))
    put(img, 9, 9, hx(GRAPHITE))
    put(img, 10, 9, hx(GRAPHITE))
    for t in range(3):
        put(img, 10 + t, 9 - (t + 1) // 2, hx(GRAPHITE))
    put(img, 6, 5, hx(CREAM_HI))
    outline(img, EDGE)
    return img


ICONS = {
    'ui_sparkle': draw_sparkle,
    'ui_pencil': draw_pencil,
    'ui_pin': draw_pin,
    'ui_bulb': draw_bulb,
    'ui_home': draw_home,
    'ui_loop': draw_loop,
    'ui_scissors': draw_scissors,
    'ui_puzzle': draw_puzzle,
    'ui_user': draw_user,
    'ui_megaphone': draw_megaphone,
    'ui_bubble': draw_bubble,
    'ui_cart': draw_cart,
    'ui_question': draw_question,
    'ui_envelope': draw_envelope,
    'ui_document': draw_document,
    'ui_lock': draw_lock,
    'ui_moon': draw_moon,
    'ui_calendar': draw_calendar,
    'ui_briefcase': draw_briefcase,
    'ui_books': draw_books,
    'ui_broom': draw_broom,
    'ui_dumbbell': draw_dumbbell,
    'ui_gamepad': draw_gamepad,
    'ui_tree': draw_tree,
    'ui_sprout': draw_sprout,
    'ui_eye': draw_eye,
    'ui_sun': draw_sun,
    'ui_phone': draw_phone,
    'ui_ban': draw_ban,
    'ui_checkbox_off': draw_checkbox_off,
    'ui_checkbox_on': draw_checkbox_on,
    'ui_clipboard': draw_clipboard,
    'ui_rocket': draw_rocket,
    'ui_target': draw_target,
    'ui_coffee': draw_coffee,
    'ui_party': draw_party,
    'ui_star': draw_star5,
    'ui_chart': draw_chart,
    'ui_palette': draw_palette,
    'ui_bell': draw_bell,
    'ui_clock': draw_clock,
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
