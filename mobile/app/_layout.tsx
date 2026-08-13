import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { ToastProvider } from '../src/components/retro/ToastProvider';
import { AppBackground } from '../src/components/shell/AppBackground';
import { initPushHandlers } from '../src/push/fcm';
import { queryClient } from '../src/query/queryClient';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useTheme } from '../src/theme/useTheme';
import { mirrorConfig } from '../src/widget/mirror';
import { installTodayMirror } from '../src/widget/todayMirror';

/** 수동 다크 모드에서도 상태바 아이콘이 배경과 맞게 — Provider 안쪽에서 scheme 구독 */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

/**
 * 세션이 끊기면 쌓여 있던 화면을 걷어내고 인증 게이트로 한 번만 보낸다.
 * 각 화면이 렌더 중에 Redirect를 반환하면 서로 튕기며 무한 루프가 되므로 이동은 여기서만 한다.
 */
function AuthRouteGate() {
  const { me, loading } = useAuth();
  useEffect(() => {
    if (loading || me) return;
    try {
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // 스택이 이미 루트면 무시
    }
    router.replace('/');
  }, [me, loading]);
  return null;
}

/** 포그라운드 표시·알림 탭 딥링크 핸들러를 앱 전체에서 1회 설치 */
function PushHandlerGate() {
  const pushRouter = useRouter();
  useEffect(() => initPushHandlers(pushRouter), [pushRouter]);
  return null;
}

/** 위젯 미러 — 설정값 1회 전달 + planning 캐시 갱신 구독 설치 */
function WidgetMirrorGate() {
  useEffect(() => {
    void mirrorConfig();
    return installTodayMirror(queryClient);
  }, []);
  return null;
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
                <AuthRouteGate />
                <PushHandlerGate />
                <WidgetMirrorGate />
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
