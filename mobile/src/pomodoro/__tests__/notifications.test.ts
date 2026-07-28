import notifee from '../../test/mocks/notifyKit';
import { cancelAll } from '../notifications';
import { ensurePushChannels } from '../../push/channels';
import { AndroidImportance } from '../../test/mocks/notifyKit';

jest.mock('../../test/mocks/notifyKit');

describe('Notification Selective Cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelAll()', () => {
    it('뽀모도로 접두사만 선별 취소 — 푸시 알림은 남긴다', async () => {
      // 트리거 알림: pomodoro-* + 푸시
      const triggerIds = ['pomodoro-alert-FOCUS-0', 'push-deadline-x', 'pomodoro-live-FOCUS-1'];
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValueOnce(triggerIds);

      // 표시 중인 알림: pomodoro-* + FCM
      const displayed = [
        { notification: { id: 'pomodoro-live-FOCUS-0' } },
        { notification: { id: 'fcm-123' } },
      ];
      (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce(displayed);

      await cancelAll();

      // cancelNotification 호출 4회 확인: pomodoro- 3개만
      const cancelCalls = (notifee.cancelNotification as jest.Mock).mock.calls.flat();
      expect(cancelCalls).toHaveLength(3);
      expect(cancelCalls).toEqual(
        expect.arrayContaining([
          'pomodoro-alert-FOCUS-0',
          'pomodoro-live-FOCUS-1',
          'pomodoro-live-FOCUS-0',
        ]),
      );
      // push-deadline-x, fcm-123는 취소되지 않았음을 확인
      expect(cancelCalls).not.toContain('push-deadline-x');
      expect(cancelCalls).not.toContain('fcm-123');
    });

    it('pomodoro- 접두사가 없으면 취소하지 않는다', async () => {
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValueOnce([
        'push-deadline-x',
        'push-briefing-y',
      ]);
      (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([
        { notification: { id: 'fcm-123' } },
        { notification: { id: 'fcm-456' } },
      ]);

      await cancelAll();

      expect(notifee.cancelNotification).not.toHaveBeenCalled();
    });

    it('표시 알림 중 id가 없는 경우 안전하게 처리한다', async () => {
      (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValueOnce(['pomodoro-alert-1']);
      (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([
        { notification: { id: 'pomodoro-live-1' } },
        { notification: { id: undefined } }, // id 없는 경우
      ]);

      await cancelAll();

      const cancelCalls = (notifee.cancelNotification as jest.Mock).mock.calls.flat();
      expect(cancelCalls).toHaveLength(2);
      expect(cancelCalls).toContain('pomodoro-alert-1');
      expect(cancelCalls).toContain('pomodoro-live-1');
    });
  });
});

describe('Push Channels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensurePushChannels()', () => {
    it('3개 채널을 정확한 설정으로 생성한다', async () => {
      await ensurePushChannels();

      expect(notifee.createChannel).toHaveBeenCalledTimes(3);

      const calls = (notifee.createChannel as jest.Mock).mock.calls;

      // push-deadline: HIGH + sound + vibration
      expect(calls[0][0]).toEqual({
        id: 'push-deadline',
        name: '마감 임박 알림',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // push-briefing: DEFAULT
      expect(calls[1][0]).toEqual({
        id: 'push-briefing',
        name: '아침 브리핑',
        importance: AndroidImportance.DEFAULT,
      });

      // push-notice: DEFAULT
      expect(calls[2][0]).toEqual({
        id: 'push-notice',
        name: '공지사항',
        importance: AndroidImportance.DEFAULT,
      });
    });

    it('백엔드 계약 채널 id를 정확히 사용한다', async () => {
      await ensurePushChannels();

      const calls = (notifee.createChannel as jest.Mock).mock.calls;
      const ids = calls.map((call) => call[0].id);

      expect(ids).toEqual(['push-deadline', 'push-briefing', 'push-notice']);
    });
  });
});
