import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext } from './ThemeProvider';
import { palettes, type Palette } from './tokens';

export function useTheme(): { colors: Palette; scheme: 'light' | 'dark' } {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme() === 'dark' ? 'dark' : 'light'; // 훅 규칙상 항상 호출
  if (ctx) return { colors: ctx.colors, scheme: ctx.scheme };
  return { colors: palettes[system], scheme: system };
}
