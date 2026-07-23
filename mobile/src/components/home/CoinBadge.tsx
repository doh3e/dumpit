import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const COUNT_STEPS = 7;
const COUNT_MS = 240;

/** 코인 배지 — 증가 시 카운트업 + 바운스 (웹 헤더 코인 배지 이식) */
export function CoinBadge({ coins }: { coins: number }) {
  const { colors } = useTheme();
  const [shown, setShown] = useState(coins);
  const prev = useRef(coins);
  const scale = useSharedValue(1);

  useEffect(() => {
    const from = prev.current;
    prev.current = coins;
    if (coins === from) return;
    if (coins < from) {
      setShown(coins);   // 감소(회수)는 즉시 반영
      return;
    }
    scale.value = withSequence(withSpring(1.18, { damping: 12 }), withSpring(1, { damping: 14 }));
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setShown(step >= COUNT_STEPS ? coins : Math.round(from + ((coins - from) * step) / COUNT_STEPS));
      if (step >= COUNT_STEPS) clearInterval(timer);
    }, COUNT_MS / COUNT_STEPS);
    return () => clearInterval(timer);
  }, [coins, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: colors.chip, borderColor: colors.edge }, animStyle]}
      accessibilityLabel={`코인 ${coins}개`}
    >
      <Text style={styles.emoji}>🪙</Text>
      <Text style={[styles.count, { color: colors.fg, fontFamily: fonts.chrome }]}>{shown}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
  },
  emoji: { fontSize: 12 },
  count: { fontSize: 12 },
});
