import type { ExpoConfig } from 'expo/config';

// app.json을 1:1 이식 + googleServicesFile(EAS 파일 env 폴백)과 firebase 플러그인만 추가
const config: ExpoConfig = {
  name: '덤핏',
  slug: 'dumpit-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'dumpit',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    package: 'kr.dumpit.mobile',
    adaptiveIcon: {
      backgroundColor: '#F7EFDF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // 로그인 상태를 지탱하는 세션 쿠키 DB(app_webview)와 AsyncStorage가 구글 백업·기기 이전으로
    // 빠져나가지 않게 한다. 복원 경로가 사라지므로 기기 이전 시 재로그인이 정상 동작이다.
    allowBackup: false,
    // prebuild 템플릿·RN debug 오버레이·notify-kit이 넣는 권한들 — 릴리스에서 쓰는 코드가 없다.
    // (debug 소스셋 선언은 우선순위가 높아 유지되므로 dev-client 오버레이는 그대로 동작)
    // ACCESS_NOTIFICATION_POLICY는 방해금지(DND) 정책을 앱이 직접 바꿀 때만 필요하다.
    // 활동시간 밖 알림 억제는 서버가 판단하므로 이 권한이 필요한 경로가 없다.
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_NOTIFICATION_POLICY',
    ],
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7EFDF',
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        dark: {
          backgroundColor: '#1F1B2E',
        },
      },
    ],
    '@react-native-google-signin/google-signin',
    '@react-native-community/datetimepicker',
    'react-native-notify-kit',
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    './plugins/withMavenContentFilter',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '2b0d2659-007b-4020-8f5c-9cb53e887d85',
    },
  },
  owner: 'jieundev',
};

export default config;
