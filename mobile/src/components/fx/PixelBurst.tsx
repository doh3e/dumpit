import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';

const DURATION = 600;
const COUNT = 10;
const GRAVITY = 140;

type ParticleSpec = { angle: number; speed: number; size: number; color: string };

function Particle({ spec, progress }: { spec: ParticleSpec; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: 1 - t,
      transform: [
        { translateX: Math.cos(spec.angle) * spec.speed * t },
        { translateY: Math.sin(spec.angle) * spec.speed * t + GRAVITY * t * t },
      ],
    };
  });
  return <Animated.View style={[{ width: spec.size, height: spec.size, backgroundColor: spec.color, position: 'absolute' }, style]} />;
}

/** 완료 지점에서 픽셀 사각형이 방사형으로 튀며 중력 낙하 — 웹 PixelBurst 이식 */
export function PixelBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const specs = useMemo<ParticleSpec[]>(() => {
    const palette = [colors.accent, colors.accent2, colors.starlight];
    return Array.from({ length: COUNT }, (_, i) => ({
      angle: (i / COUNT) * Math.PI * 2 + Math.random() * 0.5,
      speed: 34 + Math.random() * 40,
      size: 4 + Math.round(Math.random() * 4),
      color: palette[i % palette.length],
    }));
  }, [colors]);

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(invokeDone)();
    });
    function invokeDone() { onDoneRef.current(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
      <View style={{ position: 'absolute', left: x, top: y }}>
        {specs.map((s, i) => <Particle key={i} spec={s} progress={progress} />)}
      </View>
    </View>
  );
}
