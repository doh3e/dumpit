import { fonts, resolveFonts } from '../typography';

describe('resolveFonts', () => {
  it('기본은 상수와 같다', () => {
    expect(resolveFonts(false)).toEqual(fonts);
  });
  it('굵은 글자: 본문 Bold, 디스플레이 Bold, 둥근모는 갈무리 Bold로 대체', () => {
    const b = resolveFonts(true);
    expect(b.body).toBe('Pretendard-Bold');
    expect(b.display).toBe('Galmuri11-Bold');
    expect(b.chrome).toBe('Galmuri11-Bold');
    expect(b.bodyBold).toBe('Pretendard-Bold');
    expect(b.displayBold).toBe('Galmuri11-Bold');
  });
});
