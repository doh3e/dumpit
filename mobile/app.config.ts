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
        imageWidth: 76,
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
