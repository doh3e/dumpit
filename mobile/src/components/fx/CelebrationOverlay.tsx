import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useAuth } from '../../auth/AuthContext';
import { celebrationFor, type CelebrationSprite } from '../../celebration/registry';
import { buildParticles, TOTAL_MS, type Particle } from '../../celebration/motions';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

/**
 * 하루 전체 완료 축하 — 장착한 CELEBRATION 테마의 전용 모션 + 완주 배너 원샷 연출.
 * (웹 RocketLaunch.jsx 대응)
 *
 * 파티클 전부가 공유 진행값 하나(0→1, TOTAL_MS 선형)를 읽는다. 파티클마다 타이머를 두면
 * 노드 수만큼 애니메이션이 생겨 저사양 기기에서 끊긴다.
 *
 * codeOverride: 상점 미리보기용 — 있으면 실제 장착 대신 이 코드의 연출을 재생한다.
 */
export function CelebrationOverlay({ onDone, codeOverride }: { onDone: () => void; codeOverride?: string }) {
  const { colors } = useTheme();
  const { me } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // 바닥에 붙는 파티클(모닥불·새싹·캔디)이 OS 내비게이션 바에 깔리지 않도록 그리기 영역을 줄인다.
  // 탭 화면은 탭바가 이미 자리를 차지하지만, 스택 화면(상점 미리보기)은 화면 끝까지가 영역이다.
  const stageHeight = Math.max(height - insets.bottom, 1);

  const sprite = celebrationFor(codeOverride ?? me?.equipments?.CELEBRATION);
  const [particles] = useState<Particle[]>(() =>
    reduceMotion ? [] : buildParticles(sprite, { width, height: stageHeight }),
  );

  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    progress.value = withTiming(1, { duration: TOTAL_MS, easing: Easing.linear });
    const timer = setTimeout(() => onDoneRef.current(), TOTAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}>
        {particles.map((p) => (
          <ParticleView key={p.key} p={p} progress={progress} height={stageHeight} />
        ))}
      </View>
      <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.edge }, retroShadow(5, colors.shadowHero)]}>
        {reduceMotion && (
          <View style={styles.staticRow}>
            {[0, 1, 2].map((i) => (
              <Image key={i} source={sprite.img} style={styles.staticSprite} resizeMode="contain" />
            ))}
          </View>
        )}
        <Text style={[styles.bannerText, { color: colors.fg, fontFamily: fonts.chrome }]}>오늘 할 일 완주!</Text>
      </View>
    </View>
  );
}

function ParticleView({ p, progress, height }: { p: Particle; progress: SharedValue<number>; height: number }) {
  const style = useAnimatedStyle(() => {
    'worklet';
    const elapsed = progress.value * TOTAL_MS;
    return particleStyle(p, elapsed, height);
  });

  return (
    <Animated.Image
      source={p.src}
      resizeMode="contain"
      style={[
        styles.part,
        {
          left: p.left,
          width: p.size,
          height: p.size,
          ...(p.top != null ? { top: p.top } : {}),
          ...(p.bottom != null ? { bottom: p.bottom } : {}),
          ...(p.centered ? { marginLeft: -p.size / 2, ...(p.top != null ? { marginTop: -p.size / 2 } : {}) } : {}),
        },
        style,
      ]}
    />
  );
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** 다단 키프레임 보간 — stops는 오름차순 진행률 */
function track(t: number, stops: number[], values: number[]): number {
  'worklet';
  if (t <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i]) {
      const span = stops[i] - stops[i - 1];
      const local = span === 0 ? 1 : (t - stops[i - 1]) / span;
      return lerp(values[i - 1], values[i], local);
    }
  }
  return values[values.length - 1];
}

