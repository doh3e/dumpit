import { api } from './client';
import type { OverdueTask, ProfileResponse, StatsResponse } from './types';

export async function fetchProfile(): Promise<ProfileResponse> {
  const res = await api.get('/me/profile');
  return res.data;
}

/** bio·nickname 부분 수정 (사진은 서버 미지원 — 웹 패리티) */
export async function patchProfile(patch: { bio?: string | null; nickname?: string }): Promise<ProfileResponse> {
  const res = await api.patch('/me/profile', patch);
  return res.data;
}

/** 탈퇴 — 서버가 비식별화·데이터 삭제·세션 무효화까지 수행 */
export async function deleteAccount(): Promise<void> {
  await api.delete('/me/account');
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await api.get('/me/stats');
  return res.data;
}

export async function fetchOverdueTasks(): Promise<OverdueTask[]> {
  const res = await api.get('/tasks/overdue');
  return res.data;
}
