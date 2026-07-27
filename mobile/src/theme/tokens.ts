export type Palette = {
  bg: string; card: string; fg: string; sub: string;
  line: string; edge: string; chip: string;
  accent: string; accent2: string; onAccent: string;
  shadowHero: string; shadowSm: string;
  warn: string; starlight: string;
  /** 탭바·앱바 크롬 (웹 --chrome-bg/--chrome-line) — CHROME 스킨 미장착 시 card/line과 같다 */
  chromeBg: string; chromeLine: string;
};

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F7EFDF', card: '#FFFDF6', fg: '#33271E', sub: '#8C7C66',
    line: '#E0D2B6', edge: '#3A2C21', chip: '#F0DFBB',
    accent: '#D95F52', accent2: '#3E8E85', onAccent: '#FFFBF0',
    shadowHero: '#EBC0AC', shadowSm: '#DCC5A0',
    warn: '#D98E2B', starlight: '#E9B44C',
    chromeBg: '#FFFDF6', chromeLine: '#E0D2B6',
  },
  dark: {
    bg: '#1F1B2E', card: '#2B2442', fg: '#F2E9D8', sub: '#9D93A8',
    line: '#413966', edge: '#141021', chip: '#3A3156',
    accent: '#F09355', accent2: '#5FC4B4', onAccent: '#241E14',
    shadowHero: '#141021', shadowSm: '#141021',
    warn: '#E9B44C', starlight: '#E9B44C',
    chromeBg: '#2B2442', chromeLine: '#413966',
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