/** 웹 index.css '보상 모션' 키프레임의 근사 이식 */
function particleStyle(p: Particle, elapsed: number, vh: number) {
  'worklet';
  const local = elapsed - p.delay;

  // 무한 반복 모션은 시작 전에도 보여야 자연스럽다 (모닥불 광륜·화염)
  if (p.kind === 'glow') {
    const cycle = (Math.max(local, 0) % 720) / 720;
    const wave = Math.sin(cycle * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    return { opacity: 0.55 + wave * 0.25, transform: [{ scale: 1 + wave * 0.05 }] };
  }
  if (p.kind === 'flame' || p.kind === 'flameAlt') {
    const t = Math.max(local, 0);
    // 두 포즈가 180ms 어긋난 위상으로 깜빡여 타닥타닥 (steps(1))
    const phase = p.kind === 'flameAlt' ? 180 : 0;
    const on = Math.floor(((t + phase) % 360) / 180) === 0;
    const breatheWave = Math.sin((t % 900) / 900 * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    return {
      opacity: on ? 1 : 0,
      transform: [{ scaleX: 1 + breatheWave * 0.02 }, { scaleY: 1 + breatheWave * 0.06 }],
    };
  }

  if (local < 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };

  switch (p.kind) {
    case 'rocketUp': {
      const t = Math.min(local / 1400, 1);
      return {
        opacity: track(t, [0, 0.8, 1], [1, 1, 0]),
        transform: [{ translateY: -t * 1.3 * vh }],
      };
    }
    case 'meteor': {
      const t = Math.min(local / 1150, 1);
      return {
        opacity: track(t, [0, 0.75, 1], [1, 1, 0]),
        transform: [{ translateX: -t * 0.55 * vh }, { translateY: t * 1.2 * vh }],
      };
    }
    case 'meteorBig': {
      const t = Math.min(local / 650, 1);
      return {
        opacity: track(t, [0, 0.8, 1], [1, 1, 0]),
        transform: [{ translateX: -t * 0.7 * vh }, { translateY: t * 1.35 * vh }],
      };
    }
    case 'star':
    case 'sparkle': {
      // star는 2회 반복, sparkle은 1회 (웹 animation-iteration-count)
      const cycles = p.kind === 'star' ? 2 : 1;
      const total = 900 * cycles;
      if (local > total) return { opacity: 0, transform: [{ scale: 0.5 }] };
      const t = (local % 900) / 900;
      const wave = Math.sin(t * Math.PI);
      return { opacity: wave, transform: [{ scale: 0.5 + wave * 0.65 }] };
    }
    case 'petal': {
      const t = Math.min(local / 1900, 1);
      const sway = p.sway ?? 0;
      return {
        opacity: track(t, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
        transform: [
          { translateX: t * 1.28 * vh },
          { translateY: track(t, [0, 0.25, 0.5, 0.75, 1], [0, sway, -sway, sway, 0]) },
          { rotate: `${t * 360}deg` },
        ],
      };
    }
    case 'sprout': {
      const t = Math.min(local / 500, 1);
      return { opacity: 1, transform: [{ scale: track(t, [0, 0.7, 1], [0, 1.15, 1]) }] };
    }
    case 'candy': {
      const t = Math.min(local / 1500, 1);
      const dx = p.dx ?? 0;
      const peak = p.peak ?? 0;
      return {
        opacity: track(t, [0, 0.55, 1], [1, 1, 0]),
        transform: [
          { translateX: track(t, [0, 0.55, 1], [0, dx * 0.8, dx]) },
          { translateY: track(t, [0, 0.55, 1], [0, peak, 0.1 * vh]) },
          { rotate: `${track(t, [0, 0.55, 1], [0, 200, 360])}deg` },
        ],
      };
    }
    case 'ember': {
      const t = Math.min(local / 1600, 1);
      const d = p.drift ?? 0;
      return {
        opacity: track(t, [0, 0.55, 0.8, 1], [1, 0.95, 0.6, 0]),
        transform: [
          { translateX: track(t, [0, 0.25, 0.55, 0.8, 1], [0, d * 0.6, d * -0.4, d, d * 0.5]) },
          { translateY: track(t, [0, 0.25, 0.55, 0.8, 1], [0, -0.1 * vh, -0.22 * vh, -0.32 * vh, -0.4 * vh]) },
        ],
      };
    }
    case 'fwRocket': {
      const t = Math.min(local / 500, 1);
      return {
        opacity: track(t, [0, 0.95, 1], [1, 1, 0]),
        transform: [{ translateY: -t * t * 0.72 * vh }],   // ease-in 근사
      };
    }
    case 'fwFlash': {
      const t = Math.min(local / 320, 1);
      return {
        opacity: track(t, [0, 0.6, 1], [1, 0.9, 0]),
        transform: [{ scale: track(t, [0, 0.6, 1], [0.4, 2.4, 3]) }],
      };
    }
    case 'fwBloom': {
      const t = Math.min(local / 500, 1);
      return {
        opacity: track(t, [0, 0.7, 1], [1, 1, 0]),
        transform: [{ scale: track(t, [0, 0.7, 1], [0.25, 0.95, 1.1]) }],
      };
    }
    case 'fwBloomLate': {
      const t = Math.min(local / 650, 1);
      return {
        opacity: track(t, [0, 0.6, 1], [0.9, 0.7, 0]),
        transform: [
          { scale: track(t, [0, 0.6, 1], [0.8, 1.15, 1.3]) },
          { translateY: track(t, [0, 0.6, 1], [0, 0, 10]) },
        ],
      };
    }
    case 'fwSpark': {
      const t = Math.min(local / 1050, 1);
      const dx = p.dx ?? 0;
      const dy = p.dy ?? 0;
      // 파열 후 중력 낙하 — 웹은 55%에 도달 후 아래로 흘린다
      return {
        opacity: track(t, [0, 0.55, 0.7, 1], [1, 1, 1, 0]),
        transform: [
          { translateX: track(t, [0, 0.55, 1], [0, dx, dx * 1.1]) },
          { translateY: track(t, [0, 0.55, 1], [0, dy, dy + 90]) },
          { scale: track(t, [0, 0.55, 1], [0.5, 1, 0.8]) },
        ],
      };
    }
    default:
      return { opacity: 0, transform: [{ translateY: 0 }] };
  }
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', zIndex: 80, overflow: 'hidden' },
  part: { position: 'absolute' },
  banner: {
    borderWidth: 2, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 16,
    alignItems: 'center', gap: 8,
  },
  bannerText: { fontSize: 22, textAlign: 'center' },
  staticRow: { flexDirection: 'row', gap: 12 },
  staticSprite: { width: 40, height: 40 },
});

export type { CelebrationSprite };
