# gen_planets.py — 상점 행성 32×32 도트 생성기
# 사용: python gen_planets.py            → frontend/src/assets/shop/에 PNG 저장
#       python gen_planets.py --preview OUT.png  → 미리보기 시트만 저장 (8배 확대, 검수용)
# 스타일: 외곽선 없음, 좌상단 광원, 톤 2~4개, 투명 배경, 핵심 디테일 2px 클러스터 이상
# (스펙: docs/superpowers/specs/2026-07-13-planet-sprites-expansion-design.md)
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
    """원 내부 픽셀 순회. shader(x, y, nx, ny) -> RGBA 또는 None (nx,ny는 -1~1 정규 좌표)."""
    for y in range(img.height):
        for x in range(img.width):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * dx + dy * dy <= r * r:
                color = shader(x, y, dx / r, dy / r)
                if color is not None:
                    put(img, x, y, color)


def sphere_shade(palette):
    """좌상단 광원 셰이더. palette는 밝은→어두운 순. 톤 경계는 체커 디더링."""
    n = len(palette)

    def shader(x, y, nx, ny):
        d = math.hypot(nx + 0.45, ny + 0.45)
        f = d / 1.5 * n
        idx = min(int(f), n - 1)
        if idx + 1 < n and (f - idx) > 0.85 and (x + y) % 2 == 0:
            idx += 1
        return palette[idx]

    return shader


def darker_step(pal, color, step=1):
    """팔레트 내에서 color보다 step 단계 어두운 톤."""
    return pal[min(pal.index(color) + step, len(pal) - 1)]


def tri(img, p0, p1, p2, color):
    """삼각형 채움 (고래 꼬리·지느러미용)."""
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
                put(img, x, y, color)


def crater(img, cx, cy, r, fill, shadow, rim):
    """크레이터 — 내부 채움 + 좌상단 안쪽 그늘 + 우하단 바깥 림 하이라이트."""
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d2 = dx * dx + dy * dy
            if d2 <= r * r:
                inner_edge = d2 > (r - 1.2) ** 2 and dx + dy < 0
                put(img, x, y, shadow if inner_edge else fill)
            elif d2 <= (r + 1.1) ** 2 and dx + dy > 0:
                put(img, x, y, rim)


# ---- 스프라이트별 draw 함수 (반환: RGBA Image) ----

def draw_default():
    # 틸 구체 + 가로 음영 밴드 2개 — 앱 accent 틸과 조화
    img = new_canvas()
    pal = [hx('#7FD1C8'), hx('#3BA7A0'), hx('#2A7E7A'), hx('#1F5F5C')]
    base = sphere_shade(pal)

    def shader(x, y, nx, ny):
        c = base(x, y, nx, ny)
        if y in (12, 13, 20, 21):
            return darker_step(pal, c)
        return c

    disc(img, 16, 16, 14, shader)
    return img


