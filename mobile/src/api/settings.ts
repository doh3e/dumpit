import { api } from './client';
import type { UserSettings } from './types';

export async function fetchSettings(): Promise<UserSettings> {
  const res = await api.get('/me/settings');
  return res.data;
}

/** null 필드는 미변경 — 활동시간만 보낸다 (알림 설정은 Phase 4에서) */
export async function patchSettings(
  patch: Partial<Pick<UserSettings, 'routineStartHour' | 'routineEndHour'>>,
): Promise<UserSettings> {
  const res = await api.patch('/me/settings', patch);
  return res.data;
}
