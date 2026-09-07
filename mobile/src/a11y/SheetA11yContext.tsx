import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

type SheetA11y = { openCount: number; setSheetOpen: (open: boolean) => void };
const SheetA11yContext = createContext<SheetA11y>({ openCount: 0, setSheetOpen: () => {} });

export function SheetA11yProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);
  const setSheetOpen = useCallback((open: boolean) => {
    setOpenCount((n) => Math.max(0, n + (open ? 1 : -1)));
  }, []);
  const value = useMemo(() => ({ openCount, setSheetOpen }), [openCount, setSheetOpen]);
  return <SheetA11yContext.Provider value={value}>{children}</SheetA11yContext.Provider>;
}

export function useSheetA11y(): SheetA11y {
  return useContext(SheetA11yContext);
}

/** 시트가 하나라도 열려 있으면 화면 본문을 TalkBack에서 숨긴다 — accessibilityViewIsModal은 iOS 전용이라 Android는 이 경로가 유일 */
export function SheetA11yScreenHost({ children }: { children: ReactNode }) {
  const { openCount } = useSheetA11y();
  return (
    <View style={{ flex: 1 }} importantForAccessibility={openCount > 0 ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
  );
}
