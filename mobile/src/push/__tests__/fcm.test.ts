import messaging from '@react-native-firebase/messaging';
import { api } from '../../api/client';
import { registerPushDevice, unregisterPushDevice } from '../fcm';

jest.mock('../../api/client', () => ({
  api: { post: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) },
}));
jest.mock('../../pomodoro/notifications', () => ({
  requestNotificationPermission: jest.fn(async () => true),
}));

describe('푸시 토큰 라이프사이클', () => {
  it('등록: 권한 요청 → 토큰 발급 → 서버 upsert', async () => {
    await registerPushDevice();
    expect((messaging as any)._instance.getToken).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/me/devices', { token: 'test-fcm-token', platform: 'android' });
  });

  it('해제: 서버 삭제 — 실패해도 throw하지 않는다', async () => {
    (api.delete as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(unregisterPushDevice()).resolves.toBeUndefined();
  });
});