def draw_crimson():
    # 진홍 구체 + 용암 균열(최암 톤, 2px 폭)
    img = new_canvas()
    pal = [hx('#E8837A'), hx('#C94F4F'), hx('#96343C'), hx('#6E2430')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    mask = lambda x, y: in_disc(x, y, 16, 16, 13.5)
    crack = hx('#6E2430')
    polyline(img, [(7, 12), (13, 15), (11, 22), (16, 26)], crack, 2, mask)
    polyline(img, [(19, 5), (22, 12), (18, 17), (24, 22)], crack, 2, mask)
    polyline(img, [(13, 15), (18, 17)], crack, 2, mask)
    return img


def draw_ice():
    # 얼음 구체 + 크리스탈 면 분할선(최명 톤)
    img = new_canvas()
    pal = [hx('#EAF7FA'), hx('#BFE3EC'), hx('#8FBFCF'), hx('#6E9FB5')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    mask = lambda x, y: in_disc(x, y, 16, 16, 13.5)
    facet = hx('#EAF7FA')
    edge = hx('#6E9FB5')
    # 크리스탈 능선 — 사선 대각 릿지 2줄 + 어두운 모서리로 각진 느낌
    polyline(img, [(5, 18), (13, 11), (21, 13), (27, 9)], facet, 2, mask)
    polyline(img, [(13, 11), (16, 20), (12, 27)], facet, 2, mask)
    polyline(img, [(16, 20), (24, 18)], edge, 2, mask)
    polyline(img, [(21, 13), (24, 18), (23, 25)], edge, 2, mask)
    return img


def draw_ringed():
    # 라벤더 구체(r=10) + 대각 골드 고리 + 본체 위 고리 그림자
    img = new_canvas()
    body_pal = [hx('#B79BE0'), hx('#9A7BC8'), hx('#7A5CA8'), hx('#5C4483')]
    ring_light, ring_dark = hx('#E8C170'), hx('#B08A4A')
    cx = cy = 16
    body_r = 10
    a, b, rot = 14.5, 5.2, -0.32  # 반장축·반단축·기울기

    def ring_pass(front):
        cr, sr = math.cos(rot), math.sin(rot)
        for i in range(2880):
            t = i * math.pi / 1440
            u, v = a * math.cos(t), b * math.sin(t)
            if front != (v >= -0.4):  # 경계 겹침 여유 — 좌우 끝 끊김 방지
                continue
            x = cx + u * cr - v * sr
            y = cy + u * sr + v * cr
            color = ring_light if front else ring_dark
            block(img, round(x), round(y), color, 2, 2)

    ring_pass(front=False)                      # 본체 뒤쪽 고리
    disc(img, cx, cy, body_r, sphere_shade(body_pal))
    # 고리 그림자 — 앞고리 경로 2px 아래, 본체 내부만
    cr, sr = math.cos(rot), math.sin(rot)
    for i in range(1440):
        t = i * math.pi / 720
        u, v = a * math.cos(t), b * math.sin(t)
        if v < 0:
            continue
        x = round(cx + u * cr - v * sr)
        y = round(cy + u * sr + v * cr) + 2
        if in_disc(x, y, cx, cy, body_r):
            put(img, x, y, hx('#5C4483'))
    ring_pass(front=True)                       # 본체 앞쪽 고리
    return img


def draw_moon():
    # 회백 구체 + 크레이터 4개
    img = new_canvas()
    pal = [hx('#E8E8EE'), hx('#C8C8D0'), hx('#9A9AA6'), hx('#75757F')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    fill, shadow, rim = hx('#9A9AA6'), hx('#75757F'), hx('#E8E8EE')
    crater(img, 11, 12, 2.6, fill, shadow, rim)
    crater(img, 20, 9, 1.8, fill, shadow, rim)
    crater(img, 19, 21, 3.0, fill, shadow, rim)
    crater(img, 9, 20, 1.6, fill, shadow, rim)
    return img


def draw_ocean():
    # 물의 행성 — 파도 갈매기 무늬(포말)
    img = new_canvas()
    pal = [hx('#7FB8E8'), hx('#4E8FD0'), hx('#3E7FC1'), hx('#2C5F96')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    mask = lambda x, y: in_disc(x, y, 16, 16, 13)
    foam = hx('#EAF4FC')
    polyline(img, [(7, 13), (10, 11), (13, 13)], foam, 1, mask)
    polyline(img, [(15, 18), (18, 16), (21, 18)], foam, 1, mask)
    polyline(img, [(9, 22), (12, 20), (15, 22)], foam, 1, mask)
    polyline(img, [(19, 24), (22, 22), (25, 24)], foam, 1, mask)
    return img


def draw_sprout():
    # 초록 행성 + 정수리에서 돋아난 새싹 (새싹 정원 테마 세트감)
    img = new_canvas()
    pal = [hx('#8CD084'), hx('#5FA85A'), hx('#3F7F42')]
    disc(img, 16, 18, 12, sphere_shade(pal))
    mask = lambda x, y: in_disc(x, y, 16, 18, 11)
    # 짙은 수풀 패치
    for (bx, by, w, h) in [(11, 16, 3, 2), (18, 21, 4, 2), (13, 24, 3, 2)]:
        block(img, bx, by, hx('#3F7F42'), w, h, mask)
    # 흙 + 줄기 + 좌우로 벌어진 떡잎 한 쌍
    block(img, 14, 7, hx('#8A6A4A'), 4, 2)
    block(img, 15, 2, hx('#3F7F42'), 2, 6)
    block(img, 11, 3, hx('#8CD084'), 4, 2)
    put(img, 10, 4, hx('#8CD084'))
    block(img, 17, 3, hx('#8CD084'), 4, 2)
    put(img, 21, 4, hx('#8CD084'))
    return img


def draw_earth():
    # 푸른 구체 + 대륙 + 구름 띠
    img = new_canvas()
    pal = [hx('#6FA0E0'), hx('#3E6FB8'), hx('#2A4E8A')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    mask = lambda x, y: in_disc(x, y, 16, 16, 13)

    def land(bx, by, w, h):
        # 음영 쪽 대륙은 어두운 초록
        for ox in range(w):
            for oy in range(h):
                x, y = bx + ox, by + oy
                if not mask(x, y):
                    continue
                d = math.hypot((x + 0.5 - 16) / 14 + 0.45, (y + 0.5 - 16) / 14 + 0.45)
                put(img, x, y, hx('#3F7F42') if d > 1.0 else hx('#57A05B'))

    # 대륙 A (좌상 대형) — 계단식으로 흘러내리는 유기적 실루엣
    land(8, 8, 4, 2); land(6, 9, 6, 3); land(8, 12, 5, 3); land(7, 15, 3, 2); land(11, 14, 2, 2)
    # 대륙 B (우중)
    land(21, 10, 3, 2); land(19, 12, 4, 3); land(22, 15, 2, 2)
    # 대륙 C (하단 소형)
    land(13, 22, 4, 2); land(16, 24, 2, 1)
    cloud = hx('#F2F6F8')
    block(img, 16, 5, cloud, 4, 1, mask); block(img, 17, 6, cloud, 4, 1, mask)
    block(img, 7, 18, cloud, 4, 1, mask); block(img, 8, 19, cloud, 3, 1, mask)
    block(img, 20, 16, cloud, 4, 1, mask); block(img, 21, 17, cloud, 3, 1, mask)
    return img


def draw_jupiter():
    # 가로 밴드 + 대적점
    img = new_canvas()
    bands = [hx('#E8D5A8'), hx('#C9955C'), hx('#A86B3C'), hx('#7A4A28')]

    def band_color(y):
        if y < 8: return bands[0]
        if y < 12: return bands[1]
        if y < 16: return bands[0]
        if y < 21: return bands[2]
        if y < 25: return bands[1]
        return bands[3]

    def shader(x, y, nx, ny):
        wob = 1 if (x // 5) % 2 == 0 else 0
        c = band_color(y + wob)
        d = math.hypot(nx + 0.45, ny + 0.45)
        if d > 1.05:
            c = bands[min(bands.index(c) + 1, len(bands) - 1)]
        return c

    disc(img, 16, 16, 14, shader)
    # 대적점 — 타원 + 어두운 림
    for y in range(SIZE):
        for x in range(SIZE):
            ex, ey = (x + 0.5 - 20.5) / 3.4, (y + 0.5 - 19.0) / 2.3
            e = ex * ex + ey * ey
            if e <= 1 and in_disc(x, y, 16, 16, 13.5):
                put(img, x, y, hx('#8A3226') if e > 0.55 else hx('#C14F3A'))
    return img


def draw_blossom():
    # 분홍 구체 + 5도트 꽃 클러스터 (로즈 톤)
    img = new_canvas()
    pal = [hx('#F5D0E0'), hx('#E8A8C8'), hx('#C86488')]
    disc(img, 16, 16, 14, sphere_shade(pal))
    petal, center = hx('#FDF3F6'), hx('#C14F7A')

    def flower_big(fx, fy):
        # 2x2 중심 + 상하좌우 2x2 꽃잎 — 데이지
        for (ox, oy) in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            block(img, fx + ox, fy + oy, petal, 2, 2)
        block(img, fx, fy, center, 2, 2)

    def flower_small(fx, fy):
        for (ox, oy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            put(img, fx + ox, fy + oy, petal)
        put(img, fx, fy, center)

    flower_big(10, 11); flower_big(19, 20)
    flower_small(21, 11); flower_small(12, 22); flower_small(16, 6)
    return img


def draw_candy():
    # 소용돌이 3색 캔디 — 구체 셰이딩 대신 우하단 다크 변형
    img = new_canvas()
    stripes = [hx('#F08CB4'), hx('#FDF3F6'), hx('#7FD1C8')]
    dark = [hx('#C4648E'), hx('#D8C4CE'), hx('#57A69E')]

    def shader(x, y, nx, ny):
        ang = math.atan2(ny, nx) / (2 * math.pi)
        rr = math.hypot(nx, ny)
        idx = int((ang + 0.5 + rr * 0.9) * 6) % 3
        light_d = math.hypot(nx + 0.45, ny + 0.45)
        return dark[idx] if light_d > 1.25 else stripes[idx]

    disc(img, 16, 16, 14, shader)
    return img


def draw_galaxy():
    # 나선 은하 — 코어 + 로그 나선팔 2개 + 골드 별
    img = new_canvas()
    arm, arm_dark = hx('#8A63C4'), hx('#6A4A9C')
    for theta0 in (0.0, math.pi):
        for i in range(100):
            t = i / 99
            r = 4 + 10.5 * t
            th = theta0 + t * 3.6
            x = 16 + r * math.cos(th)
            y = 16 + r * math.sin(th) * 0.85  # 살짝 눌린 원반
            block(img, round(x), round(y), arm if t < 0.55 else arm_dark, 2, 2)
    disc(img, 16, 16, 4.5, lambda x, y, nx, ny: hx('#E8C170'))
    disc(img, 16, 16, 2.8, lambda x, y, nx, ny: hx('#F5EDE0'))
    star = hx('#E8C170')
    for (sx, sy) in [(7, 9), (24, 7), (26, 21), (9, 25)]:
        for (ox, oy) in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:
            put(img, sx + ox, sy + oy, star)
    return img


def draw_whale():
    # 옆모습 우주 고래 (왼쪽 보기) — 뭉툭한 머리 슈퍼타원 몸통 + 치켜든 꼬리 + 물뿜기
    img = new_canvas()
    back, backd, belly, eye = hx('#5B7FBF'), hx('#43619C'), hx('#C8D8F0'), hx('#1E2A44')
    # 꼬리 지느러미 — 위로 크게 치켜든 형태 (몸통이 접합부를 덮음)
    tri(img, (21, 14), (29, 8), (24, 18), backd)
    tri(img, (21, 18), (28, 22), (24, 15), backd)
    # 몸통 — 슈퍼타원(지수 2.5)이라 머리가 뭉툭
    for y in range(SIZE):
        for x in range(SIZE):
            ex, ey = (x + 0.5 - 13.0) / 10.0, (y + 0.5 - 17.0) / 6.0
            if abs(ex) ** 2.5 + abs(ey) ** 2.5 <= 1:
                if ey > 0.35:
                    put(img, x, y, belly)
                elif ey > 0.05:
                    put(img, x, y, backd)
                else:
                    put(img, x, y, back)
    # 배 주름 1줄
    for x in range(6, 20):
        ex = (x + 0.5 - 13.0) / 10.0
        if abs(ex) ** 2.5 + abs((21.5 - 17.0) / 6.0) ** 2.5 <= 1:
            put(img, x, 21, hx('#9FB6D8'))
    # 가슴 지느러미 + 눈 + 물뿜기
    tri(img, (12, 21), (17, 21), (13, 26), backd)
    block(img, 6, 15, eye, 2, 2)
    put(img, 7, 9, belly); put(img, 7, 8, belly)
    put(img, 5, 7, belly); put(img, 6, 6, belly)
    put(img, 9, 7, belly); put(img, 10, 6, belly)
    return img


def frames_sheet(frame_fns):
    """[fn, ...] → 가로로 이어붙인 애니 시트."""
    frames = [fn() for fn in frame_fns]
    sheet = Image.new('RGBA', (SIZE * len(frames), SIZE), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * SIZE, 0), f)
    return sheet


def draw_sun():
    # 태양 — 자체 발광이라 방사형 셰이딩, 프레임별 플레어 명멸 (4프레임)
    pal = [hx('#FBE89A'), hx('#F5C842'), hx('#F09030'), hx('#E86A2A')]

    def frame(k):
        img = new_canvas()
        rot = k * (math.pi / 8)  # 프레임당 22.5° — 8프레임 = 180° = 불꽃 혀 2주기, 이음새 없는 루프

        def shader(x, y, nx, ny):
            rr = math.hypot(nx, ny)
            off = 0.05 if (x + y + k) % 2 == 0 else 0.0  # 프레임마다 일렁이는 경계 디더
            if rr < 0.5 + off:
                return pal[0]
            if rr < 0.78 + off:
                return pal[1]
            # 외곽 링 — 회전하는 불꽃 혀 8개 (반경 비례 트위스트로 감김)
            ang = (math.atan2(ny, nx) - rot + (rr - 0.78) * 2.5) % (2 * math.pi)
            return pal[2] if int(ang / (math.pi / 4)) % 2 == 0 else pal[3]

        disc(img, 16, 16, 11, shader)
        # 흑점 2개(180° 간격) — 중간 링 위를 함께 회전, 고대비라 움직임이 잘 읽힘
        for g in range(2):
            th = rot + g * math.pi
            gx = round(16 + 7.0 * math.cos(th)) - 1
            gy = round(16 + 7.0 * math.sin(th)) - 1
            block(img, gx, gy, pal[2], 2, 2)
        # 8방향 플레어 — 길이 파형(4~1)이 프레임마다 한 칸씩 돌며 물결치듯 순환
        wave = [4, 2, 1, 2]
        for j, (dx, dy) in enumerate([(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]):
            length = wave[(j + k) % 4]
            norm = math.hypot(dx, dy)
            for step in range(length):
                r = 11.5 + step
                x = round(16 + dx / norm * r) - 1
                y = round(16 + dy / norm * r) - 1
                block(img, x, y, pal[1] if step < 2 else pal[2], 2, 2)
        return img

    return frames_sheet([lambda k=k: frame(k) for k in range(8)])


def draw_blackhole():
    # 블랙홀 — 사건의 지평선 + 포톤 링 + 소용돌이치는 나선팔 2개 강착원반 (8프레임)
    # 2팔 대칭이라 프레임당 22.5° 회전 × 8 = 180° = 원상복귀 → 이음새 없는 루프
    def frame(k):
        img = new_canvas()
        rot = k * (math.pi / 8)

        def shader(x, y, nx, ny):
            d = math.hypot(nx, ny)
            if d < 0.42:
                return hx('#0A0A12')          # 사건의 지평선
            if d < 0.52:
                return hx('#FBE89A')          # 포톤 링
            # 각도에 반경 비례 트위스트를 더해 팔이 감기는 소용돌이
            ang = (math.atan2(ny, nx) - rot + (d - 0.5) * 4.0) % (2 * math.pi)
            a2 = ang % math.pi                # π 주기 접기 → 대칭 팔 2개
            if a2 < 0.55:
                return hx('#E8C170')
            if a2 < 1.15:
                return hx('#E88A4A')
            if a2 < 2.1:
                return hx('#8A63C4')
            return hx('#4A3070')

        disc(img, 16, 16, 14, shader)
        return img

    return frames_sheet([lambda k=k: frame(k) for k in range(8)])


SPRITES = {
    'planet_default': draw_default,
    'planet_crimson': draw_crimson,
    'planet_ice': draw_ice,
    'planet_ringed': draw_ringed,
    'planet_moon': draw_moon,
    'planet_ocean': draw_ocean,
    'planet_sprout': draw_sprout,
    'planet_earth': draw_earth,
    'planet_jupiter': draw_jupiter,
    'planet_blossom': draw_blossom,
    'planet_candy': draw_candy,
    'planet_galaxy': draw_galaxy,
    'planet_whale': draw_whale,
    'planet_sun': draw_sun,
    'planet_blackhole': draw_blackhole,
}


def save_sprite(name, img):
    out = ASSET_DIR / f'{name}.png'
    img.save(out)
    print(f'saved {out} ({img.width}x{img.height})')


def build_preview_sheet(sprites, out_path, scale=8, row_width=1088):
    """{이름: 이미지} → 라벨 붙은 확대 시트 (검수용). 흐름 배치라 프레임 시트도 수용."""
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
