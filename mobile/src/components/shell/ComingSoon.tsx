import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = {
  emoji: string;
  title: string;
  phase: string;   // 예: "Phase 2에서 만나요"
  children?: ReactNode;
};

/** 미구현 탭의 준비중 화면 — 픽셀 점 장식 + 예고 문구 */
export function ComingSoon({ emoji, title, phase, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>{title}</Text>
      <View style={styles.dots}>
        {[colors.accent, colors.accent2, colors.starlight, colors.accent2, colors.accent].map((c, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={[styles.phase, { color: colors.sub, fontFamily: fonts.chrome }]}>{phase}</Text>
      {children && <View style={styles.slot}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  emoji: { fontSize: 48 },
  title: { fontSize: 22 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6 },
  phase: { fontSize: 12 },
  slot: { marginTop: 18 },
});
