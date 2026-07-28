import messaging from '@react-native-firebase/messaging';
import notifee from 'react-native-notify-kit';
import { requestNotificationPermission } from '../pomodoro/notifications';
import { registerDevice, unregisterDevice } from '../api/devices';
import { ensurePushChannels, PUSH_CHANNELS } from './channels';
import { routeForLink } from './links';

/** 로그인 확립·앱 시작 시 호출 — 권한은 여기서 처음 요청될 수 있다(뽀모도로와 같은 권한) */
export async function registerPushDevice(): Promise<void> {
  try {
    await requestNotificationPermission();
    await ensurePushChannels();
    const token = await messaging().getToken();
    await registerDevice(token);
  } catch (e) {
    // 푸시 실패가 로그인 흐름을 막으면 안 된다
    console.warn('[push] 기기 등록 실패', e);
  }
}

export async function unregisterPushDevice(): Promise<void> {
  try {
    const token = await messaging().getToken();
    await unregisterDevice(token);
    await messaging().deleteToken();
  } catch (e) {
    console.warn('[push] 기기 해제 실패', e);
  }
}

type RouterLike = { push: (href: never) => void };

/** 포그라운드 표시 + 알림 탭 딥링크. 반환값은 정리 함수. 구 APK(firebase 미탑재)에선 no-op. */
export function initPushHandlers(router: RouterLike): () => void {
  try {
    return installHandlers(router);
  } catch (e) {
    console.warn('[push] FCM 미탑재 APK — 푸시 핸들러 생략', e);
    return () => {};
  }
}

function installHandlers(router: RouterLike): () => void {
  const unsubMessage = messaging().onMessage(async (msg) => {
    const n = msg.notification;
    if (!n) return;
    await notifee.displayNotification({
      title: n.title ?? 'Dumpit!',
      body: n.body ?? '',
      android: {
        channelId: (msg.data?.channelId as string) ?? PUSH_CHANNELS.deadline,
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      data: msg.data,
    });
  });

  const unsubToken = messaging().onTokenRefresh((token) => {
    registerDevice(token).catch((e) => console.warn('[push] 토큰 갱신 등록 실패', e));
  });

  const unsubOpened = messaging().onNotificationOpenedApp((msg) => {
    const route = routeForLink(msg.data?.link as string | undefined);
    if (route) router.push(route as never);
  });

  messaging().getInitialNotification().then((msg) => {
    const route = routeForLink(msg?.data?.link as string | undefined);
    if (route) router.push(route as never);
  });

  return () => { unsubMessage(); unsubToken(); unsubOpened(); };
}
