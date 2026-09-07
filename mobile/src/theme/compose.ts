import { BG_SKINS, CHROME_SKINS, POMO_SKINS, skinKey, type PomoColors, type Scheme, type SkinKey } from './skins';
import { highContrast, palettes, pomoDefaults, type Palette } from './tokens';

export type Equipments = Record<string, string> | null | undefined;
export type ComposeOptions = { highContrast?: boolean };

export type ComposedTheme = {
  colors: Palette;
  pomo: PomoColors;
  bgPattern: number | null;
  chromeDeco: number | null;
};

/** 스킨 accent 기준 7:1 글자·채움 (라이트 고대비). 웹 [data-skin-bg][data-contrast="high"] 블록과 동일 값 */
const SKIN_HIGH_CONTRAST_LIGHT: Record<SkinKey, Pick<Palette, 'accentText' | 'accentFill' | 'accent2Text' | 'accent2Fill'>> = {
  ocean:    { accentText: '#1F555E', accentFill: '#1F555E', accent2Text: '#84371E', accent2Fill: '#84371E' },
  lavender: { accentText: '#5F3998', accentFill: '#5F3998', accent2Text: '#265650', accent2Fill: '#265650' },
  rose:     { accentText: '#853241', accentFill: '#853241', accent2Text: '#3B5434', accent2Fill: '#3B5434' },
  sprout:   { accentText: '#3B5826', accentFill: '#3B5826', accent2Text: '#833652', accent2Fill: '#833652' },
  galaxy:   { accentText: '#3B43A1', accentFill: '#3B43A1', accent2Text: '#644917', accent2Fill: '#644917' },
  wood:     { accentText: '#634524', accentFill: '#634524', accent2Text: '#365141', accent2Fill: '#365141' },
  candy:    { accentText: '#941C46', accentFill: '#941C46', accent2Text: '#235368', accent2Fill: '#235368' },
};

/** 장착 스킨을 기본 팔레트에 합성한다 — 웹 CSS 캐스케이드와 같은 순서: 기본(light|dark) → BACKGROUND → CHROME → (옵션) 고대비. POMODORO는 전역 팔레트에 끼지 않고 따로 반환한다 (웹도 --pomo-* 별도 그룹). */
export function composeTheme(scheme: Scheme, equipments: Equipments, options: ComposeOptions = {}): ComposedTheme {
  const base = palettes[scheme];
  const bgKey = skinKey(equipments?.BACKGROUND);
  const chromeKey = skinKey(equipments?.CHROME);
  const pomoKey = skinKey(equipments?.POMODORO);

  const bgSkin = bgKey ? BG_SKINS[bgKey] : null;
  const chromeSkin = chromeKey ? CHROME_SKINS[chromeKey] : null;

  const withBg: Palette = { ...base, ...(bgSkin?.[scheme] ?? {}) };
  // BACKGROUND는 card/line까지 덮으므로, CHROME 미장착 시 크롬도 그 값을 따라가야 웹과 같아진다 (웹 :root의 --chrome-bg:var(--card) 참조와 동일).
  const withChrome: Palette = {
    ...withBg,
    chromeBg: chromeSkin?.[scheme].chromeBg ?? withBg.card,
    chromeLine: chromeSkin?.[scheme].chromeLine ?? withBg.line,
  };

  // 고대비는 마지막에 — 스킨이 bg/card를 바꿔도 글자·선은 고대비 값이 이긴다.
  // 다크 스킨은 accent가 이미 5.5:1 이상이라 스킨 accent를 유지한다.
  let colors: Palette = withChrome;
  if (options.highContrast) {
    const skinText = scheme === 'light' && bgKey ? SKIN_HIGH_CONTRAST_LIGHT[bgKey] : {};
    const darkSkinKeep = scheme === 'dark' && bgKey
      ? { accentText: withChrome.accent, accentFill: withChrome.accent, accent2Text: withChrome.accent2, accent2Fill: withChrome.accent2 }
      : {};
    colors = { ...withChrome, ...highContrast[scheme], ...skinText, ...darkSkinKeep };
  }

  const pomoSkin = pomoKey ? POMO_SKINS[pomoKey][scheme] : null;
  const pomo: PomoColors = pomoSkin
    ? { ...pomoSkin, ring: pomoSkin.ring ?? pomoDefaults[scheme].ring }
    : pomoDefaults[scheme];

  return {
    colors,
    pomo,
    bgPattern: bgSkin?.pattern?.[scheme] ?? null,
    chromeDeco: chromeSkin?.deco?.[scheme] ?? null,
  };
}
