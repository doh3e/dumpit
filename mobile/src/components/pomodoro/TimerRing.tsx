import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const DOTS = 24;
const RADIUS = 96;
const DOT = 10;
const SIZE = (RADIUS + DOT) * 2;

type Props = {
  remainingSec: number;
  totalSec: number;
  phase: 'FOCUS' | 'BREAK' | 'DONE';
  long?: boolean;
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 뽀모도로 픽셀 링 — OrbitProgress 확장판. 경과 비율만큼 도트가 차오른다 (SVG 없이) */
export function TimerRing({ remainingSec, totalSec, phase, long = false }: Props) {
  const { colors } = useTheme();
  const elapsed = totalSec > 0 ? (totalSec - remainingSec) / totalSec : 1;
  const filled = phase === 'DONE' ? DOTS : Math.round(elapsed * DOTS);
  const fillColor = phase === 'FOCUS' ? colors.accent : long ? colors.starlight : colors.accent2;
  const label = phase === 'FOCUS' ? '집중' : phase === 'BREAK' ? (long ? '긴 휴식' : '휴식') : '완료';

  return (
    <View style={styles.wrap} accessibilityLabel={`${label} 남은 시간 ${fmt(remainingSec)}`}>
      {Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < filled ? fillColor : colors.line,
                transform: [
                  { translateX: Math.cos(angle) * RADIUS },
                  { translateY: Math.sin(angle) * RADIUS },
                ],
              },
            ]}
          />
        );
      })}
      <Text style={[styles.time, { color: colors.fg, fontFamily: fonts.display }]}>
        {phase === 'DONE' ? '🎉' : fmt(remainingSec)}
      </Text>
      <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.chrome }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dot: { position: 'absolute', width: DOT, height: DOT },
  time: { fontSize: 40 },
  label: { fontSize: 13, marginTop: 4 },
});
