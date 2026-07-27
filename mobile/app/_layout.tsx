import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/retro/ToastProvider';
import { AppBackground } from '../src/components/shell/AppBackground';
import { queryClient } from '../src/query/queryClient';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useTheme } from '../src/theme/useTheme';

/** 수동 다크 모드에서도 상태바 아이콘이 배경과 맞게 — Provider 안쪽에서 scheme 구독 */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Galmuri11': require('../assets/fonts/Galmuri11.ttf'),
    'Galmuri11-Bold': require('../assets/fonts/Galmuri11-Bold.ttf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
    'DungGeunMo': require('../assets/fonts/DungGeunMo.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* ThemeProvider는 me.equipments(장착 스킨)를 읽으므로 AuthProvider 안쪽이어야 한다 */}
        <AuthProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <ToastProvider>
                <ThemedStatusBar />
                <View style={{ flex: 1 }}>
                  <AppBackground />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      // 화면이 불투명하면 전역 배경 무늬가 가려진다
                      contentStyle: { backgroundColor: 'transparent' },
                    }}
                  />
                </View>
              </ToastProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
