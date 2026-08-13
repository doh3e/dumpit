import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { retroShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 히어로 카드는 5px 오프셋 섀도, 기본은 3px (웹 .card-retro 대응) */
  hero?: boolean;
};

export function RetroCard({ children, style, hero = false }: Props) {
  const { colors } = useTheme();
  return (
    <View
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
