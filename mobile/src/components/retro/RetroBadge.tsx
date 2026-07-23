import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Tone = 'accent' | 'accent2' | 'warn' | 'starlight' | 'sub';

type Props = { text: string; tone?: Tone };

/** 소형 상태 라벨 — "마감 지남"·"진행 중"·"↳ 서브" 등. 둥근모 크롬층 */
export function RetroBadge({ text, tone = 'sub' }: Props) {
  const { colors } = useTheme();
  const filled = tone === 'accent' || tone === 'accent2';
  const color = colors[tone];
  return (
    <View
      style={[
        styles.badge,
        filled
          ? { backgroundColor: color, borderColor: colors.edge }
          : { backgroundColor: 'transparent', borderColor: color },
      ]}
    >
      <Text style={[styles.text, { color: filled ? colors.onAccent : color, fontFamily: fonts.chrome }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10 },
});
