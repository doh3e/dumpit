/**
 * 상점 테마 스킨 팔레트 — 웹 `frontend/src/index.css`의 스킨 블록(414~546행) 1:1 이식.
 * **웹 CSS 값이 바뀌면 이 파일도 함께 고칠 것.**
 *
 * 웹은 CSS 캐스케이드로 `:root → [data-skin-bg] → [data-skin-chrome]` 순서로 덮는다.
 * RN에는 CSS 변수가 없으므로 composeTheme()이 같은 순서로 팔레트를 합성한다.
 *
 * 주의: 웹 BACKGROUND 스킨은 `--fg`/`--sub`를 건드리지 않는다(본문 색은 기본 유지).
 * 앱도 동일하게 두어 웹과 화면이 갈리지 않게 한다.
 */
import type { Palette } from './tokens';

/** 아이템 코드(`bg.ocean` / `chrome.ocean` / `pomo.ocean`) 공통 접미사 */
export type SkinKey = 'ocean' | 'lavender' | 'rose' | 'sprout' | 'galaxy' | 'wood' | 'candy';
export type Scheme = 'light' | 'dark';

export type ChromeColors = { chromeBg: string; chromeLine: string };
export type PomoColors = { focus: string; rest: string; ring: string; soft: string };

type BgSkin = {
  light: Partial<Palette>;
  dark: Partial<Palette>;
  /** 배경 타일 무늬 (--bg-pattern) */
  pattern?: { light: number; dark: number };
};
type ChromeSkin = {
  light: ChromeColors;
  dark: ChromeColors;
  /** 사이드바·상단바 장식 타일 */
  deco?: { light: number; dark: number };
};
/** ring 생략 시 기본 팔레트의 line을 쓴다 (웹도 candy만 --pomo-ring을 따로 준다) */
type PomoSkin = { light: Omit<PomoColors, 'ring'> & { ring?: string }; dark: Omit<PomoColors, 'ring'> & { ring?: string } };

