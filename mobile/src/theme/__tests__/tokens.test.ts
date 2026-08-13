import { palettes, retroShadow } from '../tokens';

describe('palettes', () => {
  it('light와 dark가 같은 키 집합을 가진다', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort());
  });
  it('웹 index.css와 동일한 대표값을 가진다', () => {
    expect(palettes.light.bg).toBe('#F7EFDF');
    expect(palettes.light.accent).toBe('#D95F52');
    expect(palettes.dark.bg).toBe('#1F1B2E');
    expect(palettes.dark.accent2).toBe('#5FC4B4');
  });
});

describe('retroShadow', () => {
  it('오프셋 하드 섀도 boxShadow 문자열을 만든다', () => {
    expect(retroShadow(3, '#DCC5A0')).toEqual({ boxShadow: '3px 3px 0px #DCC5A0' });
  });
});
