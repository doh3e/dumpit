/** react-native-notify-kit jest 모의 — 알림 로직 검증은 notificationPlan 순수 함수에서 하고, 여기선 호출만 스텁 */
export const AndroidImportance = { LOW: 2, HIGH: 4 } as const;
export const TriggerType = { TIMESTAMP: 0 } as const;
export const AuthorizationStatus = { DENIED: 0, AUTHORIZED: 1 } as const;
export const AlarmType = { SET: 0, SET_AND_ALLOW_WHILE_IDLE: 1, SET_EXACT: 2, SET_EXACT_AND_ALLOW_WHILE_IDLE: 3 } as const;
export const AndroidNotificationSetting = { NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1 } as const;

const notifee = {
  createChannel: jest.fn(async () => 'channel-id'),
  displayNotification: jest.fn(async () => 'notification-id'),
  createTriggerNotification: jest.fn(async () => 'trigger-id'),
  cancelNotification: jest.fn(async () => undefined),
  cancelAllNotifications: jest.fn(async () => undefined),
  getTriggerNotificationIds: jest.fn(async () => [] as string[]),
  requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
  getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1, android: { alarm: 1 } })),
  openAlarmPermissionSettings: jest.fn(async () => undefined),
};

export default notifee;
