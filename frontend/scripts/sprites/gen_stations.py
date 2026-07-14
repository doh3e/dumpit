# gen_stations.py — 상점 우주정거장 32×32 도트 생성기
# 사용: python gen_stations.py                    → frontend/src/assets/shop/에 PNG 저장
#       python gen_stations.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경, 핵심 디테일 2px 클러스터 이상
# (스펙: docs/superpowers/specs/2026-07-14-station-redesign-design.md)
import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw

ASSET_DIR = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'shop'
SIZE = 32


def new_canvas(width=SIZE, height=SIZE):
    return Image.new('RGBA', (width, height), (0, 0, 0, 0))


def hx(code):
    code = code.lstrip('#')
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16), 255)


def put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.load()[x, y] = color


def block(img, x, y, color, w=2, h=2, mask=None):
    for ox in range(w):
        for oy in range(h):
            if mask is None or mask(x + ox, y + oy):
                put(img, x + ox, y + oy, color)


def rect(img, x0, y0, x1, y1, color, mask=None):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if mask is None or mask(x, y):
                put(img, x, y, color)


def polyline(img, points, color, thick=2, mask=None):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for s in range(steps + 1):
            x = round(x0 + (x1 - x0) * s / steps)
            y = round(y0 + (y1 - y0) * s / steps)
            block(img, x, y, color, thick, thick, mask)


def in_disc(x, y, cx, cy, r):
    dx, dy = x + 0.5 - cx, y + 0.5 - cy
    return dx * dx + dy * dy <= r * r