export const BG_SKINS: Record<SkinKey, BgSkin> = {
  ocean: {
    light: {
      bg: '#E4EFEC', card: '#FCFEFD', chip: '#D3E6E1', line: '#B7D4CD', edge: '#28423C',
      accent: '#2E7D8A', accent2: '#D97757', onAccent: '#F4FBF9',
      shadowHero: '#A9CEC5', shadowSm: '#C6DDD7',
    },
    dark: {
      bg: '#152430', card: '#1E3240', chip: '#28414F', line: '#375366', edge: '#0B141C',
      accent: '#5FB8C9', accent2: '#F09355', onAccent: '#0F1D26',
      shadowHero: '#0B141C', shadowSm: '#0B141C',
    },
  },
  lavender: {
    light: {
      bg: '#EEEAF4', card: '#FDFCFF', chip: '#E2DAEC', line: '#CBBEDC', edge: '#372C48',
      accent: '#8A63C4', accent2: '#3E8E85', onAccent: '#FBF9FF',
      shadowHero: '#CDBEE2', shadowSm: '#D8CCE8',
    },
    dark: {
      bg: '#251D3A', card: '#32294E', chip: '#40355F', line: '#4F4373', edge: '#151022',
      accent: '#B79CE8', accent2: '#5FC4B4', onAccent: '#1D1630',
      shadowHero: '#151022', shadowSm: '#151022',
    },
  },
  rose: {
    light: {
      bg: '#F5E9EA', card: '#FEFCFC', chip: '#EDD8DB', line: '#DDBCC2', edge: '#43282E',
      accent: '#C25B6E', accent2: '#6E9E62', onAccent: '#FFF7F8',
      shadowHero: '#E3C2C8', shadowSm: '#E9CFD4',
    },
    dark: {
      bg: '#2A1B20', card: '#3A282E', chip: '#48333A', line: '#5C424B', edge: '#170D10',
      accent: '#E8899B', accent2: '#8FBF6F', onAccent: '#251318',
      shadowHero: '#170D10', shadowSm: '#170D10',
    },
  },
  sprout: {
    light: {
      bg: '#EAF2E3', card: '#FBFEF7', chip: '#DCEBCE', line: '#C2DBAA', edge: '#2F4224',
      accent: '#5C8A3C', accent2: '#C4708F', onAccent: '#F7FCF0',
      shadowHero: '#BFD8A6', shadowSm: '#CFE2BA',
    },
    dark: {
      bg: '#1B2617', card: '#26351F', chip: '#31452A', line: '#40573A', edge: '#0E150B',
      accent: '#8FBF6F', accent2: '#D98BA6', onAccent: '#131C0E',
      shadowHero: '#0E150B', shadowSm: '#0E150B',
    },
    pattern: {
      light: require('../../assets/shop/pattern_sprout_light.png'),
      dark: require('../../assets/shop/pattern_sprout_dark.png'),
    },
  },
  galaxy: {
    light: {
      bg: '#E9EAF6', card: '#FDFDFF', chip: '#DBDDF0', line: '#C2C5E4', edge: '#2E3050',
      accent: '#6D74C9', accent2: '#C9922E', onAccent: '#F8F9FF',
      shadowHero: '#C6C9E8', shadowSm: '#D2D5EC',
    },
    dark: {
      bg: '#151329', card: '#201D3D', chip: '#2B2750', line: '#3D3866', edge: '#0A0918',
      accent: '#8F97E8', accent2: '#E9B44C', onAccent: '#12102A',
      shadowHero: '#0A0918', shadowSm: '#0A0918',
    },
    pattern: {
      light: require('../../assets/shop/pattern_galaxy_light.png'),
      dark: require('../../assets/shop/pattern_galaxy_dark.png'),
    },
  },
  wood: {
    light: {
      bg: '#F1E5D2', card: '#FDF8EE', chip: '#E7D5B8', line: '#D6BE97', edge: '#3E2E1C',
      accent: '#A8763E', accent2: '#5C8A6E', onAccent: '#FFF9EC',
      shadowHero: '#D9C29B', shadowSm: '#E3D2B2',
    },
    dark: {
      bg: '#241B10', card: '#2F2517', chip: '#3B2F1E', line: '#4E3F2A', edge: '#120C06',
      accent: '#C99B5C', accent2: '#7FAF8F', onAccent: '#1D150A',
      shadowHero: '#120C06', shadowSm: '#120C06',
    },
    pattern: {
      light: require('../../assets/shop/pattern_wood_light.png'),
      dark: require('../../assets/shop/pattern_wood_dark.png'),
    },
  },
  candy: {
    light: {
      bg: '#F7E7EE', card: '#FEFAFC', chip: '#F2D7E2', line: '#E5BCCE', edge: '#46243A',
      accent: '#E05C8A', accent2: '#3E93B8', onAccent: '#FFF6FA',
      shadowHero: '#EBC4D4', shadowSm: '#F0D2DE',
    },
    dark: {
      bg: '#2A1722', card: '#3A2230', chip: '#482C3D', line: '#5E3B50', edge: '#160A11',
      accent: '#F08CAE', accent2: '#7FB8E8', onAccent: '#2A1220',
      shadowHero: '#160A11', shadowSm: '#160A11',
    },
    pattern: {
      light: require('../../assets/shop/pattern_candy_light.png'),
      dark: require('../../assets/shop/pattern_candy_dark.png'),
    },
  },
};

