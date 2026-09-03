# Play 스토어 스크린샷 프레임 생성: 실기기 캡처(1080x2277, 2:1 초과라 원본 업로드 불가)를
# 1080x1920 마케팅 프레임에 얹는다. 사용법: python gen_store_screenshots.py <원본_폴더>
# 원본 파일명·캡션 매핑은 SHOTS 참조. 출력: docs/store/assets/screenshots/NN_*.png
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

MOBILE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(MOBILE, 'docs', 'store', 'assets', 'screenshots')
FONTS = os.path.join(MOBILE, 'assets', 'fonts')
GAL_B = os.path.join(FONTS, 'Galmuri11-Bold.ttf')

CREAM = (247, 239, 223)
DARK = (31, 27, 46)
INK = (59, 51, 38)
GOLD = (233, 180, 76)
TEAL_L = (62, 142, 133)   # 라이트 accent2
TEAL_D = (95, 196, 180)   # 다크 accent2
SHADOW_L = (222, 205, 178)
SHADOW_D = (16, 13, 26)

W, H = 1080, 1920
SHOT_H = 1560
CAP_Y = 96

SHOTS = [
    ('e4a4ba03-image.png', '머릿속을 그냥 쏟아내세요', False),
    ('ec6007ca-image.png', 'AI가 할 일로 정리해드려요', False),
    ('d16545f2-image.png', '지금 할 일부터 한눈에', False),
    ('43b89214-image.png', '아이디어는 차곡차곡 계층으로', False),
    ('e2249f2f-image.png', '반복하는 일은 루틴으로', False),
    ('b1830ba3-image.png', '코인 모아 나만의 테마 꾸미기', False),
    ('a236fd84-image.png', '쌓이는 기록, 보이는 성장', False),
    ('dbad897a-image.png', '밤에는 다크 모드로', True),
]
NAMES = ['01_braindump', '02_ai_result', '03_home', '04_ideas', '05_routine', '06_shop', '07_my', '08_dark']


def pixel_star(d, cx, cy, s, color):
    for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
        d.rectangle([cx + dx * s, cy + dy * s, cx + dx * s + s - 1, cy + dy * s + s - 1], fill=color)


def caption_img(text, color):
    font = ImageFont.truetype(GAL_B, 12)
    tmp = Image.new('RGBA', (900, 40), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.fontmode = '1'
    td.text((0, 12), text, font=font, fill=color + (255,))
    tmp = tmp.crop(tmp.getbbox())
    return tmp.resize((tmp.width * 4, tmp.height * 4), Image.NEAREST)


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def frame(src_path, caption, dark, out_path, seed):
    bg, ink, shadow = (DARK, CREAM, SHADOW_D) if dark else (CREAM, INK, SHADOW_L)
    stars = [GOLD, TEAL_D, (200, 195, 220)] if dark else [GOLD, TEAL_L, (205, 188, 158)]
    canvas = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(canvas)

    shot = Image.open(src_path).convert('RGB')
    sw = round(shot.width * SHOT_H / shot.height)
    shot = shot.resize((sw, SHOT_H), Image.LANCZOS)
    x = (W - sw) // 2
    y = H - SHOT_H - 96

    random.seed(seed)
    for _ in range(26):
        px, py = random.randint(12, W - 20), random.randint(12, H - 20)
        if x - 30 < px < x + sw + 30 and py > y - 30:
            continue
        c = random.choice(stars)
        if random.random() < 0.4:
            pixel_star(d, px, py, random.choice([3, 4]), c)
        else:
            d.rectangle([px, py, px + 4, py + 4], fill=c)

    cap = caption_img(caption, ink)
    canvas.paste(cap, ((W - cap.width) // 2, CAP_Y), cap)

    r = 28
    d.rounded_rectangle([x - 4 + 12, y - 4 + 12, x + sw + 3 + 12, y + SHOT_H + 3 + 12], radius=r + 4, fill=shadow)
    d.rounded_rectangle([x - 4, y - 4, x + sw + 3, y + SHOT_H + 3], radius=r + 4, fill=ink)
    canvas.paste(rounded(shot, r), (x, y), rounded(shot, r))
    canvas.save(out_path, optimize=True)


def main():
    src_dir = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for i, ((fname, caption, dark), out_name) in enumerate(zip(SHOTS, NAMES)):
        frame(os.path.join(src_dir, fname), caption, dark, os.path.join(OUT, out_name + '.png'), seed=i * 7 + 1)
        print('ok', out_name)


if __name__ == '__main__':
    main()
