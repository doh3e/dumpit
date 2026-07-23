import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const DOTS = 12;
const RADIUS = 30;
const DOT = 6;
const SIZE = (RADIUS + DOT) * 2;

/** 오늘 진행률 픽셀 링 — 12개 사각 도트를 원형 배치, 완료 비율만큼 starlight 채움 (SVG 없이) */
export function OrbitProgress({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  const filled = total > 0 ? Math.round((done / total) * DOTS) : 0;

  return (
    <View style={styles.wrap} accessibilityLabel={`오늘 ${total}개 중 ${done}개 완료`}>
      {Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * Math.PI * 2 - Math.PI / 2;   // 12시 방향부터 시계 방향
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < filled ? colors.starlight : colors.line,
                transform: [
                  { translateX: Math.cos(angle) * RADIUS },
                  { translateY: Math.sin(angle) * RADIUS },
                ],
              },
            ]}
          />
        );
      })}
      <Text style={[styles.count, { color: colors.fg, fontFamily: fonts.chrome }]}>
        {done}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: DOT, height: DOT },
  count: { fontSize: 12 },
});
