import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  disabled?: boolean;
};

/** 선택형 칩 — 카테고리·마감모드·리스트 탭 공용. 선택 시 틸(accent2) 채움 */
export function Chip({ label, selected = false, onPress, emoji, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: colors.accent2, borderColor: colors.edge }
          : { backgroundColor: colors.chip, borderColor: colors.line },
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.onAccent : colors.sub, fontFamily: fonts.chrome }]}>
        {emoji ? `${emoji} ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
    minHeight: 34, alignItems: 'center', justifyContent: 'center',
  },
  text: { fontSize: 12 },
});
