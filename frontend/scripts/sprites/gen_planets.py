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


SPRITES = {
    'planet_default': draw_default,
    'planet_crimson': draw_crimson,
    'planet_ice': draw_ice,
    'planet_ringed': draw_ringed,
}


def save_sprite(name, img):
    out = ASSET_DIR / f'{name}.png'
    img.save(out)
    print(f'saved {out} ({img.width}x{img.height})')


def build_preview_sheet(sprites, out_path, scale=8):
    """{이름: 이미지} → 라벨 붙은 확대 시트 (검수용)."""
    cell_w = max(i.width for i in sprites.values()) * scale + 16
    cell_h = SIZE * scale + 34
    cols = 4
    rows = math.ceil(len(sprites) / cols)
    sheet = Image.new('RGBA', (cell_w * cols, cell_h * rows), (26, 26, 34, 255))
    drawer = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(sprites.items()):
        ox = (i % cols) * cell_w + 8
        oy = (i // cols) * cell_h + 8
        big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
        sheet.paste(big, (ox, oy), big)
        drawer.text((ox, oy + SIZE * scale + 6), name, fill=(230, 230, 230, 255))
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
