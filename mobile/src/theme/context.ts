import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { ComposedTheme, Equipments } from './compose';
import type { PomoColors } from './skins';
import type { Palette } from './tokens';
import type { Fonts } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ContrastMode = 'system' | 'high' | 'normal';

export type ThemeContextValue = ComposedTheme & {
  colors: Palette;
  pomo: PomoColors;
  fonts: Fonts;
  scheme: 'light' | 'dark';
  preferencesReady: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  contrastMode: ContrastMode;
  setContrastMode: (m: ContrastMode) => Promise<void>;
  boldText: boolean;
  setBoldText: (on: boolean) => Promise<void>;
  /** 상점 미리보기 — 실제 장착을 바꾸지 않고 화면만 임시로 입힌다. null이면 해제 */
  previewEquipments: Equipments;
  setPreviewEquipments: Dispatch<SetStateAction<Equipments>>;
};

/**
 * Provider 본체(ThemeProvider.tsx)는 AuthContext를 끌어오므로 컨텍스트 정의만 여기 둔다.
 * useTheme이 Provider 모듈을 import하면 인증·구글 로그인 네이티브 모듈까지 딸려온다.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): {
  preferencesReady: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
} {
  const ctx = useContext(ThemeContext);
  return ctx
    ? { preferencesReady: ctx.preferencesReady, mode: ctx.mode, setMode: ctx.setMode }
    : { preferencesReady: true, mode: 'system', setMode: () => Promise.resolve() };
}

/** 상점 미리보기 제어 — Provider 밖에서는 무동작 */
export function useSkinPreview(): {
  preview: Equipments;
  setPreview: Dispatch<SetStateAction<Equipments>>;
} {
  const ctx = useContext(ThemeContext);
  return ctx
    ? { preview: ctx.previewEquipments, setPreview: ctx.setPreviewEquipments }
    : { preview: null, setPreview: () => {} };
}

export function useA11yPrefs(): {
  preferencesReady: boolean;
  contrastMode: ContrastMode; setContrastMode: (m: ContrastMode) => Promise<void>;
  boldText: boolean; setBoldText: (on: boolean) => Promise<void>;
} {
  const ctx = useContext(ThemeContext);
  return ctx
    ? {
        preferencesReady: ctx.preferencesReady,
        contrastMode: ctx.contrastMode,
        setContrastMode: ctx.setContrastMode,
        boldText: ctx.boldText,
        setBoldText: ctx.setBoldText,
      }
    : {
        preferencesReady: true,
        contrastMode: 'system',
        setContrastMode: () => Promise.resolve(),
        boldText: false,
        setBoldText: () => Promise.resolve(),
      };
}
