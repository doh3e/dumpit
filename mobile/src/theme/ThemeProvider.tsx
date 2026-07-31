import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { mirrorTheme } from '../widget/mirror';
import { composeTheme, type Equipments } from './compose';
import { ThemeContext, type ThemeMode } from './context';

const MODE_KEY = 'dumpit_theme_mode';
/** 서버(me.equipments)가 원본, 이 캐시는 첫 페인트 번쩍임 방지용 (웹 localStorage dumpit_equipments 대응) */
const EQUIP_KEY = 'dumpit_equipments';

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

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    }).catch(() => {});
    AsyncStorage.getItem(EQUIP_KEY).then((v) => {
      if (v) setCachedEquip(JSON.parse(v) as Equipments);
    }).catch(() => {});
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

  const scheme = mode === 'system' ? system : mode;
  const equipments = previewEquipments ?? me?.equipments ?? cachedEquip;
  const composed = useMemo(() => composeTheme(scheme, equipments), [scheme, equipments]);

  // 위젯도 같은 테마를 보도록 미러 (프리뷰는 제외 — 위젯은 실장착만 따른다)
  useEffect(() => {
    void mirrorTheme(mode, me?.equipments ?? cachedEquip);
  }, [mode, me, cachedEquip]);

  const value = useMemo(
    () => ({ ...composed, scheme, mode, setMode, previewEquipments, setPreviewEquipments }),
    // setMode는 매 렌더 새로 만들어지지만 상태만 건드리므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [composed, scheme, mode, previewEquipments],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { useSkinPreview, useThemeMode, type ThemeMode } from './context';
