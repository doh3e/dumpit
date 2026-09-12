import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { retroShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  appearance?: 'retro' | 'refined';
  variant?: 'primary' | 'ghost' | 'danger' | 'focus';
  size?: 'md' | 'sm';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 라벨 앞 아이콘 (코인 등) — 접근성 라벨은 label만 읽는다 */
  icon?: ReactNode;
  /** 화면 글자만으로 뜻이 서지 않을 때 (예: "확인"), 읽히는 라벨만 바꾼다 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** 기본 retro는 3px 눌림과 오프셋 섀도, refined는 평면 조작 표현을 사용한다. */
export function RetroButton({
  label, onPress, appearance = 'retro', variant = 'primary', size = 'md', disabled, busy, style, icon,
  accessibilityLabel, accessibilityHint,
}: Props) {
  const { colors, fonts } = useTheme();
  const refined = appearance === 'refined';
  const palette = refined
    ? {
        primary: { bg: colors.accentFill, fg: colors.onAccent, border: colors.accentFill },
        ghost: { bg: colors.card, fg: colors.fg, border: colors.sub },
        danger: { bg: colors.card, fg: colors.dangerText, border: colors.dangerText },
        focus: { bg: colors.accent2Fill, fg: colors.onAccent, border: colors.accent2Fill },
      }[variant]
    : {
        primary: { bg: colors.accentFill, fg: colors.onAccent, border: colors.edge },
        ghost: { bg: colors.card, fg: colors.fg, border: colors.edge },
        // 앰버 위 크림은 2.6:1 — 앰버 채움은 onWarn 글자 (웹 결정 C)
        danger: { bg: colors.warn, fg: colors.onWarn, border: colors.edge },
        focus: { bg: colors.accent2Fill, fg: colors.onAccent, border: colors.edge },
      }[variant];
  const blocked = disabled || busy;
  const labelFont = refined ? fonts.chrome : fonts.displayBold;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!blocked, busy: !!busy }}
      // retro sm은 시각 크기를 유지하면서 세로 터치 영역을 보완한다.
      hitSlop={!refined && size === 'sm' ? { top: 7, bottom: 7, left: 0, right: 0 } : undefined}
      style={({ pressed }) => [
        styles.base,
        refined && styles.refinedBase,
        size === 'sm' ? styles.sm : styles.md,
        refined && styles.refinedSize,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: blocked && !busy ? 0.45 : 1 },
        !refined && (pressed && !blocked
          ? { transform: [{ translateX: 3 }, { translateY: 3 }], boxShadow: `0px 0px 0px ${colors.shadowSm}` }
          : retroShadow(3, colors.shadowSm)),
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : icon ? (
        <View style={styles.iconRow}>
          {icon}
          <Text style={[size === 'sm' ? styles.smText : styles.mdText, { color: palette.fg, fontFamily: labelFont }]}>
            {label}
          </Text>
        </View>
      ) : (
        <Text style={[size === 'sm' ? styles.smText : styles.mdText, { color: palette.fg, fontFamily: labelFont }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  refinedBase: { borderWidth: 1 },
  refinedSize: { minHeight: 48, minWidth: 48 },
  md: { paddingHorizontal: 20, paddingVertical: 12, minHeight: 48 },
  sm: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 34 },
  mdText: { fontSize: 15 },
  smText: { fontSize: 12 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
