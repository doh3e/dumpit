import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Action = { emoji: string; label: string; onPress: () => void };

type Props = {
  open: boolean;
  onClose: () => void;
  actions: Action[];
};

/** FAB 위로 펼쳐지는 두 갈래 스피드다이얼 — 딤 탭·뒤로가기로 닫힘 */
export function SpeedDial({ open, onClose, actions }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.edge, opacity: 0.45 }]}
          onPress={onClose}
          accessibilityLabel="닫기"
        />
      </Animated.View>
      <View style={[styles.stack, { bottom: insets.bottom + 108 }]} pointerEvents="box-none">
        {actions.map((a, i) => (
          <Animated.View
            key={a.label}
            entering={FadeInDown.springify().damping(16).stiffness(220).delay((actions.length - 1 - i) * 45)}
            exiting={FadeOutDown.duration(110).delay(i * 30)}
          >
            <Pressable
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: colors.card, borderColor: colors.edge },
                pressed
                  ? { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: `0px 0px 0px ${colors.shadowSm}` }
                  : retroShadow(3, colors.shadowSm),
              ]}
            >
              <Text style={styles.emoji}>{a.emoji}</Text>
              <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.displayBold }]}>{a.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', alignSelf: 'center', gap: 10, alignItems: 'center' },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 12, minWidth: 176, minHeight: 48,
  },
  emoji: { fontSize: 18 },
  label: { fontSize: 15 },
});
