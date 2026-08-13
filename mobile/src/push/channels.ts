import notifee, { AndroidImportance } from 'react-native-notify-kit';

/** 백엔드 PushSender와의 계약 — 채널 id 문자열을 바꾸면 서버도 함께 바꿔야 한다 */
export const PUSH_CHANNELS = {
  deadline: 'push-deadline',
  briefing: 'push-briefing',
  notice: 'push-notice',
} as const;

/** 채널 설정은 최초 생성 시 동결 — 소리·진동은 처음부터 명시해야 한다 */
export async function ensurePushChannels(): Promise<void> {
  await notifee.createChannel({
    id: PUSH_CHANNELS.deadline, name: '마감 임박 알림',
    importance: AndroidImportance.HIGH, sound: 'default', vibration: true,
  });
  await notifee.createChannel({
    id: PUSH_CHANNELS.briefing, name: '아침 브리핑', importance: AndroidImportance.DEFAULT,
  });
  await notifee.createChannel({
    id: PUSH_CHANNELS.notice, name: '공지사항', importance: AndroidImportance.DEFAULT,
  });
}
