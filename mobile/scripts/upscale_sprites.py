"""픽셀 스프라이트를 니어리스트 이웃으로 정수배 확대해 mobile/assets/shop에 굽는다.

RN Image는 웹의 image-rendering:pixelated에 해당하는 옵션이 없어 항상 bilinear로 보간한다.
32x32 원본을 96dp(고밀도 기기에선 물리 288px)로 그리면 9배 확대 보간이라 심하게 흐려진다.
표시 크기보다 큰 해상도를 미리 NN으로 구워두면 RN은 축소만 하게 되어 픽셀 경계가 살아난다.

원본(frontend/src/assets/shop)은 읽기만 한다 — mobile 브랜치는 frontend를 수정하지 않는다.
스프라이트 원본이 바뀌면 이 스크립트를 다시 돌릴 것.

사용: python mobile/scripts/upscale_sprites.py
"""
from pathlib import Path

from PIL import Image

SCALE = 12  # 32px -> 384px. 96dp를 4x 밀도 기기에서 그려도(384) 축소만 일어난다.
PREFIXES = ("planet_", "station_", "sticker_")

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "frontend" / "src" / "assets" / "shop"
DST = ROOT / "mobile" / "assets" / "shop"


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"원본 폴더를 찾지 못했어요: {SRC}")
    DST.mkdir(parents=True, exist_ok=True)

    written = 0
    for path in sorted(SRC.glob("*.png")):
        if not path.name.startswith(PREFIXES):
            continue
        with Image.open(path) as img:
            src = img.convert("RGBA")
            out = src.resize((src.width * SCALE, src.height * SCALE), Image.NEAREST)
        out.save(DST / path.name, optimize=True)
        print(f"{path.name}: {src.width}x{src.height} -> {out.width}x{out.height}")
        written += 1

    print(f"\n{written}개 파일을 {DST}에 구웠어요 (x{SCALE} nearest).")


if __name__ == "__main__":
    main()
