import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { composeTheme } from './compose';
import { ThemeContext } from './context';
import type { PomoColors } from './skins';
import type { Palette } from './tokens';

type ThemeValue = {
  colors: Palette;
  pomo: PomoColors;
  scheme: 'light' | 'dark';
  bgPattern: number | null;
  chromeDeco: number | null;
};

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme() === 'dark' ? 'dark' : 'light'; // 훅 규칙상 항상 호출
  if (ctx) {
    return {
      colors: ctx.colors, pomo: ctx.pomo, scheme: ctx.scheme,
      bgPattern: ctx.bgPattern, chromeDeco: ctx.chromeDeco,
    };
  }
  const { colors, pomo, bgPattern, chromeDeco } = composeTheme(system, null);
  return { colors, pomo, scheme: system, bgPattern, chromeDeco };
}
