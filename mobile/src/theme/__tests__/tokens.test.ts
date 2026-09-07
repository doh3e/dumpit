import { highContrast, palettes, retroShadow, type Palette } from '../tokens';
import { BG_SKINS } from '../skins';
import { contrastRatio } from '../contrast';

const TEXT_KEYS: (keyof Palette)[] = ['sub', 'accentText', 'accent2Text', 'dangerText'];

function expectMin(fg: string, bg: string, min: number, label: string) {
  const ratio = contrastRatio(fg, bg);
  if (!(ratio >= min)) {
    throw new Error(`${label}: ${fg} on ${bg} = ${ratio.toFixed(2)} < ${min}`);
  }
  expect(ratio).toBeGreaterThanOrEqual(min);
}

describe('palettes', () => {
  it('light와 dark가 같은 키 집합을 가진다', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort());
  });
  it('웹 index.css와 동일한 대표값을 가진다', () => {
    expect(palettes.light.bg).toBe('#F7EFDF');
    expect(palettes.light.accent).toBe('#D95F52');
    expect(palettes.dark.bg).toBe('#1F1B2E');
    expect(palettes.dark.accent2).toBe('#5FC4B4');
    expect(palettes.light.sub).toBe('#726553');
  });
});

describe('retroShadow', () => {
  it('오프셋 하드 섀도 boxShadow 문자열을 만든다', () => {
    expect(retroShadow(3, '#DCC5A0')).toEqual({ boxShadow: '3px 3px 0px #DCC5A0' });
  });
});

describe('글자 대비', () => {
  it('라이트: 글자 토큰이 bg·card 위에서 4.5 이상, 크림 글자가 채움 위에서 4.5 이상', () => {
    const p = palettes.light;
    for (const k of TEXT_KEYS) { expectMin(p[k], p.bg, 4.5, k); expectMin(p[k], p.card, 4.5, k); }
    expectMin(p.onAccent, p.accentFill, 4.5, 'onAccent/accentFill');
    expectMin(p.onAccent, p.accent2Fill, 4.5, 'onAccent/accent2Fill');
    expectMin(p.onWarn, p.warn, 4.5, 'onWarn/warn(앰버 뱃지)');
    expectMin(p.onWarn, p.starlight, 4.5, 'onWarn/starlight(골드 뱃지)');
  });
  it('다크: 같은 기준', () => {
    const p = palettes.dark;
    for (const k of TEXT_KEYS) expectMin(p[k], p.card, 4.5, `dark ${k}`);
    expectMin(p.onAccent, p.accentFill, 4.5, 'dark onAccent/accentFill');
    expectMin(p.onAccent, p.accent2Fill, 4.5, 'dark onAccent/accent2Fill');
    expectMin(p.onWarn, p.warn, 4.5, 'dark onWarn/warn');
    expectMin(p.onWarn, p.starlight, 4.5, 'dark onWarn/starlight');
  });
  it('스킨(라이트): 스킨 글자·채움 토큰과 기본 sub가 스킨 bg 위에서 4.5 이상', () => {
    for (const [name, skin] of Object.entries(BG_SKINS)) {
      const s = { ...palettes.light, ...skin.light };
      expectMin(s.accentText, s.bg, 4.5, `${name} accentText`);
      expectMin(s.accent2Text, s.bg, 4.5, `${name} accent2Text`);
      expectMin(s.onAccent, s.accentFill, 4.5, `${name} onAccent/accentFill`);
      expectMin(s.onAccent, s.accent2Fill, 4.5, `${name} onAccent/accent2Fill`);
      expectMin(palettes.light.sub, s.bg, 4.5, `${name} sub`);
    }
  });
  it('고대비: 라이트 글자 7, 경계선 3 / 다크 글자 7, 경계선 3', () => {
    const l = { ...palettes.light, ...highContrast.light };
    expectMin(l.fg, l.bg, 7, 'hc fg'); expectMin(l.sub, l.bg, 7, 'hc sub');
    expectMin(l.accentText, l.bg, 7, 'hc accentText'); expectMin(l.line, l.bg, 3, 'hc line');
    expectMin(l.onAccent, l.accentFill, 7, 'hc onAccent/accentFill');
    const d = { ...palettes.dark, ...highContrast.dark };
    expectMin(d.fg, d.card, 7, 'hc dark fg'); expectMin(d.sub, d.card, 7, 'hc dark sub'); expectMin(d.line, d.card, 3, 'hc dark line');
  });
});