export const CHROME_SKINS: Record<SkinKey, ChromeSkin> = {
  ocean: {
    light: { chromeBg: '#E4EFEC', chromeLine: '#B7D4CD' },
    dark: { chromeBg: '#1E3240', chromeLine: '#375366' },
  },
  lavender: {
    light: { chromeBg: '#EEEAF4', chromeLine: '#CBBEDC' },
    dark: { chromeBg: '#32294E', chromeLine: '#4F4373' },
  },
  rose: {
    light: { chromeBg: '#F5E9EA', chromeLine: '#DDBCC2' },
    dark: { chromeBg: '#3A282E', chromeLine: '#5C424B' },
  },
  sprout: {
    light: { chromeBg: '#EAF2E3', chromeLine: '#C2DBAA' },
    dark: { chromeBg: '#26351F', chromeLine: '#40573A' },
    deco: {
      light: require('../../assets/shop/deco_sprout_light.png'),
      dark: require('../../assets/shop/deco_sprout_dark.png'),
    },
  },
  galaxy: {
    light: { chromeBg: '#E9EAF6', chromeLine: '#C2C5E4' },
    dark: { chromeBg: '#201D3D', chromeLine: '#3D3866' },
    deco: {
      light: require('../../assets/shop/deco_galaxy_light.png'),
      dark: require('../../assets/shop/deco_galaxy_dark.png'),
    },
  },
  wood: {
    light: { chromeBg: '#F1E5D2', chromeLine: '#D6BE97' },
    dark: { chromeBg: '#2A2118', chromeLine: '#4A3A28' },
    deco: {
      light: require('../../assets/shop/deco_wood_light.png'),
      dark: require('../../assets/shop/deco_wood_dark.png'),
    },
  },
  candy: {
    light: { chromeBg: '#F7E7EE', chromeLine: '#E5BCCE' },
    dark: { chromeBg: '#3A2230', chromeLine: '#5E3B50' },
    deco: {
      light: require('../../assets/shop/deco_candy_light.png'),
      dark: require('../../assets/shop/deco_candy_dark.png'),
    },
  },
};

export const POMO_SKINS: Record<SkinKey, PomoSkin> = {
  ocean: {
    light: { focus: '#2E7D8A', rest: '#D97757', soft: '#E4EFEC' },
    dark: { focus: '#5FB8C9', rest: '#F09355', soft: '#1E3240' },
  },
  lavender: {
    light: { focus: '#8A63C4', rest: '#3E8E85', soft: '#EEEAF4' },
    dark: { focus: '#B79CE8', rest: '#5FC4B4', soft: '#32294E' },
  },
  rose: {
    light: { focus: '#C25B6E', rest: '#6E9E62', soft: '#F5E9EA' },
    dark: { focus: '#E8899B', rest: '#8FBF6F', soft: '#3A282E' },
  },
  sprout: {
    light: { focus: '#5C8A3C', rest: '#C4708F', soft: '#EAF2E3' },
    dark: { focus: '#8FBF6F', rest: '#D98BA6', soft: '#1B2617' },
  },
  galaxy: {
    light: { focus: '#6D74C9', rest: '#C9922E', soft: '#E9EAF6' },
    dark: { focus: '#8F97E8', rest: '#E9B44C', soft: '#151329' },
  },
  wood: {
    light: { focus: '#A8763E', rest: '#5C8A6E', soft: '#F1E5D2' },
    dark: { focus: '#C99B5C', rest: '#7FAF8F', soft: '#241B10' },
  },
  candy: {
    light: { focus: '#E05C8A', rest: '#5CA8E0', ring: '#F0C4D8', soft: '#FBE4EE' },
    dark: { focus: '#F08CAE', rest: '#7FB8E8', ring: '#5A3A48', soft: '#402832' },
  },
};

const SKIN_KEYS = new Set<string>(Object.keys(BG_SKINS));

/** `bg.ocean` → `ocean`. 미지 코드·미장착은 null (웹 applySkins.js의 code.split('.').pop()과 동일 규칙) */
export function skinKey(code: string | null | undefined): SkinKey | null {
  if (!code) return null;
  const key = code.split('.').pop();
  return key && SKIN_KEYS.has(key) ? (key as SkinKey) : null;
}
