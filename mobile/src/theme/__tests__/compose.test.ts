import { composeTheme } from '../compose';
import { BG_SKINS, CHROME_SKINS, POMO_SKINS, skinKey } from '../skins';
import { palettes, pomoDefaults } from '../tokens';

jest.mock('../../auth/AuthContext', () => ({}), { virtual: true });

describe('skinKey', () => {
  it('아이템 코드의 마지막 세그먼트를 스킨 키로 쓴다 (웹 applySkins 규칙)', () => {
    expect(skinKey('bg.ocean')).toBe('ocean');
    expect(skinKey('chrome.wood')).toBe('wood');
    expect(skinKey('pomo.candy')).toBe('candy');
  });

  it('미장착·미지 코드는 null', () => {
    expect(skinKey(null)).toBeNull();
    expect(skinKey(undefined)).toBeNull();
    expect(skinKey('bg.nonexistent')).toBeNull();
    expect(skinKey('planet.crimson')).toBeNull();
  });
});

describe('composeTheme', () => {
  it('미장착이면 기본 팔레트 그대로', () => {
    const { colors, pomo, bgPattern, chromeDeco } = composeTheme('light', null);
    expect(colors).toEqual(palettes.light);
    expect(pomo).toEqual(pomoDefaults.light);
    expect(bgPattern).toBeNull();
    expect(chromeDeco).toBeNull();
  });

  it('BACKGROUND 스킨이 기본 팔레트를 덮는다', () => {
    const { colors } = composeTheme('light', { BACKGROUND: 'bg.ocean' });
    expect(colors.bg).toBe(BG_SKINS.ocean.light.bg);
    expect(colors.accent).toBe(BG_SKINS.ocean.light.accent);
  });

  it('BACKGROUND는 fg·sub를 건드리지 않는다 (웹 동일)', () => {
    const { colors } = composeTheme('light', { BACKGROUND: 'bg.galaxy' });
    expect(colors.fg).toBe(palettes.light.fg);
    expect(colors.sub).toBe(palettes.light.sub);
  });

  it('CHROME 미장착 시 크롬은 BACKGROUND가 덮은 card/line을 따라간다', () => {
    const { colors } = composeTheme('light', { BACKGROUND: 'bg.ocean' });
    expect(colors.chromeBg).toBe(BG_SKINS.ocean.light.card);
    expect(colors.chromeLine).toBe(BG_SKINS.ocean.light.line);
  });

  it('CHROME 스킨은 크롬만 덮고 배경은 두 번째로 적용된다', () => {
    const { colors } = composeTheme('light', { BACKGROUND: 'bg.ocean', CHROME: 'chrome.wood' });
    expect(colors.bg).toBe(BG_SKINS.ocean.light.bg);
    expect(colors.chromeBg).toBe(CHROME_SKINS.wood.light.chromeBg);
    expect(colors.chromeLine).toBe(CHROME_SKINS.wood.light.chromeLine);
  });

  it('POMODORO는 전역 팔레트에 섞이지 않는다', () => {
    const { colors, pomo } = composeTheme('light', { POMODORO: 'pomo.rose' });
    expect(colors).toEqual(palettes.light);
    expect(pomo.focus).toBe(POMO_SKINS.rose.light.focus);
    expect(pomo.rest).toBe(POMO_SKINS.rose.light.rest);
  });

  it('ring을 주지 않는 스킨은 기본 ring을 유지한다', () => {
    const { pomo } = composeTheme('light', { POMODORO: 'pomo.rose' });
    expect(pomo.ring).toBe(pomoDefaults.light.ring);
  });

  it('candy 스킨은 자체 ring을 쓴다', () => {
    const { pomo } = composeTheme('dark', { POMODORO: 'pomo.candy' });
    expect(pomo.ring).toBe(POMO_SKINS.candy.dark.ring);
  });

  it('다크 스킴은 스킨의 dark 벌을 쓴다', () => {
    const { colors } = composeTheme('dark', { BACKGROUND: 'bg.candy' });
    expect(colors.bg).toBe(BG_SKINS.candy.dark.bg);
  });

  it('패턴·데코가 있는 스킨만 이미지를 내려준다', () => {
    expect(composeTheme('light', { BACKGROUND: 'bg.wood' }).bgPattern).toBeTruthy();
    expect(composeTheme('light', { BACKGROUND: 'bg.ocean' }).bgPattern).toBeNull();
    expect(composeTheme('light', { CHROME: 'chrome.galaxy' }).chromeDeco).toBeTruthy();
    expect(composeTheme('light', { CHROME: 'chrome.rose' }).chromeDeco).toBeNull();
  });

  it('미지 코드가 장착돼 있어도 기본값으로 떨어진다', () => {
    const { colors } = composeTheme('light', { BACKGROUND: 'bg.deleted-skin' });
    expect(colors).toEqual(palettes.light);
  });
});

describe('스킨 레지스트리 정합성', () => {
  const keys = Object.keys(BG_SKINS) as (keyof typeof BG_SKINS)[];

  it('세 슬롯 모두 같은 7종 키를 갖는다', () => {
    expect(keys).toHaveLength(7);
    expect(Object.keys(CHROME_SKINS).sort()).toEqual([...keys].sort());
    expect(Object.keys(POMO_SKINS).sort()).toEqual([...keys].sort());
  });

  it('모든 스킨이 light·dark 두 벌을 갖는다', () => {
    keys.forEach((k) => {
      expect(BG_SKINS[k].light.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(BG_SKINS[k].dark.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(CHROME_SKINS[k].light.chromeBg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(CHROME_SKINS[k].dark.chromeBg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(POMO_SKINS[k].light.focus).toMatch(/^#[0-9A-F]{6}$/i);
      expect(POMO_SKINS[k].dark.focus).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
