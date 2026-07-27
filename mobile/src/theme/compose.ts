/**
 * 장착 스킨을 기본 팔레트에 합성한다 — 웹 CSS 캐스케이드와 같은 순서:
 *   기본(light|dark) → BACKGROUND 오버라이드 → CHROME 오버라이드
 * POMODORO는 전역 팔레트에 끼지 않고 따로 반환한다 (웹도 --pomo-* 별도 그룹).
 */
import { BG_SKINS, CHROME_SKINS, POMO_SKINS, skinKey, type PomoColors, type Scheme } from './skins';
import { palettes, pomoDefaults, type Palette } from './tokens';

export type Equipments = Record<string, string> | null | undefined;

export type ComposedTheme = {
  colors: Palette;
  pomo: PomoColors;
  /** 배경 타일 무늬 — 없으면 단색 */
  bgPattern: number | null;
  /** 탭바·앱바 장식 타일 */
  chromeDeco: number | null;
};

export function composeTheme(scheme: Scheme, equipments: Equipments): ComposedTheme {
  const base = palettes[scheme];
  const bgKey = skinKey(equipments?.BACKGROUND);
  const chromeKey = skinKey(equipments?.CHROME);
  const pomoKey = skinKey(equipments?.POMODORO);

  const bgSkin = bgKey ? BG_SKINS[bgKey] : null;
  const chromeSkin = chromeKey ? CHROME_SKINS[chromeKey] : null;

  // BACKGROUND는 card/line까지 덮으므로, CHROME 미장착 시 크롬도 그 값을 따라가야 웹과 같아진다
  // (웹 :root의 --chrome-bg:var(--card) 가 스킨이 덮은 --card를 참조하는 것과 동일).
  const withBg: Palette = { ...base, ...(bgSkin?.[scheme] ?? {}) };
  const colors: Palette = {
    ...withBg,
    chromeBg: chromeSkin?.[scheme].chromeBg ?? withBg.card,
    chromeLine: chromeSkin?.[scheme].chromeLine ?? withBg.line,
  };

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
