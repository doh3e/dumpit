import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

type Tone = 'accent' | 'accent2' | 'warn' | 'starlight' | 'sub';

const FILL: Record<Tone, boolean> = { accent: true, accent2: true, warn: true, starlight: true, sub: false };

type Props = { text: string; tone?: Tone; icon?: ReactNode };

/** 소형 상태 라벨 — "마감 지남"·"진행 중"·"↳ 서브" 등. 둥근모 크롬층 */
export function RetroBadge({ text, tone = 'sub', icon }: Props) {
  const { colors, fonts } = useTheme();
  const filled = FILL[tone];
  const bg = tone === 'accent' ? colors.accentFill : tone === 'accent2' ? colors.accent2Fill : tone === 'warn' ? colors.warn : colors.starlight;
  const textColor = !filled ? colors.sub : tone === 'accent' || tone === 'accent2' ? colors.onAccent : colors.onWarn;
  return (
    <View
      style={[
        styles.badge,
        icon != null && styles.iconRow,
        filled ? { backgroundColor: bg, borderColor: colors.edge } : { backgroundColor: 'transparent', borderColor: colors.sub },
      ]}
    >
      {icon}
      <Text style={[styles.text, { color: textColor, fontFamily: fonts.chrome }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  text: { fontSize: 10 },
});
