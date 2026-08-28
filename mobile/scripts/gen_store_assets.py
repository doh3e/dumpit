# Play 스토어 등록 그래픽 생성: docs/store/assets/{icon-512, feature-graphic}.png
# 픽셀 텍스트는 폰트 네이티브 그리드로 앨리어스드 렌더 후 NN 확대해 도트를 보존한다.
# 갈무리11의 PIL 그리드는 12px(11px 글리프 + 1px 행간) — 11로 주면 글리프가 뭉개진다.
import os
import random

from PIL import Image, ImageDraw, ImageFont

MOBILE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(MOBILE)
OUT = os.path.join(MOBILE, 'docs', 'store', 'assets')
FONTS = os.path.join(MOBILE, 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)

# ---------- 1) 512x512 아이콘 ----------
icon = Image.open(os.path.join(MOBILE, 'assets', 'images', 'icon.png')).convert('RGB')
icon.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'), optimize=True)

# ---------- 2) 1024x500 피처 그래픽 ----------
W, H = 1024, 500
DARK = (31, 27, 46)        # #1F1B2E 스플래시 다크
CREAM = (247, 239, 223)    # #F7EFDF
GOLD = (233, 180, 76)      # #E9B44C starlight
TEAL = (95, 196, 180)      # #5FC4B4 다크모드 accent2

img = Image.new('RGB', (W, H), DARK)
draw = ImageDraw.Draw(img)

for y in range(H):
    t = y / H
    draw.line([(0, y), (W, y)], fill=(int(DARK[0] + 6 * t), int(DARK[1] + 5 * t), int(DARK[2] + 10 * t)))


def pixel_star(d, cx, cy, s, color):
    for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
        d.rectangle([cx + dx * s, cy + dy * s, cx + dx * s + s - 1, cy + dy * s + s - 1], fill=color)


def pixel_dot(d, cx, cy, s, color):
    d.rectangle([cx, cy, cx + s - 1, cy + s - 1], fill=color)


random.seed(42)
star_colors = [GOLD, CREAM, TEAL, (200, 195, 220)]
for _ in range(46):
    x, y = random.randint(8, W - 16), random.randint(8, H - 16)
    if 430 < x < 1000 and 120 < y < 400:
        continue
    if 40 < x < 430 and 60 < y < 440 and random.random() < 0.75:
        continue
    c = random.choice(star_colors)
    if random.random() < 0.35:
        pixel_star(draw, x, y, random.choice([3, 4]), c)
    else:
        pixel_dot(draw, x, y, random.choice([3, 4, 5]), c)

pixel_star(draw, 500, 60, 6, GOLD)
pixel_star(draw, 960, 400, 5, TEAL)
pixel_star(draw, 60, 440, 5, CREAM)

logo = Image.open(os.path.join(REPO, 'frontend', 'public', 'logo.webp')).convert('RGBA')
LW = 430
logo = logo.resize((LW, LW), Image.LANCZOS)
img.paste(logo, (18, (H - LW) // 2), logo)


def draw_pixel_text(base, text, font_path, grid, scale, color, pos, anchor='la'):
    font = ImageFont.truetype(font_path, grid)
    tmp = Image.new('RGBA', (600, grid * 3), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.fontmode = '1'
    td.text((0, grid), text, font=font, fill=color + (255,))
    bbox = tmp.getbbox()
    if bbox is None:
        return
    tmp = tmp.crop(bbox)
    tmp = tmp.resize((tmp.width * scale, tmp.height * scale), Image.NEAREST)
    x, y = pos
    if anchor == 'ma':
        x -= tmp.width // 2
    base.paste(tmp, (x, y), tmp)


GAL_B = os.path.join(FONTS, 'Galmuri11-Bold.ttf')
DGM = os.path.join(FONTS, 'DungGeunMo.ttf')

CX = 716
draw_pixel_text(img, '생각을 쏟아내면,', GAL_B, 12, 5, CREAM, (CX, 140), 'ma')
draw_pixel_text(img, 'AI가 정리해드려요', GAL_B, 12, 5, CREAM, (CX, 218), 'ma')
draw_pixel_text(img, '그냥 다 쏟아내세요!', DGM, 16, 3, GOLD, (CX, 322), 'ma')

img.save(os.path.join(OUT, 'feature-graphic.png'), optimize=True)
print('done:', sorted(os.listdir(OUT)))
