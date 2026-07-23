import { useEffect, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const TOTAL_MS = 1900;
const ASCEND_MS = 1100;

/** 오늘 전부 완료 — 로켓 상승 + "오늘 클리어!" (웹 RocketLaunch 대응) */
export function RocketLaunch({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    progress.value = withTiming(1, { duration: ASCEND_MS, easing: Easing.in(Easing.quad) });
    const timer = setTimeout(() => onDoneRef.current(), TOTAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * (height * 0.75) }],
    opacity: 1 - progress.value * 0.6,
  }));

  const trail = [colors.accent, colors.starlight, colors.accent2, colors.warn, colors.accent];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      <Animated.View style={[styles.rocketCol, rocketStyle]}>
        <Text style={styles.rocket}>🚀</Text>
        <View style={styles.trail}>
          {trail.map((c, i) => (
            <View key={i} style={[styles.trailDot, { backgroundColor: c, opacity: 1 - i * 0.18 }]} />
          ))}
        </View>
      </Animated.View>
      <Animated.Text
        entering={FadeIn.delay(700).duration(300)}
        exiting={FadeOut.duration(250)}
        style={[styles.message, { color: colors.starlight, fontFamily: fonts.displayBold }]}
      >
        오늘 클리어!
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end', zIndex: 40 },
  rocketCol: { alignItems: 'center', marginBottom: 40 },
  rocket: { fontSize: 48 },
  trail: { alignItems: 'center', gap: 4, marginTop: 2 },
  trailDot: { width: 8, height: 8 },
  message: {
    position: 'absolute', alignSelf: 'center', bottom: '52%',
    fontSize: 26, textAlign: 'center',
  },
});
