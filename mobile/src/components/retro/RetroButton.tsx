import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'focus';
  size?: 'md' | 'sm';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 웹 .btn-retro 이식 — 누르면 3px 밀리며 오프셋 섀도가 접힌다 (login.tsx 패턴) */
export function RetroButton({ label, onPress, variant = 'primary', size = 'md', disabled, busy, style }: Props) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    ghost: { bg: colors.card, fg: colors.fg },
    danger: { bg: colors.warn, fg: colors.onAccent },
    focus: { bg: colors.accent2, fg: colors.onAccent },   // 진행 중 상태 표시용 (틸)
  }[variant];
  const blocked = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!blocked, busy: !!busy }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg, borderColor: colors.edge, opacity: blocked && !busy ? 0.45 : 1 },
        pressed && !blocked
          ? { transform: [{ translateX: 3 }, { translateY: 3 }], boxShadow: `0px 0px 0px ${colors.shadowSm}` }
          : retroShadow(3, colors.shadowSm),
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[size === 'sm' ? styles.smText : styles.mdText, { color: palette.fg, fontFamily: fonts.displayBold }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  md: { paddingHorizontal: 20, paddingVertical: 12, minHeight: 48 },
  sm: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 34 },
  mdText: { fontSize: 15 },
  smText: { fontSize: 12 },
});
