import { createContext, useContext } from 'react';
import type { ComposedTheme, Equipments } from './compose';
import type { PomoColors } from './skins';
import type { Palette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeContextValue = ComposedTheme & {
  colors: Palette;
  pomo: PomoColors;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** 상점 미리보기 — 실제 장착을 바꾸지 않고 화면만 임시로 입힌다. null이면 해제 */
  previewEquipments: Equipments;
  setPreviewEquipments: (eq: Equipments) => void;
};

/**
 * Provider 본체(ThemeProvider.tsx)는 AuthContext를 끌어오므로 컨텍스트 정의만 여기 둔다.
 * useTheme이 Provider 모듈을 import하면 인증·구글 로그인 네이티브 모듈까지 딸려온다.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const ctx = useContext(ThemeContext);
  return ctx ? { mode: ctx.mode, setMode: ctx.setMode } : { mode: 'system', setMode: () => {} };
}

/** 상점 미리보기 제어 — Provider 밖에서는 무동작 */
export function useSkinPreview(): { preview: Equipments; setPreview: (eq: Equipments) => void } {
  const ctx = useContext(ThemeContext);
  return ctx
    ? { preview: ctx.previewEquipments, setPreview: ctx.setPreviewEquipments }
    : { preview: null, setPreview: () => {} };
}
