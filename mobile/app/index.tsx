import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';
import { useTheme } from '../src/theme/useTheme';
import LoginScreen from './login';

/** 인증 게이트 — 로딩/로그인/탭 셸 분기 */
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
  // typegen(.expo/types)이 다음 expo start에서 (tabs)를 반영하기 전까지 캐스트 유지
  return <Redirect href={'/(tabs)' as Href} />;
}
