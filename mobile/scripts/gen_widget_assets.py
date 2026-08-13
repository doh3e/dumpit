# mobile/scripts/gen_widget_assets.py
# 위젯 정적 에셋 생성 — 흰 글리프(런타임 tint용)·픽셀 아이콘·행성 2프레임·프리타일 패턴.
# 실행: python scripts/gen_widget_assets.py  (mobile/ 에서)
from PIL import Image, ImageDraw, ImageFont
import glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "assets", "fonts")
SHOP = os.path.join(ROOT, "assets", "shop")
OUT = os.path.join(ROOT, "modules", "dumpit-widget", "android", "src", "main", "res", "drawable-nodpi")
os.makedirs(OUT, exist_ok=True)
WHITE = (255, 255, 255, 255)

def glyph(name: str, text: str, font_file: str, px: int, scale: int = 3):
    """픽셀 폰트를 정수 배율로 NN 확대해 흰 글리프 PNG로 굽는다 (tint는 런타임)."""
    font = ImageFont.truetype(os.path.join(FONTS, font_file), px)
    tmp = Image.new("RGBA", (px * len(text) * 2 + 8, px * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    d.text((2, 2), text, font=font, fill=WHITE)
    box = tmp.getbbox()
    tmp = tmp.crop(box)
    tmp = tmp.resize((tmp.width * scale, tmp.height * scale), Image.NEAREST)
    tmp.save(os.path.join(OUT, f"{name}.png"))

GALMURI = "Galmuri11-Bold.ttf"
DGM = "DungGeunMo.ttf"
PHRASES = [
    ("w_t_now", "지금 할 일", GALMURI, 11), ("w_t_focus_time", "집중 타임", GALMURI, 11),
    ("w_t_next", "다음에", GALMURI, 11), ("w_t_done_all", "오늘 다 비웠어요", GALMURI, 11),
    ("w_t_login", "로그인이 필요해요", GALMURI, 11), ("w_t_complete", "완료하기", DGM, 12),
    ("w_t_start", "집중 시작", DGM, 12), ("w_t_pause", "일시정지", DGM, 12),
    ("w_t_resume", "재개", DGM, 12), ("w_t_reset", "초기화", DGM, 12),
    ("w_t_pomodoro", "POMODORO", DGM, 11), ("w_t_mode_focus", "FOCUS", DGM, 11),
    ("w_t_mode_break", "BREAK", DGM, 11), ("w_t_nth_focus", "번째 집중", GALMURI, 11),
    ("w_t_rest", "휴식", GALMURI, 11), ("w_t_rest_long", "긴 휴식", GALMURI, 11),
    ("w_t_pomo_done", "집중 완료!", GALMURI, 11),
    ("w_b_overdue", "마감 지남", DGM, 10), ("w_b_today", "오늘", DGM, 10),
    ("w_b_tomorrow", "내일", DGM, 10), ("w_b_next7", "일주일 내", DGM, 10),
    ("w_b_later", "그 외", DGM, 10), ("w_b_someday", "언젠가", DGM, 10),
]
for name, text, ff, px in PHRASES:
    glyph(name, text, ff, px)

def icon(name: str, dots: list[str]):
    """8×8 도트맵('X'=흰색)을 x8 NN 확대."""
    img = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    for y, row in enumerate(dots):
        for x, c in enumerate(row):
            if c == "X":
                img.putpixel((x, y), WHITE)
    img.resize((64, 64), Image.NEAREST).save(os.path.join(OUT, f"{name}.png"))

icon("w_i_check_off", ["XXXXXXXX", "X......X", "X......X", "X......X", "X......X", "X......X", "X......X", "XXXXXXXX"])
icon("w_i_check_on",  ["XXXXXXXX", "X......X", "X.....XX", "X....XX.", "XXX.XX.X", "X.XXX..X", "X..X...X", "XXXXXXXX"])
icon("w_i_refresh",   [".XXXXX..", "X.....X.", "......XX", ".....XXX", "X.......", "X.......", ".X....X.", "..XXXX.."])
icon("w_i_sparkle",   ["...X....", "...X....", "..XXX...", "XXXXXXX.", "..XXX...", "...X....", "...X....", "........"])
icon("w_i_tomato_f1", ["...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX.."])
icon("w_i_tomato_f2", ["..XX.X..", ".XXXX...", ".XXXXXX.", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX.."])

# 컬러 토마토 2프레임 — idle·done 전용. 흰 글리프+단색 tint(구 w_i_tomato_*)는 실기기에서
# 뭉개져 보인다 — 원색(빨강 몸통·초록 꼭지·하이라이트)으로 굽고 tint 없이 쓴다.
# f2 = 1px 위 시프트(바운스).
TOMATO_PALETTE = {
    "R": (222, 74, 56, 255),    # 몸통
    "D": (176, 48, 38, 255),    # 음영
    "G": (94, 170, 88, 255),    # 꼭지
    "H": (255, 235, 224, 230),  # 하이라이트
}
TOMATO_ROWS = [
    "................",
    ".......GG.......",
    "...GG..GG..GG...",
    "....GGGGGGGG....",
    "......GGGG......",
    "....RRRGGRRR....",
    "...RRRRRRRRRR...",
    "..RRHHRRRRRRRR..",
    "..RHHRRRRRRRRD..",
    "..RHHRRRRRRRRD..",
    "..RRHRRRRRRRRD..",
    "..RRRRRRRRRRDD..",
    "...RRRRRRRRDD...",
    "....RRRRRRDD....",
    ".....RRRRRR.....",
    "................",
]
def tomato(name: str, shift_up: int):
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(TOMATO_ROWS):
        for x, c in enumerate(row):
            if c in TOMATO_PALETTE and 0 <= y - shift_up < 16:
                img.putpixel((x, y - shift_up), TOMATO_PALETTE[c])
    img.resize((128, 128), Image.NEAREST).save(os.path.join(OUT, f"{name}.png"))
tomato("w_i_tomato_c_f1", 0)
tomato("w_i_tomato_c_f2", 1)

# 행성 2프레임 — 정사각 원본은 f1 원본 + f2 = 24px 위 시프트(부양 느낌, 6px는 실기기에서 체감 불가).
# 일부 상점 행성(blackhole·sun·whale)은 가로 n프레임 애니메이션 시트(예: 3072×384)라 통째로 쓰면
# "작은 행성 n개 띠"로 렌더된다 — 시트는 첫 프레임/중간 프레임을 잘라 진짜 2프레임 플립으로 쓴다.
for path in glob.glob(os.path.join(SHOP, "planet_*.png")):
    base = os.path.splitext(os.path.basename(path))[0]           # planet_earth
    suffix = base.replace("planet_", "")
    img = Image.open(path).convert("RGBA")
    n = img.width // img.height if img.height > 0 and img.width % img.height == 0 else 1
    if n >= 2:
        w = img.height
        f1 = img.crop((0, 0, w, img.height))
        mid = n // 2
        f2 = img.crop((mid * w, 0, mid * w + w, img.height))
    else:
        f1 = img
        f2 = Image.new("RGBA", img.size, (0, 0, 0, 0))
        f2.paste(img, (0, -24))
    f1.save(os.path.join(OUT, f"w_planet_{suffix}_f1.png"))
    f2.save(os.path.join(OUT, f"w_planet_{suffix}_f2.png"))

# 프리타일 패턴 — Glance 배경은 repeat이 없어 960×480으로 미리 타일링(Crop으로 깐다)
for skin in ["sprout", "galaxy", "wood", "candy"]:
    for scheme in ["light", "dark"]:
        src = os.path.join(SHOP, f"pattern_{skin}_{scheme}.png")
        tile = Image.open(src).convert("RGBA")
        tile = tile.resize((tile.width * 3, tile.height * 3), Image.NEAREST)
        canvas = Image.new("RGBA", (960, 480), (0, 0, 0, 0))
        for ty in range(0, 480, tile.height):
            for tx in range(0, 960, tile.width):
                canvas.alpha_composite(tile, (tx, ty))
        canvas.save(os.path.join(OUT, f"w_pattern_{skin}_{scheme}.png"))

print(f"done → {OUT}")
