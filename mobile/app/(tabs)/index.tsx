import { Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

/** 임시 홈 — Task 9에서 진짜 대시보드로 교체 */
export default function HomeScreen() {
  const { colors } = useTheme();
  const { me } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 8 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.fg }}>
        환영해요, {me?.name}!
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sub }}>
        🪙 {me?.coins} · 홈 대시보드가 곧 채워져요
      </Text>
    </View>
  );
}
