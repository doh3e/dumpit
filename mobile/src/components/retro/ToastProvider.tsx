import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { announce } from '../../a11y/announce';
import { retroShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type ToastState = { id: number; message: string; sticky: boolean } | null;
type ShowOptions = { sticky?: boolean };
type ToastApi = { show(message: string, options?: ShowOptions): void; error(message: string): void };
const ToastContext = createContext<ToastApi | null>(null);

const TOAST_MS = 2500;

/** 하단 공용 토스트 — 안내는 2.5초 뒤 소멸, 오류(sticky)는 닫을 때까지 유지(스펙 5.1). 새 토스트가 오면 교체 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, options: ShowOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const sticky = !!options.sticky;
    setToast({ id: Date.now(), message, sticky });
    announce(message);
    if (!sticky) timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  const error = useCallback((message: string) => show(message, { sticky: true }), [show]);

  const value = useMemo(() => ({ show, error }), [show, error]);

  return (
    <ToastContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {toast && (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(160)}
            pointerEvents={toast.sticky ? 'box-none' : 'none'}
            style={[styles.wrap, { bottom: insets.bottom + 84 }]}
          >
            <View
              accessibilityRole={toast.sticky ? 'alert' : undefined}
              style={[
                styles.toast,
                { backgroundColor: colors.card, borderColor: toast.sticky ? colors.accent : colors.edge },
                retroShadow(3, colors.shadowSm),
              ]}
            >
              <Text style={[styles.text, { color: colors.fg, fontFamily: fonts.body }]} numberOfLines={3}>
                {toast.message}
              </Text>
              {toast.sticky && (
                <Pressable
                  onPress={() => setToast(null)}
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                  hitSlop={8}
                  style={[styles.close, { borderColor: colors.edge }]}
                >
                  <Text style={{ color: colors.fg, fontFamily: fonts.chrome, fontSize: 12 }}>×</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 ToastProvider 안에서만 사용');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 420 },
  text: { fontSize: 13, textAlign: 'center', flexShrink: 1 },
  close: { width: 28, height: 28, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
