"""픽셀 에셋을 니어리스트 이웃으로 확대해 mobile/assets/shop에 굽는다.

RN Image에는 웹의 image-rendering:pixelated에 해당하는 옵션이 없어 항상 bilinear로 보간한다.
32x32 원본을 96dp(고밀도 기기에선 물리 288px)로 그리면 9배 확대 보간이라 심하게 흐려진다.
표시 크기보다 큰 해상도를 미리 NN으로 구워두면 RN은 축소만 하게 되어 픽셀 경계가 살아난다.

에셋 성격에 따라 처리가 다르다:

  스프라이트(planet_/station_/sticker_)  x12 단순 확대
      표시 크기를 코드가 직접 지정한다(size={96} 등). 원본 해상도만 키우면 된다.
  축하 파츠(celeb_)                      x8 단순 확대
      마찬가지로 파티클 빌더가 크기를 지정한다. 최대 표시가 300dp대라 8배면 충분하다.
  타일(pattern_/deco_)                   1x + @2x + @3x
      resizeMode="repeat"는 이미지의 고유 dp 크기로 타일을 반복한다. 단순 확대하면
      타일이 커져 무늬 밀도가 웹과 달라지므로, 고유 크기는 두고 밀도별 파일만 얹는다.

원본(frontend/src/assets/shop)은 읽기만 한다 — mobile 브랜치는 frontend를 수정하지 않는다.
원본이 바뀌면 이 스크립트를 다시 돌릴 것.

사용: python mobile/scripts/upscale_sprites.py
"""
from pathlib import Path

from PIL import Image

SPRITE_PREFIXES = ("planet_", "station_", "sticker_")
SPRITE_SCALE = 12
CELEB_PREFIX = "celeb_"
CELEB_SCALE = 8
TILE_PREFIXES = ("pattern_", "deco_")
TILE_DENSITIES = (2, 3)  # 1x는 원본 그대로 복사

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "frontend" / "src" / "assets" / "shop"
DST = ROOT / "mobile" / "assets" / "shop"


def upscale(src: Image.Image, scale: int) -> Image.Image:
    return src.resize((src.width * scale, src.height * scale), Image.NEAREST)


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"원본 폴더를 찾지 못했어요: {SRC}")
    DST.mkdir(parents=True, exist_ok=True)

    counts = {"sprite": 0, "celeb": 0, "tile": 0}
    for path in sorted(SRC.glob("*.png")):
        name = path.name
        with Image.open(path) as img:
            src = img.convert("RGBA")

            if name.startswith(SPRITE_PREFIXES):
                upscale(src, SPRITE_SCALE).save(DST / name, optimize=True)
                counts["sprite"] += 1
            elif name.startswith(CELEB_PREFIX):
                upscale(src, CELEB_SCALE).save(DST / name, optimize=True)
                counts["celeb"] += 1
            elif name.startswith(TILE_PREFIXES):
                src.save(DST / name, optimize=True)
                for density in TILE_DENSITIES:
                    out = DST / f"{path.stem}@{density}x.png"
                    upscale(src, density).save(out, optimize=True)
                counts["tile"] += 1
            else:
                continue

    print(
        f"스프라이트 {counts['sprite']}개(x{SPRITE_SCALE}) · "
        f"축하 {counts['celeb']}개(x{CELEB_SCALE}) · "
        f"타일 {counts['tile']}개(1x+@2x+@3x)를 {DST}에 구웠어요."
    )


if __name__ == "__main__":
    main()
