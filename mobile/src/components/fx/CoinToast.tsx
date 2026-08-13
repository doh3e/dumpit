import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const SHOW_MS = 2500;

/** 완료 코인 토스트 — 서버 실지급액 +N C (웹 대시보드 코인 토스트 이식) */
export function CoinToast({ coins, taskTitle, onDone }: { coins: number; taskTitle: string; onDone: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), SHOW_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + 96 }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.edge }, retroShadow(3, colors.shadowSm)]}>
        <Text style={[styles.coins, { color: colors.starlight, fontFamily: fonts.chrome }]}>+{coins} C</Text>
        <View style={styles.textCol}>
          <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.displayBold }]}>완료!</Text>
          <Text style={[styles.title, { color: colors.sub, fontFamily: fonts.body }]} numberOfLines={1}>
            {taskTitle}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', zIndex: 35 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    maxWidth: 320,
  },
  coins: { fontSize: 18 },
  textCol: { flexShrink: 1 },
  label: { fontSize: 13 },
  title: { fontSize: 11 },
});
