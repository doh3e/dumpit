import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from 'react';
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

function hydrationGate() {
  let resolve!: () => void;
  const promise = new Promise<void>((onResolve) => { resolve = onResolve; });
  return { promise, resolve };
}

function hydrationCycle() {
  return {
    active: true,
    mode: hydrationGate(),
    contrast: hydrationGate(),
    bold: hydrationGate(),
  };
}

function enqueuePreferenceWrite<T>(
  queue: { current: Promise<void> },
  operationRef: { current: number },
  waitForHydration: () => Promise<void>,
  next: T,
  apply: (value: T) => void,
  saved: { current: T },
  write: () => Promise<void>,
) {
  const operation = ++operationRef.current;
  const request = queue.current.then(async () => {
    await waitForHydration();
    apply(next);
    try {
      await write();
      saved.current = next;
    } catch (error) {
      if (operation === operationRef.current) apply(saved.current);
      throw error;
    }
  });
  queue.current = request.then(() => undefined, () => undefined);
  return request;
}

/**
 * 테마 모드(기기별 AsyncStorage) + 장착 스킨(서버 me.equipments) 합성.
 * AuthProvider 안쪽에 두어야 equipments를 읽을 수 있다 — app/_layout.tsx의 Provider 순서 참고.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { me } = useAuth();
  const accountKey = me?.email ?? null;
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [cachedEquip, setCachedEquip] = useState<Equipments>(null);
  const [previewState, setPreviewState] = useState<{ accountKey: string | null; equipments: Equipments }>({
    accountKey,
    equipments: null,
  });
  const [contrastMode, setContrastModeState] = useState<ContrastMode>('system');
  const [boldText, setBoldTextState] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [systemHighContrast, setSystemHighContrast] = useState(false);
  const hydration = useRef(hydrationCycle());
  const modeSaved = useRef<ThemeMode>('system');
  const contrastSaved = useRef<ContrastMode>('system');
  const boldSaved = useRef(false);
  const modeQueue = useRef<Promise<void>>(Promise.resolve());
  const contrastQueue = useRef<Promise<void>>(Promise.resolve());
  const boldQueue = useRef<Promise<void>>(Promise.resolve());
  const modeOperation = useRef(0);
  const contrastOperation = useRef(0);
  const boldOperation = useRef(0);

  useEffect(() => {
    const cycle = hydrationCycle();
    hydration.current = cycle;
    const modeRead = AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (!cycle.active || hydration.current !== cycle) return;
      if (v === 'light' || v === 'dark' || v === 'system') {
        modeSaved.current = v;
        setModeState(v);
      }
    }).catch(() => {}).finally(cycle.mode.resolve);
    AsyncStorage.getItem(EQUIP_KEY).then((v) => {
      if (cycle.active && hydration.current === cycle && v) setCachedEquip(JSON.parse(v) as Equipments);
    }).catch(() => {});
    const contrastRead = AsyncStorage.getItem(CONTRAST_KEY).then((v) => {
      if (!cycle.active || hydration.current !== cycle) return;
      if (v === 'high' || v === 'normal' || v === 'system') {
        contrastSaved.current = v;
        setContrastModeState(v);
      }
    }).catch(() => {}).finally(cycle.contrast.resolve);
    const boldRead = AsyncStorage.getItem(BOLD_KEY).then((v) => {
      if (!cycle.active || hydration.current !== cycle) return;
      const next = v === '1';
      boldSaved.current = next;
      setBoldTextState(next);
    }).catch(() => {}).finally(cycle.bold.resolve);
    void Promise.all([modeRead, contrastRead, boldRead]).then(() => {
      if (cycle.active && hydration.current === cycle) setPreferencesReady(true);
    });
    return () => {
      cycle.active = false;
      cycle.mode.resolve();
      cycle.contrast.resolve();
      cycle.bold.resolve();
    };
  }, []);

  const waitForHydration = useCallback(async (key: 'mode' | 'contrast' | 'bold') => {
    while (true) {
      const cycle = hydration.current;
      await cycle[key].promise;
      if (hydration.current !== cycle) continue;
      if (cycle.active) return;
      throw new Error('기기 설정 화면이 닫혔어요.');
    }
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

  if (previewState.accountKey !== accountKey) {
    setPreviewState({ accountKey, equipments: null });
  }

  const previewEquipments = previewState.accountKey === accountKey ? previewState.equipments : null;
  const setPreviewEquipments = useCallback((update: SetStateAction<Equipments>) => {
    setPreviewState((current) => {
      const currentEquipments = current.accountKey === accountKey ? current.equipments : null;
      return {
        accountKey,
        equipments: typeof update === 'function' ? update(currentEquipments) : update,
      };
    });
  }, [accountKey]);

  const setMode = useCallback((m: ThemeMode) => {
    return enqueuePreferenceWrite(
      modeQueue,
      modeOperation,
      () => waitForHydration('mode'),
      m,
      setModeState,
      modeSaved,
      () => AsyncStorage.setItem(MODE_KEY, m),
    );
  }, [waitForHydration]);

  const setContrastMode = useCallback((m: ContrastMode) => {
    return enqueuePreferenceWrite(
      contrastQueue,
      contrastOperation,
      () => waitForHydration('contrast'),
      m,
      setContrastModeState,
      contrastSaved,
      () => AsyncStorage.setItem(CONTRAST_KEY, m),
    );
  }, [waitForHydration]);

  const setBoldText = useCallback((on: boolean) => {
    return enqueuePreferenceWrite(
      boldQueue,
      boldOperation,
      () => waitForHydration('bold'),
      on,
      setBoldTextState,
      boldSaved,
      () => AsyncStorage.setItem(BOLD_KEY, on ? '1' : '0'),
    );
  }, [waitForHydration]);

  const scheme = mode === 'system' ? system : mode;
  const highContrastOn = contrastMode === 'high' || (contrastMode === 'system' && systemHighContrast);
  const composed = useMemo(
    () => {
      const actual = me?.equipments ?? cachedEquip ?? {};
      const equipments = previewEquipments ? { ...actual, ...previewEquipments } : actual;
      return composeTheme(scheme, equipments, { highContrast: highContrastOn });
    },
    [scheme, me?.equipments, cachedEquip, previewEquipments, highContrastOn],
  );
  const fonts = useMemo(() => resolveFonts(boldText), [boldText]);

  // 위젯도 같은 테마를 보도록 미러 (프리뷰는 제외 — 위젯은 실장착만 따른다)
  useEffect(() => {
    void mirrorTheme(mode, me?.equipments ?? cachedEquip);
  }, [mode, me, cachedEquip]);

  const value = useMemo(
    () => ({
      ...composed,
      fonts,
      scheme,
      preferencesReady,
      mode,
      setMode,
      contrastMode,
      setContrastMode,
      boldText,
      setBoldText,
      previewEquipments,
      setPreviewEquipments,
    }),
    [
      composed,
      fonts,
      scheme,
      preferencesReady,
      mode,
      setMode,
      contrastMode,
      setContrastMode,
      boldText,
      setBoldText,
      previewEquipments,
      setPreviewEquipments,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { useA11yPrefs, useSkinPreview, useThemeMode, type ContrastMode, type ThemeMode } from './context';
