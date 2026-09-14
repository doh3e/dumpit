import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/** 네이티브 모듈이 없는 Preview가 fcm.ts를 import할 때는 RNFB를 평가하지 않는다. */
export async function loadMessaging(): Promise<FirebaseMessagingTypes.Module> {
  const { default: createMessaging } = await import('@react-native-firebase/messaging');
  return createMessaging();
}
