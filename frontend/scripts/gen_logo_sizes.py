# -*- coding: utf-8 -*-
"""로고 srcset 사이즈 세트 생성기.

브라우저가 큰 원본을 2~4배 축소하면서 생기던 계단 현상(앨리어싱)을 없애기 위해,
표시 크기별(1x/1.25x/1.5x/2x/3x — Windows 배율 125%/150% 포함)로 Lanczos 리사이즈한
파일을 미리 만들어 <img srcset>으로 서빙한다.

소스:
- 텍스트 로고: scripts/logo_src/text_logo_900.png (900x600 원본, git 히스토리에서 복원)
- 행성 로고:   public/logo.webp (576x576, 배경 제거된 최대 크기 — 이 파일 자체는 그대로 둠)

산출물(public/):
- text_logo.webp           — 트리밍 후 h96(2x md) 재생성, srcset 미지원 브라우저용 폴백
- text_logo_{w}.webp       — 헤더 h-9(36px)/h-12(48px) 슬롯의 DPR 사다리
- logo_{w}.webp            — 사이드바 h-36(144px)/홈 w-72(288px) 슬롯의 DPR 사다리

실행: python scripts/gen_logo_sizes.py  (frontend/ 에서)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC_TEXT = Path(__file__).resolve().parent / "logo_src" / "text_logo_900.png"
SRC_PLANET = PUBLIC / "logo.webp"

# 헤더 슬롯 높이 36/48px × DPR {1, 1.25, 1.5, 2, 3} (중복 제거, 45→48·54→60 근사)
TEXT_HEIGHTS = [36, 48, 60, 72, 96, 144]
# 사이드바 144px·홈 288px × DPR 사다리 (576은 기존 logo.webp가 담당)
PLANET_WIDTHS = [144, 180, 216, 288, 432]

TRIM_ALPHA = 8   # 이 값 이하의 알파는 투명 노이즈로 보고 트리밍
TRIM_PAD = 2     # 안티앨리어스 가장자리 보존용 여백(소스 px)


def trim(im: Image.Image) -> Image.Image:
    mask = im.getchannel("A").point(lambda v: 255 if v > TRIM_ALPHA else 0)
    left, top, right, bottom = mask.getbbox()
    box = (
        max(0, left - TRIM_PAD),
        max(0, top - TRIM_PAD),
        min(im.width, right + TRIM_PAD),
        min(im.height, bottom + TRIM_PAD),
    )
    return im.crop(box)


def save_webp(im: Image.Image, path: Path, lossless: bool) -> None:
    if lossless:
        im.save(path, "WEBP", lossless=True, method=6)
    else:
        im.save(path, "WEBP", quality=92, method=6)
    print(f"  {path.name}  {im.width}x{im.height}  {path.stat().st_size / 1024:.1f}KB")


def main() -> None:
    print("텍스트 로고 (트리밍 + 리사이즈, 무손실 — 외곽선이 선명해야 함):")
    text = trim(Image.open(SRC_TEXT).convert("RGBA"))
    aspect = text.width / text.height
    print(f"  트리밍 결과 {text.width}x{text.height} (aspect {aspect:.3f})")
    widths = []
    for h in TEXT_HEIGHTS:
        w = round(h * aspect)
        widths.append(w)
        resized = text.resize((w, h), Image.LANCZOS)
        # 1x~1.5x는 무손실(픽셀이 곧 화면 픽셀), 2x 이상은 고밀도라 q92 손실로 용량 절약
        save_webp(resized, PUBLIC / f"text_logo_{w}.webp", lossless=h <= 72)
    # 폴백(srcset 미지원)용 본파일은 md 슬롯의 2x(h96)로 재생성
    fallback = text.resize((widths[TEXT_HEIGHTS.index(96)], 96), Image.LANCZOS)
    save_webp(fallback, PUBLIC / "text_logo.webp", lossless=False)
    print(f"  srcset 폭: {widths} / sizes: md+ {round(48 * aspect)}px, 이하 {round(36 * aspect)}px")

    print("행성 로고 (리사이즈만 — 글로우 그라데이션이 있어 q90 손실 압축):")
    planet = Image.open(SRC_PLANET).convert("RGBA")
    for w in PLANET_WIDTHS:
        resized = planet.resize((w, w), Image.LANCZOS)
        save_webp(resized, PUBLIC / f"logo_{w}.webp", lossless=False)
    print("  576w는 기존 logo.webp를 srcset에 그대로 포함")


if __name__ == "__main__":
    main()
