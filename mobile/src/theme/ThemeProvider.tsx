import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { mirrorTheme } from '../widget/mirror';
import { composeTheme, type Equipments } from './compose';
import { ThemeContext, type ContrastMode, type ThemeMode } from './context';
import { resolveFonts } from './typography';

const MODE_KEY = 'dumpit_theme_mode';
/** 서버(me.equipments)가 원본, 이 캐시는 첫 페인트 번쩍임 방지용 (웹 localStorage dumpit_equipments 대응) */
const EQUIP_KEY = 'dumpit_equipments';
const CONTRAST_KEY = 'dumpit_contrast_mode';
const BOLD_KEY = 'dumpit_bold_text';

/**
 * 테마 모드(기기별 AsyncStorage) + 장착 스킨(서버 me.equipments) 합성.
 * AuthProvider 안쪽에 두어야 equipments를 읽을 수 있다 — app/_layout.tsx의 Provider 순서 참고.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { me } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [cachedEquip, setCachedEquip] = useState<Equipments>(null);
  const [previewEquipments, setPreviewEquipments] = useState<Equipments>(null);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>('system');
  const [boldText, setBoldTextState] = useState(false);
  const [systemHighContrast, setSystemHighContrast] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    }).catch(() => {});
    AsyncStorage.getItem(EQUIP_KEY).then((v) => {
      if (v) setCachedEquip(JSON.parse(v) as Equipments);
    }).catch(() => {});
    AsyncStorage.getItem(CONTRAST_KEY).then((v) => {
      if (v === 'high' || v === 'normal' || v === 'system') setContrastModeState(v);
    }).catch(() => {});
    AsyncStorage.getItem(BOLD_KEY).then((v) => setBoldTextState(v === '1')).catch(() => {});
  }, []);

  // 시스템 고대비 감시 — Android 전용 API(iOS에서는 false로 남는다)
  useEffect(() => {
    AccessibilityInfo.isHighTextContrastEnabled?.().then(setSystemHighContrast).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('highTextContrastChanged', setSystemHighContrast);
    return () => sub.remove();
  }, []);

  // 로그인 상태가 확정되면 캐시를 서버 값으로 맞춘다 (로그아웃 시 비워 다음 계정에 새지 않게)
  useEffect(() => {
    if (me) {
      const eq = me.equipments ?? {};
      setCachedEquip(eq);
      AsyncStorage.setItem(EQUIP_KEY, JSON.stringify(eq)).catch(() => {});
    } else {
      setCachedEquip(null);
      AsyncStorage.removeItem(EQUIP_KEY).catch(() => {});
    }
  }, [me]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  };
  const setContrastMode = (m: ContrastMode) => {
    setContrastModeState(m);
    AsyncStorage.setItem(CONTRAST_KEY, m).catch(() => {});
  };
  const setBoldText = (on: boolean) => {
    setBoldTextState(on);
    AsyncStorage.setItem(BOLD_KEY, on ? '1' : '0').catch(() => {});
  };

  const scheme = mode === 'system' ? system : mode;
  const equipments = previewEquipments ?? me?.equipments ?? cachedEquip;
  const highContrastOn = contrastMode === 'high' || (contrastMode === 'system' && systemHighContrast);
  const composed = useMemo(
    () => composeTheme(scheme, equipments, { highContrast: highContrastOn }),
    [scheme, equipments, highContrastOn],
  );
  const fonts = useMemo(() => resolveFonts(boldText), [boldText]);

  // 위젯도 같은 테마를 보도록 미러 (프리뷰는 제외 — 위젯은 실장착만 따른다)
  useEffect(() => {
    void mirrorTheme(mode, me?.equipments ?? cachedEquip);
  }, [mode, me, cachedEquip]);

  const value = useMemo(
    () => ({ ...composed, fonts, scheme, mode, setMode, contrastMode, setContrastMode, boldText, setBoldText, previewEquipments, setPreviewEquipments }),
    // 세터들은 매 렌더 새로 만들어지지만 상태만 건드리므로 의존성에서 제외
    [composed, fonts, scheme, mode, contrastMode, boldText, previewEquipments],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { useA11yPrefs, useSkinPreview, useThemeMode, type ContrastMode, type ThemeMode } from './context';
