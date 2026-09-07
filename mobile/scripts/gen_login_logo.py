"""로그인 화면 로고 — 스플래시 원본(1024px)을 440px로 축소한다.
require()로 번들되는 이미지라 원본을 그대로 쓰면 AAB가 1.5MB 늘어난다(스플래시 플러그인은 별도 drawable을 만든다)."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'images' / 'splash-icon.png'
DST = ROOT / 'assets' / 'images' / 'login-logo.png'
SIZE = 440  # 220dp 표시 기준 2x

im = Image.open(SRC).convert('RGBA')
im.resize((SIZE, SIZE), Image.LANCZOS).save(DST, optimize=True)
print(DST, DST.stat().st_size, 'bytes')
