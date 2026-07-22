import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';
import LoginScreen from './login';

export default function Index() {
  const { colors } = useTheme();
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!me) return <LoginScreen />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 8 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.fg }}>
        환영해요, {me.name}!
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sub }}>
        🪙 {me.coins} · Phase 1에서 진짜 홈이 생겨요
      </Text>
    </View>
  );
}
