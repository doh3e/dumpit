import { api } from './client';
import type { UserSettings } from './types';

export async function fetchSettings(): Promise<UserSettings> {
  const res = await api.get('/me/settings');
  return res.data;
}

/** null 필드는 미변경 */
export type SettingsPatch = Partial<
  Pick<UserSettings, 'routineStartHour' | 'routineEndHour'
    | 'notificationsEnabled' | 'notificationThresholds' | 'briefingEnabled'>
>;

export async function patchSettings(patch: SettingsPatch): Promise<UserSettings> {
  const res = await api.patch('/me/settings', patch);
  return res.data;
}
