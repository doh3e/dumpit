import messaging from '@react-native-firebase/messaging';
import notifee from 'react-native-notify-kit';
import { api } from '../../api/client';
import {
  initPushHandlers,
  registerPushDevice,
  resetPushStateForTest,
  unregisterPushDevice,
} from '../fcm';

const mockLoadMessaging = jest.fn();

jest.mock('../../api/client', () => ({
  api: { post: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) },
}));
jest.mock('../../pomodoro/notifications', () => ({
  requestNotificationPermission: jest.fn(async () => true),
}));
jest.mock('../messagingLoader', () => ({
  loadMessaging: (...args: unknown[]) => mockLoadMessaging(...args),
}));

describe('푸시 토큰 라이프사이클', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPushStateForTest();
    mockLoadMessaging.mockResolvedValue((messaging as any)());
  });

  it('등록: 권한 요청 → 토큰 발급 → 서버 upsert', async () => {
    await registerPushDevice();
    expect((messaging as any)._instance.getToken).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/me/devices', { token: 'test-fcm-token', platform: 'android' });
  });

  it('해제: 서버 삭제 — 실패해도 throw하지 않는다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (api.delete as jest.Mock).mockRejectedValueOnce(new Error('network'));
    try {
      await expect(unregisterPushDevice()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[push] 기기 해제 실패', expect.any(Error));
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['등록', registerPushDevice, '[push] 기기 등록 실패'],
    ['해제', unregisterPushDevice, '[push] 기기 해제 실패'],
  ])('네이티브 로더가 거부되어도 %s 실패를 외부로 전파하지 않는다', async (_name, operation, message) => {
    const nativeError = new Error('native module unavailable');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockLoadMessaging.mockRejectedValueOnce(nativeError);

    try {
      await expect(operation()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(message, nativeError);
    } finally {
      warn.mockRestore();
    }
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function messagingHarness(overrides: Record<string, jest.Mock> = {}) {
  const handlers: Record<string, (value: any) => any> = {};
  const unsubscribeMessage = jest.fn();
  const unsubscribeToken = jest.fn();
  const unsubscribeOpened = jest.fn();
  const instance = {
    onMessage: jest.fn((handler) => { handlers.message = handler; return unsubscribeMessage; }),
    onTokenRefresh: jest.fn((handler) => { handlers.token = handler; return unsubscribeToken; }),
    onNotificationOpenedApp: jest.fn((handler) => { handlers.opened = handler; return unsubscribeOpened; }),
    getInitialNotification: jest.fn(async () => null),
    ...overrides,
  };
  return { instance, handlers, unsubscribes: [unsubscribeMessage, unsubscribeToken, unsubscribeOpened] };
}

async function flushAsyncHandlers() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('푸시 핸들러 수명', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMessaging.mockResolvedValue((messaging as any)());
  });

  it('네이티브 로더가 거부되어도 동기 cleanup을 반환하고 listener 없이 제한된 경고만 남긴다', async () => {
    const nativeError = new Error('native module unavailable');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const nativeMessaging = (messaging as any)._instance;
    mockLoadMessaging.mockRejectedValueOnce(nativeError);

    try {
      const cleanup = initPushHandlers({ push: jest.fn() });
      expect(typeof cleanup).toBe('function');
      await flushAsyncHandlers();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('[push] FCM 미탑재 APK — 푸시 핸들러 생략', nativeError);
      expect(nativeMessaging.onMessage).not.toHaveBeenCalled();
      expect(nativeMessaging.onTokenRefresh).not.toHaveBeenCalled();
      expect(nativeMessaging.onNotificationOpenedApp).not.toHaveBeenCalled();
      expect(() => {
        cleanup();
        cleanup();
      }).not.toThrow();
    } finally {
      warn.mockRestore();
    }
  });

  it('모듈 로드 전에 해제하면 listener를 늦게 설치하지 않는다', async () => {
    const loading = deferred<any>();
    const { instance } = messagingHarness();

    mockLoadMessaging.mockReturnValueOnce(loading.promise);
    const cleanup = initPushHandlers({ push: jest.fn() });
    cleanup();
    loading.resolve(instance);
    await flushAsyncHandlers();

    expect(instance.onMessage).not.toHaveBeenCalled();
    expect(instance.onTokenRefresh).not.toHaveBeenCalled();
    expect(instance.onNotificationOpenedApp).not.toHaveBeenCalled();
  });

  it('부분 listener 설치 중 실패하면 이미 설치한 listener를 해제한다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { instance, unsubscribes } = messagingHarness({
      onTokenRefresh: jest.fn(() => { throw new Error('listener failed'); }),
    });

    try {
      mockLoadMessaging.mockResolvedValueOnce(instance);
      initPushHandlers({ push: jest.fn() });
      await flushAsyncHandlers();

      expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
      expect(unsubscribes[1]).not.toHaveBeenCalled();
      expect(unsubscribes[2]).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith('[push] FCM 미탑재 APK — 푸시 핸들러 생략', expect.any(Error));
    } finally {
      warn.mockRestore();
    }
  });

  it('정상 listener를 처리하고 해제 후 늦은 초기 알림은 탐색하지 않는다', async () => {
    const initial = deferred<any>();
    const { instance, handlers, unsubscribes } = messagingHarness({
      getInitialNotification: jest.fn(() => initial.promise),
    });
    const router = { push: jest.fn() };

    mockLoadMessaging.mockResolvedValueOnce(instance);
    const cleanup = initPushHandlers(router);
    await flushAsyncHandlers();
    await handlers.message({
      notification: { title: '제목', body: '본문' },
      data: { channelId: 'push-notice' },
    });
    handlers.token('new-token');
    handlers.opened({ data: { link: 'notices' } });
    await flushAsyncHandlers();

    expect(notifee.displayNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '제목',
      body: '본문',
      android: expect.objectContaining({ channelId: 'push-notice' }),
    }));
    expect(api.post).toHaveBeenCalledWith('/me/devices', { token: 'new-token', platform: 'android' });
    expect(router.push).toHaveBeenCalledWith('/notices');

    cleanup();
    unsubscribes.forEach((unsubscribe) => expect(unsubscribe).toHaveBeenCalledTimes(1));
    await handlers.message({ notification: { title: '늦은 메시지' } });
    handlers.token('late-token');
    handlers.opened({ data: { link: 'home' } });
    initial.resolve({ data: { link: 'home' } });
    await flushAsyncHandlers();
    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalledWith('/me/devices', { token: 'late-token', platform: 'android' });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('활성 상태의 늦은 초기 알림은 올바른 경로를 정확히 한 번 탐색하고 cleanup한다', async () => {
    const initial = deferred<any>();
    const { instance, unsubscribes } = messagingHarness({
      getInitialNotification: jest.fn(() => initial.promise),
    });
    const router = { push: jest.fn() };
    mockLoadMessaging.mockResolvedValueOnce(instance);

    const cleanup = initPushHandlers(router);
    await flushAsyncHandlers();
    initial.resolve({ data: { link: 'notices' } });
    await flushAsyncHandlers();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/notices');
    cleanup();
    unsubscribes.forEach((unsubscribe) => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });

  it('초기 알림 조회만 실패하면 listener를 유지하고 제한된 진단을 남긴다', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { instance, unsubscribes } = messagingHarness({
      getInitialNotification: jest.fn(async () => { throw new Error('initial failed'); }),
    });
    mockLoadMessaging.mockResolvedValueOnce(instance);

    try {
      const cleanup = initPushHandlers({ push: jest.fn() });
      await flushAsyncHandlers();

      expect(warn).toHaveBeenCalledWith('[push] 초기 알림 확인 실패', expect.any(Error));
      unsubscribes.forEach((unsubscribe) => expect(unsubscribe).not.toHaveBeenCalled());
      cleanup();
      unsubscribes.forEach((unsubscribe) => expect(unsubscribe).toHaveBeenCalledTimes(1));
    } finally {
      warn.mockRestore();
    }
  });
});
