import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type ToastState = { id: number; message: string } | null;
const ToastContext = createContext<{ show(message: string): void } | null>(null);

const TOAST_MS = 2500;

/** 하단 공용 토스트 — 에러·안내 겸용. 새 토스트가 오면 교체 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {toast && (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(160)}
            pointerEvents="none"
            style={[styles.wrap, { bottom: insets.bottom + 84 }]}
          >
            <View
              style={[
                styles.toast,
                { backgroundColor: colors.card, borderColor: colors.edge },
                retroShadow(3, colors.shadowSm),
              ]}
            >
              <Text style={[styles.text, { color: colors.fg, fontFamily: fonts.body }]} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 ToastProvider 안에서만 사용');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  toast: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 420 },
  text: { fontSize: 13, textAlign: 'center' },
});
