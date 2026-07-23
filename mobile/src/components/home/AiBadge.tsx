import { Pressable, StyleSheet, Text } from 'react-native';
import type { AiUsage } from '../../api/types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { useToast } from '../retro/ToastProvider';

/** AI 잔여 점수 배지 — 잔여량에 따라 톤 변화, 탭하면 사용량 안내 */
export function AiBadge({ usage }: { usage: AiUsage | undefined }) {
  const { colors } = useTheme();
  const toast = useToast();
  if (!usage) return null;

  const tone = usage.remaining >= 50 ? colors.accent2 : usage.remaining >= 10 ? colors.warn : colors.accent;

  return (
    <Pressable
      onPress={() => toast.show(`오늘 AI ${usage.used}/${usage.limit}점 사용 · 자정에 초기화돼요`)}
      accessibilityRole="button"
      accessibilityLabel={`AI 잔여 ${usage.remaining}점`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.badge,
        { borderColor: tone, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: tone, fontFamily: fonts.chrome }]}>✨ {usage.remaining}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5, minHeight: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { fontSize: 12 },
});
