export type Palette = {
  bg: string; card: string; fg: string; sub: string;
  line: string; edge: string; chip: string;
  accent: string; accent2: string; onAccent: string;
  shadowHero: string; shadowSm: string;
  warn: string; starlight: string;
  /** 글자용(-Text)·크림 글자를 얹는 채움용(-Fill) — 원색 accent/accent2는 테두리·장식 전용. 값은 __tests__/tokens.test.ts가 강제한다 */
  accentText: string; accentFill: string; accent2Text: string; accent2Fill: string;
  warnText: string; dangerText: string;
  /** 앰버·골드 채움 위 글자 — 다크 fg는 밝아서 골드 위 1.6:1이라 별도 토큰 */
  onWarn: string;
  /** 탭바·앱바 크롬 (웹 --chrome-bg/--chrome-line) — CHROME 스킨 미장착 시 card/line과 같다 */
  chromeBg: string; chromeLine: string;
};

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F7EFDF', card: '#FFFDF6', fg: '#33271E', sub: '#726553',
    line: '#E0D2B6', edge: '#3A2C21', chip: '#F0DFBB',
    accent: '#D95F52', accent2: '#3E8E85', onAccent: '#FFFBF0',
    shadowHero: '#EBC0AC', shadowSm: '#DCC5A0',
    warn: '#D98E2B', starlight: '#E9B44C',
    accentText: '#C63A2C', accentFill: '#D13F30', accent2Text: '#357871', accent2Fill: '#387F77',
    warnText: '#97621B', dangerText: '#AF4538', onWarn: '#33271E',
    chromeBg: '#FFFDF6', chromeLine: '#E0D2B6',
  },
  dark: {
    bg: '#1F1B2E', card: '#2B2442', fg: '#F2E9D8', sub: '#9D93A8',
    line: '#413966', edge: '#141021', chip: '#3A3156',
    accent: '#F09355', accent2: '#5FC4B4', onAccent: '#241E14',
    shadowHero: '#141021', shadowSm: '#141021',
    warn: '#E9B44C', starlight: '#E9B44C',
    accentText: '#F09355', accentFill: '#F09355', accent2Text: '#5FC4B4', accent2Fill: '#5FC4B4',
    warnText: '#E9B44C', dangerText: '#E57B67', onWarn: '#241E14',
    chromeBg: '#2B2442', chromeLine: '#413966',
  },
};

/** 사용자 선택 고대비 — 스킨 합성 뒤 마지막에 덮는다 (웹 [data-contrast="high"] 대응) */
export const highContrast: { light: Partial<Palette>; dark: Partial<Palette> } = {
  light: {
    fg: '#1A120C', sub: '#53493C', line: '#9E8043', edge: '#1A120C',
    accentText: '#932B20', accentFill: '#932B20', accent2Text: '#275853', accent2Fill: '#275853',
    warnText: '#684313', dangerText: '#803229',
  },
  dark: {
    fg: '#FFFFFF', sub: '#C9C2D2', line: '#7A6FB0', edge: '#000000',
    accentText: '#F2A16B', accentFill: '#F2A16B',
  },
};

/** 뽀모도로는 전역 테마와 독립된 팔레트 — POMODORO 스킨 장착 시에만 바뀐다 (웹 --pomo-* 동일) */
export const pomoDefaults = {
  light: { focus: '#D95F52', rest: '#3E8E85', ring: '#E0D2B6', soft: '#F7EFDF' },
  dark: { focus: '#F09355', rest: '#5FC4B4', ring: '#413966', soft: '#1F1B2E' },
};

/** 웹 .btn-retro/.card-retro의 오프셋 하드 섀도. RN 0.76+ boxShadow 사용. */
export function retroShadow(size: 3 | 5, color: string): { boxShadow: string } {
  return { boxShadow: `${size}px ${size}px 0px ${color}` };
}
