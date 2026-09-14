import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

type Props = {
  label: string;
  appearance?: 'retro' | 'refined';
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  /** 도트 아이콘 등 — emoji보다 우선 */
  icon?: ReactNode;
  disabled?: boolean;
  /** 화면 글자만으로 뜻이 서지 않을 때, 읽히는 라벨만 바꾼다 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  insetTarget?: boolean;
  style?: StyleProp<ViewStyle>;
  targetStyle?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
};

/** 선택형 칩 — 카테고리·마감모드·리스트 탭 공용. 기본 retro는 선택 시 틸 채움이다. */
export function Chip({
  label, appearance = 'retro', selected = false, onPress, emoji, icon, disabled,
  accessibilityLabel, accessibilityHint, insetTarget = false, style, targetStyle, surfaceStyle,
}: Props) {
  const { colors, fonts } = useTheme();
  const refined = appearance === 'refined';
  const selectedColors = refined
    ? { bg: colors.chip, border: colors.fg, fg: colors.fg }
    : { bg: colors.accent2Fill, border: colors.edge, fg: colors.onAccent };
  const idleColors = refined
    ? { bg: colors.card, border: colors.sub }
    : { bg: colors.chip, border: colors.line };
  const text = (
    <Text style={[styles.text, { color: selected ? selectedColors.fg : colors.fg, fontFamily: fonts.chrome }]}>
      {!icon && emoji ? `${emoji} ${label}` : label}
    </Text>
  );
  const visualStyle = (pressed: boolean) => [
    styles.chip,
    refined && (insetTarget ? styles.refinedVisual : styles.refinedSize),
    selected
      ? { backgroundColor: selectedColors.bg, borderColor: selectedColors.border }
      : { backgroundColor: idleColors.bg, borderColor: idleColors.border },
    refined && pressed && !disabled && !!onPress && {
      backgroundColor: selected ? colors.card : colors.chip,
      borderColor: colors.fg,
    },
    surfaceStyle ?? style,
    { opacity: disabled ? 0.45 : !refined && pressed ? 0.8 : 1 },
  ];
  const content = (
    <>
      {icon ? (
        <View style={styles.iconRow}>
          {icon}
          {text}
        </View>
      ) : (
        text
      )}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled: !!disabled }}
      hitSlop={refined ? undefined : 6}
      style={({ pressed }) => (insetTarget ? [styles.target, targetStyle] : visualStyle(pressed))}
    >
      {insetTarget ? ({ pressed }) => <View style={visualStyle(pressed)}>{content}</View> : content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
    minHeight: 34, alignItems: 'center', justifyContent: 'center',
  },
  refinedSize: { minHeight: 48, minWidth: 48, borderRadius: 8 },
  target: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  refinedVisual: { minHeight: 34, minWidth: 34, borderRadius: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontSize: 12 },
});
