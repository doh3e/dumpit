import { Pressable, StyleSheet, Text } from 'react-native';
import type { AiUsage } from '../../api/types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { PixelIcon } from '../common/PixelIcon';
import { useToast } from '../retro/ToastProvider';

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
      {/* 웹 Header의 token 도트와 동일 기호 — AI 포인트 화폐 표기 통일 (도트 통일 Phase A) */}
      <PixelIcon name="token" size={12} />
      <Text style={[styles.text, { color: tone, fontFamily: fonts.chrome }]}>{usage.remaining}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', gap: 4,
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5, minHeight: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { fontSize: 12 },
});
