# -*- coding: utf-8 -*-
"""크롬 아이콘 srcset 사이즈 세트 생성기.

100×100(메뉴는 512×512) 원본을 <img>에서 12~24px로 그때그때 축소하면
브라우저의 저품질 리샘플링 때문에 계단·자글거림이 생긴다(로고에서 겪은 것과 동일,
gen_logo_sizes.py 참조). 표시 슬롯별 × DPR{1, 1.25, 1.5, 2, 3 — Windows 배율
125%/150% 포함} 크기를 Lanczos로 미리 리사이즈해 srcset으로 서빙한다.

소스: src/assets/*.png (원본은 그대로 둠 — 재생성 스크립트·모바일 앱의 마스터)
산출물: src/assets/icons/<name>_<devicePx>.png  (src/assets/icons/index.js가 글롭)

슬롯 목록은 사용처의 Tailwind w-* 클래스와 일치해야 한다. 새 표시 크기를
추가하면 여기 슬롯에도 추가하고 재실행할 것.

실행: python scripts/gen_icon_sizes.py  (frontend/ 에서)
"""
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'assets'
OUT = ROOT / 'src' / 'assets' / 'icons'

# name → (원본 파일, 표시 슬롯 CSS px 목록)
ICONS = {
    'coin': ('coin_image.png', [12, 16, 20, 24]),
    'token': ('remain_ai_token.png', [16, 20]),
    'deadline': ('deadline_alarm.png', [16, 20]),
    'menu': ('menu.png', [20]),
    'setting': ('setting_image.png', [20]),
    'download': ('download.png', [16]),
    'arrowhead': ('arrowheads.png', [14]),
}
DPRS = [1, 1.25, 1.5, 2, 3]


def main():
    OUT.mkdir(exist_ok=True)
    # 슬롯 변경으로 못 쓰게 된 이전 산출물 제거
    for stale in OUT.glob('*.png'):
        stale.unlink()

    total = 0
    for name, (src_file, slots) in ICONS.items():
        src = Image.open(SRC / src_file).convert('RGBA')
        sizes = sorted({math.ceil(slot * dpr) for slot in slots for dpr in DPRS})
        for size in sizes:
            im = src.resize((size, size), Image.LANCZOS)
            im.save(OUT / f'{name}_{size}.png', optimize=True)
        total += len(sizes)
        print(f'{name}: {src_file} → {sizes}')
    print(f'saved {total} files → {OUT}')


if __name__ == '__main__':
    main()
