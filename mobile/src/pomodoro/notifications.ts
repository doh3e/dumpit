import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  TriggerType,
} from 'react-native-notify-kit';
import type { PlannedNotification } from './notificationPlan';

/** notify-kit 래퍼 — 알림 "무엇을/언제"는 notificationPlan 순수 함수가 결정하고 여기는 적용만 한다 */

const CHANNELS = [
  { id: 'pomodoro-ongoing', name: '뽀모도로 진행 상황', importance: AndroidImportance.LOW },
  { id: 'pomodoro-alert', name: '뽀모도로 전환 알림', importance: AndroidImportance.HIGH },
] as const;

export async function ensureChannels(): Promise<void> {
  for (const ch of CHANNELS) {
    await notifee.createChannel({ id: ch.id, name: ch.name, importance: ch.importance });
  }
}

function toContent(n: PlannedNotification) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    android: {
      channelId: n.channel,
      ongoing: n.ongoing,
      onlyAlertOnce: true,
      pressAction: { id: 'default' as const, launchActivity: 'default' as const },
      showChronometer: n.countdownTo != null,
      chronometerDirection: 'down' as const,
      showTimestamp: n.countdownTo != null,
      ...(n.countdownTo != null ? { timestamp: n.countdownTo } : {}),
    },
  };
}

/** 기존 뽀모도로 알림을 전부 걷어내고 새 계획을 적용한다 */
export async function applyPlan(plan: PlannedNotification[]): Promise<void> {
  await cancelAll();
  for (const n of plan) {
    if (n.at == null) {
      await notifee.displayNotification(toContent(n));
    } else {
      await notifee.createTriggerNotification(toContent(n), {
        type: TriggerType.TIMESTAMP,
        timestamp: n.at,
        alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
      });
    }
  }
}

export async function cancelAll(): Promise<void> {
  const triggerIds = await notifee.getTriggerNotificationIds();
  for (const id of triggerIds.filter((v) => v.startsWith('pomodoro'))) {
    await notifee.cancelNotification(id);
  }
  await notifee.cancelNotification('pomodoro-live');
}

/** Android 13+ 알림 권한 — 거부여도 타이머는 동작(알림만 침묵) */
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Android 12+ 정확 알람 허용 여부 — 미허용이면 트리거가 inexact로 지연될 수 있다 */
export async function checkExactAlarm(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm !== AndroidNotificationSetting.DISABLED;
}

export async function openAlarmSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}
