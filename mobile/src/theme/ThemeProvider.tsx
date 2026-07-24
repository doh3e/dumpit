import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type Palette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';
const MODE_KEY = 'dumpit_theme_mode';

type ThemeContextValue = {
  colors: Palette;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** 테마 모드(라이트/다크/시스템) — 기기별 설정(AsyncStorage). Provider 밖에서는 useTheme이 시스템 값 폴백 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    }).catch(() => {});
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  };

  const scheme = mode === 'system' ? system : mode;
  return (
    <ThemeContext.Provider value={{ colors: palettes[scheme], scheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const ctx = useContext(ThemeContext);
  return ctx ? { mode: ctx.mode, setMode: ctx.setMode } : { mode: 'system', setMode: () => {} };
}
