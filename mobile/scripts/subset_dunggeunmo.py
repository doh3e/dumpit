# DungGeunMo 서브셋 — KS X 1001 완성형 2350자 + ASCII + 한글 자모 + 사용 기호
# 사용: cd mobile && python scripts/subset_dunggeunmo.py  (pip install fonttools 필요)
import io
import os
import subprocess
import sys

SRC = 'assets/fonts/DungGeunMo.ttf'
TEXT_FILE = 'scripts/_subset_text.txt'


def ksx1001_syllables() -> str:
    out = []
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                out.append(bytes([lead, trail]).decode('euc-kr'))
            except UnicodeDecodeError:
                pass
    return ''.join(out)


def main() -> None:
    before = os.path.getsize(SRC)
    text = (
        ksx1001_syllables()
        + ''.join(chr(c) for c in range(0x20, 0x7F))   # ASCII
        + '·★☆♥→↳✓＋…—“”‘’◀▶▲▼🪙✨'
    )
    with io.open(TEXT_FILE, 'w', encoding='utf-8') as f:
        f.write(text)
    try:
        subprocess.run([
            sys.executable, '-m', 'fontTools.subset', SRC,
            f'--text-file={TEXT_FILE}',
            '--unicodes=U+3131-318E',                   # 한글 자모
            f'--output-file={SRC}',
            '--layout-features=*',
        ], check=True)
    finally:
        os.remove(TEXT_FILE)
    after = os.path.getsize(SRC)
    print(f'{before / 1024:.0f}KB -> {after / 1024:.0f}KB')


if __name__ == '__main__':
    main()
