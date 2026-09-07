import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { retroShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Props = {
  label: string;
  onPress: () => void;
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

/** 웹 .btn-retro 이식 — 누르면 3px 밀리며 오프셋 섀도가 접힌다 (login.tsx 패턴) */
export function RetroButton({
  label, onPress, variant = 'primary', size = 'md', disabled, busy, style, icon,
  accessibilityLabel, accessibilityHint,
}: Props) {
  const { colors, fonts } = useTheme();
  const palette = {
    primary: { bg: colors.accentFill, fg: colors.onAccent },
    ghost: { bg: colors.card, fg: colors.fg },
    // 앰버 위 크림은 2.6:1 — 앰버 채움은 onWarn 글자 (웹 결정 C)
    danger: { bg: colors.warn, fg: colors.onWarn },
    focus: { bg: colors.accent2Fill, fg: colors.onAccent },   // 진행 중 상태 표시용 (틸)
  }[variant];
  const blocked = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!blocked, busy: !!busy }}
      // sm은 34dp — 위아래 7dp씩 넓혀 48dp 타깃을 맞춘다 (모양은 그대로)
      hitSlop={size === 'sm' ? { top: 7, bottom: 7, left: 0, right: 0 } : undefined}
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
      ) : icon ? (
        <View style={styles.iconRow}>
          {icon}
          <Text style={[size === 'sm' ? styles.smText : styles.mdText, { color: palette.fg, fontFamily: fonts.displayBold }]}>
            {label}
          </Text>
        </View>
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
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
