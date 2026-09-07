import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { retroShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 히어로 카드는 5px 오프셋 섀도, 기본은 3px (웹 .card-retro 대응) */
  hero?: boolean;
  /** 카드 전체를 한 덩어리로 읽는다 — 안에 버튼이 있으면 그 버튼이 TalkBack 스톱에서 사라지니 쓰지 말 것 */
  accessible?: boolean;
  accessibilityLabel?: string;
};

export function RetroCard({ children, style, hero = false, accessible, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.edge },
        retroShadow(hero ? 5 : 3, hero ? colors.shadowHero : colors.shadowSm),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: 10, padding: 16 },
});