def disc(img, cx, cy, r, shader):
    """원 내부 픽셀 순회. shader(x, y, nx, ny) -> RGBA 또는 None."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                color = shader(x, y, dx / r, dy / r)
                if color is not None:
                    put(img, x, y, color)


def sphere_shade(palette):
    """좌상단 광원 셰이더. palette는 밝은→어두운 순."""
    n = len(palette)

    def shader(x, y, nx, ny):
        d = math.hypot(nx + 0.45, ny + 0.45)
        f = d / 1.5 * n
        idx = min(int(f), n - 1)
        if idx + 1 < n and (f - idx) > 0.85 and (x + y) % 2 == 0:
            idx += 1
        return palette[idx]

    return shader


def tri(img, p0, p1, p2, color, mask=None):
    def edge(a, b, px, py):
        return (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])

    xs = [p[0] for p in (p0, p1, p2)]
    ys = [p[1] for p in (p0, p1, p2)]
    for y in range(min(ys), max(ys) + 1):
        for x in range(min(xs), max(xs) + 1):
            d0 = edge(p0, p1, x, y)
            d1 = edge(p1, p2, x, y)
            d2 = edge(p2, p0, x, y)
            if (d0 >= 0 and d1 >= 0 and d2 >= 0) or (d0 <= 0 and d1 <= 0 and d2 <= 0):
                if mask is None or mask(x, y):
                    put(img, x, y, color)


# ---- 팔레트 (테마 토큰 근거, 밝은→어두운) ----
PAL = {
    'steel':  [hx('#E8ECF2'), hx('#B9C2D0'), hx('#7C8798'), hx('#4C5560')],
    'teal':   [hx('#7FD1C8'), hx('#3BA7A0'), hx('#2A7E7A'), hx('#1F5F5C')],
    'mint':   [hx('#D9F2EA'), hx('#8FD8C2'), hx('#3FA98C'), hx('#2A7260')],
    'glass':  [hx('#EAF7FA'), hx('#BFE3EC'), hx('#8FBFCF'), hx('#6E9FB5')],
    'moon':   [hx('#E8E8EE'), hx('#C8C8D0'), hx('#9A9AA6'), hx('#75757F')],
    'sprout': [hx('#DCEBCE'), hx('#A5C97A'), hx('#5C8A3C'), hx('#3E6128')],
    'galaxy': [hx('#DBDDF0'), hx('#9BA1E0'), hx('#6D74C9'), hx('#43478C')],
    'wood':   [hx('#E7D5B8'), hx('#C9A36B'), hx('#A8763E'), hx('#6E4B26')],
    'candy':  [hx('#F2D7E2'), hx('#EE9BBE'), hx('#E05C8A'), hx('#9E3D60')],
    'ginger': [hx('#E8B98A'), hx('#C98A55'), hx('#A66334'), hx('#7A4520')],
}
GOLD = hx('#F5C842')
GOLD_DEEP = hx('#E8A030')
WHITE = hx('#FFF7FA')
SMOKE = [hx('#E8E8EE'), hx('#CDCDD6')]


def box_shade(img, x0, y0, x1, y1, pal, mask=None):
    """직육면체 셰이딩 — 본체 중간톤, 상·좌 1px 하이라이트, 하·우 1px 그늘."""
    rect(img, x0, y0, x1, y1, pal[1], mask)
    rect(img, x0, y0, x1, y0, pal[0], mask)          # 윗면
    rect(img, x0, y0, x0, y1, pal[0], mask)          # 좌측
    rect(img, x0, y1, x1, y1, pal[2], mask)          # 아랫면
    rect(img, x1, y0, x1, y1, pal[2], mask)          # 우측


# ---- 정지 8종 ----

def draw_default():
    # 인공위성 — 스틸 본체 + 좌우 틸 태양광 패널 + 안테나 (현행 실루엣 계승)
    img = new_canvas()
    steel, teal = PAL['steel'], PAL['teal']
    # 연결 암
    rect(img, 9, 15, 12, 16, steel[2])
    rect(img, 19, 15, 22, 16, steel[2])
    # 태양광 패널 (좌: 밝음 / 우: 한 단계 어둡게 — 좌상단 광원)
    for side, x0, shade in ((0, 2, 0), (1, 23, 1)):
        rect(img, x0, 10, x0 + 6, 21, teal[1 + shade])
        for gy in (13, 17):                       # 가로 격자
            rect(img, x0, gy, x0 + 6, gy, teal[2 + shade if 2 + shade < 4 else 3])
        rect(img, x0, 10, x0 + 6, 10, teal[0 + shade])  # 상단 하이라이트
        rect(img, x0 + 3, 10, x0 + 3, 21, teal[2 + shade if 2 + shade < 4 else 3])  # 세로 격자
    # 본체
    box_shade(img, 12, 12, 19, 19, steel)
    rect(img, 13, 13, 15, 14, steel[0])           # 하이라이트 면
    block(img, 15, 16, GOLD, 2, 2)                # 관측창
    # 안테나
    rect(img, 15, 7, 15, 11, steel[2])
    block(img, 14, 5, GOLD, 2, 2)                 # 수신구
    # 하단 스러스터
    rect(img, 14, 20, 17, 21, steel[3])
    return img


def draw_mint():
    # 민트 궤도 정거장 — 링 + 중앙 허브 + 링 끝 모듈 2개
    img = new_canvas()
    mint = PAL['mint']
    cx = cy = 16
    a, b, rot = 13.0, 5.4, -0.34
    cr, sr = math.cos(rot), math.sin(rot)

    def ring_pass(front):
        for i in range(2880):
            t = i * math.pi / 1440
            u, v = a * math.cos(t), b * math.sin(t)
            if front != (v >= -0.4):
                continue
            x = cx + u * cr - v * sr
            y = cy + u * sr + v * cr
            color = mint[1] if front else mint[3]
            block(img, round(x), round(y), color, 2, 2)

    ring_pass(front=False)
    disc(img, cx, cy, 6.2, sphere_shade(mint))    # 허브
    rect(img, 11, 16, 21, 17, mint[3], lambda x, y: in_disc(x, y, cx, cy, 6.0))  # 허브 적도 밴드
    block(img, 14, 13, mint[0], 2, 2)             # 허브 하이라이트
    for wx in (12, 15, 18):                       # 밴드 위 창 3개 — 행성이 아니라 정거장으로 읽히게
        put(img, wx, 16, GOLD); put(img, wx, 17, GOLD_DEEP)
    ring_pass(front=True)
    # 전면 링 창 4개
    for t in (0.35, 0.85, math.pi - 0.85, math.pi - 0.35):
        u, v = a * math.cos(t), b * math.sin(t)
        if v < -0.4:
            u, v = a * math.cos(-t), b * math.sin(-t)
        wx = round(cx + u * cr - v * sr)
        wy = round(cy + u * sr + v * cr)
        block(img, wx, wy, GOLD, 2, 1)
    # 링 양끝 모듈
    for t in (0.0, math.pi):
        u, v = a * math.cos(t), b * math.sin(t)
        mx = round(cx + u * cr - v * sr)
        my = round(cy + u * sr + v * cr)
        box_shade(img, mx - 2, my - 2, mx + 1, my + 1, mint)
        put(img, mx, my, GOLD)
        put(img, mx - 1, my, GOLD)
    return img


def draw_moonbase():
    # 달 기지 — 크레이터 지면 + 유리 돔 + 사이드 모듈 + 안테나
    img = new_canvas()
    moon, glass, steel = PAL['moon'], PAL['glass'], PAL['steel']
    # 지면
    rect(img, 1, 25, 30, 29, moon[1])
    rect(img, 1, 25, 30, 25, moon[0])
    rect(img, 1, 29, 30, 29, moon[2])
    for x, y in ((4, 27), (26, 28)):              # 크레이터 그늘 2개
        block(img, x, y, moon[2], 3, 1)
        block(img, x, y - 1, moon[3], 2, 1)
    # 돔 (반구, 지면 위)
    dome_pal = glass

    def dome_shader(x, y, nx, ny):
        if y > 24:
            return None
        return sphere_shade(dome_pal)(x, y, nx, ny)

    disc(img, 11, 25, 8.2, dome_shader)
    for gx in (7, 11, 15):                        # 돔 패널 세로 심
        for y in range(17, 25):
            if in_disc(gx, y, 11, 25, 7.4):
                put(img, gx, y, glass[2])
    block(img, 8, 19, WHITE, 2, 2)                # 유리 반짝임
    # 연결 튜브 + 모듈
    rect(img, 18, 21, 21, 23, steel[1])
    rect(img, 18, 21, 21, 21, steel[0])
    box_shade(img, 21, 17, 28, 24, steel)
    block(img, 23, 19, GOLD, 2, 2)                # 모듈 창
    # 안테나 (모듈 위)
    rect(img, 26, 12, 26, 16, steel[2])
    block(img, 25, 10, GOLD, 2, 2)
    return img


def draw_mothership():
    # 모선 — 원반 선체 + 유리 돔 + 창문 라이트 열
    img = new_canvas()
    steel, glass = PAL['steel'], PAL['glass']
    cx, cy, a, b = 16, 17, 12.5, 4.6

    def hull(x, y):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        return (dx / a) ** 2 + (dy / b) ** 2 <= 1

    for y in range(12, 23):
        for x in range(3, 30):
            if hull(x, y):
                dy = y - cy
                tone = 0 if dy < -2 else 1 if dy < -0.5 else 2 if dy < 2.5 else 3
                put(img, x, y, steel[tone])
    # 창문 띠 배경 (어두운 밴드 위에 골드 창이 또렷하게)
    for x in range(5, 28):
        if hull(x, 16):
            put(img, x, 16, steel[3])
    # 돔 (상단 반구)
    def dome_shader(x, y, nx, ny):
        if y > 13:
            return None
        return sphere_shade(glass)(x, y, nx, ny)

    disc(img, 16, 13.5, 5.2, dome_shader)
    block(img, 14, 10, WHITE, 2, 2)               # 돔 반짝임
    # 창문 라이트 열 (선체 중앙띠)
    for wx in (7, 11, 15, 19, 23):
        block(img, wx, 16, GOLD, 2, 1)
    rect(img, 4, 15, 27, 15, steel[1])            # 창문 띠 위 하이라이트 라인
    # 하단 라이트 3개
    for lx, ly in ((9, 21), (15, 22), (21, 21)):
        block(img, lx, ly, PAL['teal'][0], 2, 1)
    return img


def draw_sprout():
    # 새싹 온실 — 유리 온실 + 화분 새싹 (sprout 팔레트)
    img = new_canvas()
    sp, glass, wood = PAL['sprout'], PAL['glass'], PAL['wood']
    pale = hx('#E9F5EC')
    grid = hx('#BBD8C4')
    # 흙 받침
    rect(img, 5, 27, 26, 29, wood[2])
    rect(img, 5, 27, 26, 27, wood[1])
    # 유리 벽
    rect(img, 7, 15, 24, 26, pale)
    for gx in (11, 16, 21):
        rect(img, gx, 15, gx, 26, grid)
    rect(img, 7, 20, 24, 20, grid)
    # 모서리 기둥
    rect(img, 7, 15, 7, 26, sp[2])
    rect(img, 24, 15, 24, 26, sp[3])
    # 유리 지붕 (박공)
    tri(img, (16, 7), (5, 15), (26, 15), glass[1])
    tri(img, (16, 9), (9, 14), (23, 14), glass[0])
    polyline(img, [(16, 7), (5, 15)], sp[2], 1)
    polyline(img, [(16, 7), (26, 15)], sp[3], 1)
    rect(img, 5, 15, 26, 15, sp[2])
    # 안의 새싹 2포기 (화분 + 줄기 + 잎)
    for px, top in ((10, 20), (18, 18)):
        rect(img, px - 1, 24, px + 1, 26, wood[3])          # 화분
        rect(img, px, top + 2, px, 23, sp[2])               # 줄기
        block(img, px - 2, top, sp[1], 2, 2)                # 잎 좌
        block(img, px + 1, top, sp[1], 2, 2)                # 잎 우
        put(img, px, top - 1, sp[0]); put(img, px + 1, top - 1, sp[0])  # 새순
    return img


def draw_galaxy():
    # 은하수 전망대 — 돔 + 관측 슬릿 + 망원경 + 별 (galaxy 팔레트)
    img = new_canvas()
    gx_pal, steel = PAL['galaxy'], PAL['steel']
    # 원통 기단
    rect(img, 9, 18, 22, 28, gx_pal[2])
    rect(img, 9, 18, 12, 28, gx_pal[1])           # 좌측 밝음
    rect(img, 21, 18, 22, 28, gx_pal[3])          # 우측 그늘
    rect(img, 8, 27, 23, 28, gx_pal[3])           # 받침
    # 돔 (반구)
    def dome_shader(x, y, nx, ny):
        if y > 18:
            return None
        return sphere_shade(gx_pal)(x, y, nx, ny)

    disc(img, 16, 18.5, 7.6, dome_shader)
    # 관측 슬릿 + 망원경 (우상향)
    rect(img, 17, 11, 18, 18, gx_pal[3])
    polyline(img, [(18, 12), (22, 8)], steel[1], 2)
    block(img, 22, 7, steel[0], 2, 2)
    # 창 2개 + 문
    block(img, 11, 21, GOLD, 2, 2)
    block(img, 19, 21, GOLD, 2, 2)
    rect(img, 14, 23, 17, 28, gx_pal[3])
    put(img, 16, 25, GOLD)
    # 별 반짝임
    for sx, sy in ((5, 6), (27, 5), (3, 15)):
        put(img, sx, sy, GOLD)
        put(img, sx - 1, sy, GOLD_DEEP); put(img, sx + 1, sy, GOLD_DEEP)
        put(img, sx, sy - 1, GOLD_DEEP); put(img, sx, sy + 1, GOLD_DEEP)
    return img


def draw_wood():
    # 원목 오두막 — 통나무 줄 + 박공 지붕 + 굴뚝 연기 (wood 팔레트)
    img = new_canvas()
    wd, steel = PAL['wood'], PAL['steel']
    # 통나무 벽 (2px 줄)
    for i, y in enumerate(range(17, 28, 2)):
        tone = wd[1] if i % 2 == 0 else wd[2]
        rect(img, 6, y, 25, min(y + 1, 27), tone)
    rect(img, 24, 17, 25, 27, wd[3])              # 우측 그늘
    rect(img, 6, 17, 6, 27, wd[0])                # 좌측 하이라이트
    # 지붕 (박공, 1px 처마 돌출)
    tri(img, (16, 8), (4, 17), (27, 17), wd[3])
    polyline(img, [(16, 8), (4, 17)], wd[2], 1)   # 좌측 릿지 하이라이트
    rect(img, 4, 16, 27, 17, wd[3])
    # 굴뚝 + 연기
    rect(img, 21, 9, 23, 13, steel[2])
    rect(img, 21, 9, 23, 9, steel[1])
    block(img, 23, 6, SMOKE[1], 2, 2)
    block(img, 25, 3, SMOKE[0], 2, 2)
    # 문 + 손잡이
    rect(img, 14, 21, 17, 27, wd[3])
    rect(img, 14, 21, 14, 27, wd[2])
    put(img, 16, 24, GOLD)
    # 창 (불빛)
    rect(img, 8, 19, 11, 22, GOLD)
    rect(img, 9, 19, 9, 22, GOLD_DEEP)
    rect(img, 8, 20, 11, 20, GOLD_DEEP)
    return img


def draw_candy():
    # 과자집 — 진저브레드 벽 + 아이싱 지붕 + 박하사탕 창 (candy 팔레트)
    img = new_canvas()
    cd, gg = PAL['candy'], PAL['ginger']
    # 아이싱 눈 바닥
    rect(img, 4, 27, 27, 29, hx('#FDEFF5'))
    rect(img, 4, 27, 27, 27, WHITE)
    # 진저브레드 벽
    rect(img, 7, 16, 24, 26, gg[1])
    rect(img, 7, 16, 7, 26, gg[0])
    rect(img, 23, 16, 24, 26, gg[2])
    # 지붕 (캔디 핑크) + 아이싱 스캘럽
    tri(img, (16, 7), (5, 16), (26, 16), cd[2])
    tri(img, (16, 9), (10, 14), (22, 14), cd[1])
    for sx in range(5, 26, 3):
        block(img, sx, 15, WHITE, 2, 2)
    put(img, 16, 6, WHITE); put(img, 15, 6, WHITE)  # 꼭대기 아이싱
    # 박하사탕 창 2개 (흰 바탕 + 핑크 소용돌이 디더)
    for wx in (10, 19):
        rect(img, wx, 19, wx + 2, 21, WHITE)
        put(img, wx + 1, 19, cd[2]); put(img, wx, 21, cd[2]); put(img, wx + 2, 20, cd[2])
    # 초콜릿 문 (아치) + 흰 테두리
    rect(img, 13, 22, 18, 26, WHITE)
    rect(img, 14, 22, 17, 26, gg[3])
    put(img, 14, 21, gg[3]); put(img, 17, 21, gg[3])
    put(img, 16, 24, GOLD)
    # 막대사탕 (우측)
    rect(img, 27, 22, 27, 27, WHITE)
    disc(img, 27.5, 20, 2.3, lambda x, y, nx, ny: cd[1] if (x + y) % 2 == 0 else WHITE)
    return img


# ---- 동물 애니 3종 (8프레임 256×32 시트, fps 5) ----

def frames_sheet(frame_fns):
    """[fn, ...] → 가로로 이어붙인 애니 시트."""
    frames = [fn() for fn in frame_fns]
    sheet = Image.new('RGBA', (SIZE * len(frames), SIZE), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * SIZE, 0), f)
    return sheet


PAL['pup'] = [hx('#F5E3C0'), hx('#E3BE8A'), hx('#BE9257'), hx('#8A6437')]
PAL['cat'] = [hx('#EDEDF2'), hx('#C4C4CE'), hx('#8F8F9E'), hx('#5C5C6B')]
PAL['ham'] = [hx('#FBE6C4'), hx('#F2C892'), hx('#D89A50'), hx('#A06A2E')]
DARK = hx('#3A3230')
PINK = hx('#E89AA6')


def draw_dog():
    # 엎드린 강아지 — 꼬리가 큰 덩어리로 좌우 스윙(핑퐁 4단계) + 스윙 끝에서 귀 들썩
    pup = PAL['pup']

    def frame(k):
        img = new_canvas()
        swing = [0, 1, 2, 3, 3, 2, 1, 0][k]       # 0=아래 … 3=위
        # 몸통 (엎드림)
        for y in range(17, 27):
            for x in range(9, 26):
                dx, dy = x + 0.5 - 17.5, y + 0.5 - 23
                if (dx / 8.5) ** 2 + (dy / 4.6) ** 2 <= 1:
                    tone = 1 if dy < 0 else 2
                    if dx > 5.5:
                        tone = 2 if dy < 0 else 3
                    put(img, x, y, pup[tone])
        rect(img, 10, 18, 15, 19, pup[0])          # 등 하이라이트
        # 머리 (좌측, 살짝 큼직하게)
        disc(img, 10, 15, 5.6, sphere_shade(pup))
        # 주둥이 + 코 + 입
        rect(img, 5, 16, 9, 19, pup[0])
        block(img, 5, 16, DARK, 2, 2)              # 코
        put(img, 7, 19, pup[2])                    # 입
        # 눈 (또렷한 2px)
        block(img, 10, 13, DARK, 2, 2)
        put(img, 10, 13, hx('#FFFFFF'))            # 눈 반짝
        # 귀 (늘어진 귀 — 스윙 절정에서 1px 들썩)
        ear_lift = 1 if swing == 3 else 0
        rect(img, 6, 10 - ear_lift, 8, 14 - ear_lift, pup[3])
        rect(img, 12, 9 - ear_lift, 14, 13 - ear_lift, pup[3])
        # 앞발
        rect(img, 8, 25, 12, 26, pup[1])
        put(img, 10, 25, pup[2])
        # 꼬리 — 뿌리(24,22)에서 4단계 스윙, 2px 두께 큰 덩어리
        tips = [(30, 26), (31, 22), (30, 18), (28, 14)]
        mids = [(27, 24), (28, 22), (27, 20), (26, 17)]
        polyline(img, [(24, 22), mids[swing], tips[swing]], pup[2], 2)
        block(img, tips[swing][0] - 1, tips[swing][1] - 1, pup[0], 2, 2)  # 꼬리 끝 밝은 술
        return img

    return frames_sheet([lambda k=k: frame(k) for k in range(8)])


def draw_cat():
    # 웅크린(식빵) 고양이 — 꼬리 끝이 앞에서 살랑(핑퐁) + 4프레임마다 귀 쫑긋
    cat = PAL['cat']

    def frame(k):
        img = new_canvas()
        sway = [0, 1, 2, 3, 3, 2, 1, 0][k]
        perk = 1 if k in (3, 4) else 0             # 귀 쫑긋
        # 몸통 (식빵 자세)
        for y in range(15, 27):
            for x in range(8, 26):
                dx, dy = x + 0.5 - 17, y + 0.5 - 22
                if (dx / 8.8) ** 2 + (dy / 5.2) ** 2 <= 1:
                    put(img, x, y, cat[1] if dy < 0 else cat[2])
        rect(img, 12, 16, 20, 17, cat[0])          # 등 하이라이트
        # 줄무늬 2개
        for sx in (17, 21):
            rect(img, sx, 16, sx + 1, 20, cat[3], lambda x, y: (x + 0.5 - 17) ** 2 / 77 + (y + 0.5 - 22) ** 2 / 27 <= 1)
        # 머리
        disc(img, 11, 14, 5.4, sphere_shade(cat))
        # 귀 (삼각 2개 — 쫑긋 시 1px 상승)
        tri(img, (7, 8 - perk), (7, 11), (10, 10), cat[2])
        tri(img, (14, 7 - perk), (12, 10), (15, 10), cat[2])
        put(img, 8, 10, PINK); put(img, 13, 9, PINK)  # 귀 안쪽
        # 자는 눈 (^ ^) + 코·수염
        put(img, 8, 14, DARK); put(img, 9, 13, DARK); put(img, 10, 14, DARK)
        put(img, 12, 13, DARK); put(img, 13, 12, DARK); put(img, 14, 13, DARK)
        put(img, 11, 16, PINK)
        put(img, 6, 16, cat[3]); put(img, 5, 17, cat[3])   # 수염 좌
        put(img, 15, 16, cat[3]); put(img, 16, 17, cat[3])
        # 꼬리 — 오른쪽 뒤에서 S자로 치켜들고 끝이 위아래로 살랑 (2px 큰 덩어리)
        mids = [(28, 24), (29, 22), (29, 20), (28, 18)]
        tips = [(30, 21), (30, 18), (29, 15), (27, 13)]
        polyline(img, [(23, 22), (26, 24), mids[sway], tips[sway]], cat[3], 2)
        block(img, tips[sway][0] - 1, tips[sway][1] - 1, cat[0], 2, 2)  # 흰 꼬리 끝
        return img

    return frames_sheet([lambda k=k: frame(k) for k in range(8)])


def draw_hamster():
    # 쳇바퀴 햄스터 — 스포크가 프레임당 11.25° 회전(4폭 대칭 → 8프레임 = 90° = 무이음 루프) + 다리 교차
    ham, steel = PAL['ham'], PAL['steel']

    def frame(k):
        img = new_canvas()
        rot = k * (math.pi / 16)                   # 11.25°/프레임
        cx, cy, r = 16, 15, 11.5
        # 받침대 (바퀴 뒤)
        tri(img, (16, 24), (9, 30), (23, 30), steel[2])
        rect(img, 7, 29, 25, 30, steel[3])
        # 바퀴 링 (2px)
        for i in range(2880):
            t = i * math.pi / 1440
            x = cx + r * math.cos(t)
            y = cy + r * math.sin(t)
            block(img, round(x) - 1, round(y) - 1, steel[1], 2, 2)
        # 스포크 4개 (회전 — 큰 색 덩어리)
        for s in range(4):
            th = rot + s * (math.pi / 2)
            pts = []
            for rr in (0, 4, 7, 10):
                pts.append((round(cx + rr * math.cos(th)), round(cy + rr * math.sin(th))))
            polyline(img, pts, steel[2], 2)
        block(img, cx - 1, cy - 1, steel[0], 2, 2)  # 축
        # 햄스터 (바퀴 안 하단, 달리는 중)
        bob = 1 if k % 2 == 0 else 0
        hy = 20 - bob
        for y in range(hy - 4, hy + 4):
            for x in range(11, 21):
                dx, dy = x + 0.5 - 15.5, y + 0.5 - hy
                if (dx / 4.8) ** 2 + (dy / 3.8) ** 2 <= 1:
                    put(img, x, y, ham[1] if dy < 0 else ham[2])
        rect(img, 13, hy - 3, 16, hy - 2, ham[0])   # 등 하이라이트
        # 머리(우측 진행 방향) + 귀 + 눈 + 볼
        disc(img, 19.5, hy - 1.5, 3.4, sphere_shade(ham))
        put(img, 19, hy - 5 + bob, ham[2]); put(img, 20, hy - 5 + bob, ham[2])  # 귀
        put(img, 20, hy - 2, DARK)                  # 눈
        put(img, 21, hy, PINK)                      # 볼
        # 다리 스커리 (2단계 교차)
        if k % 2 == 0:
            block(img, 12, hy + 3, ham[3], 2, 1); block(img, 17, hy + 4, ham[3], 2, 1)
        else:
            block(img, 13, hy + 4, ham[3], 2, 1); block(img, 18, hy + 3, ham[3], 2, 1)
        return img

    return frames_sheet([lambda k=k: frame(k) for k in range(8)])


SPRITES = {
    'station_default': draw_default,
    'station_mint': draw_mint,
    'station_moonbase': draw_moonbase,
    'station_mothership': draw_mothership,
    'station_sprout': draw_sprout,
    'station_galaxy': draw_galaxy,
    'station_wood': draw_wood,
    'station_candy': draw_candy,
    'station_dog': draw_dog,
    'station_cat': draw_cat,
    'station_hamster': draw_hamster,
}


def save_sprite(name, img):
    out = ASSET_DIR / f'{name}.png'
    img.save(out)
    print(f'{name}.png -> {out}')


def build_preview_sheet(sprites, out_path, scale=8, row_width=1100):
    pad, label_h = 8, 26
    entries = [(n, i.resize((i.width * scale, i.height * scale), Image.NEAREST))
               for n, i in sprites.items()]
    row_width = max(row_width, max(b.width for _, b in entries) + pad * 2)
    rows, cur, cur_w = [], [], 0
    for name, big in entries:
        w = big.width + pad * 2
        if cur and cur_w + w > row_width:
            rows.append(cur)
            cur, cur_w = [], 0
        cur.append((name, big))
        cur_w += w
    if cur:
        rows.append(cur)
    height = sum(max(b.height for _, b in r) + label_h + pad * 2 for r in rows)
    sheet = Image.new('RGBA', (row_width, height), (26, 26, 34, 255))
    drawer = ImageDraw.Draw(sheet)
    y = 0
    for r in rows:
        row_h = max(b.height for _, b in r)
        x = 0
        for name, big in r:
            sheet.paste(big, (x + pad, y + pad), big)
            drawer.text((x + pad, y + pad + row_h + 4), name, fill=(230, 230, 230, 255))
            x += big.width + pad * 2
        y += row_h + label_h + pad * 2
    sheet.save(out_path)
    print(f'preview -> {out_path}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', metavar='OUT', help='미리보기 시트만 저장')
    args = parser.parse_args()
    rendered = {name: fn() for name, fn in SPRITES.items()}
    if args.preview:
        build_preview_sheet(rendered, args.preview)
        return
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for name, img in rendered.items():
        save_sprite(name, img)


if __name__ == '__main__':
    main()
