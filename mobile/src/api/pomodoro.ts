import { api } from './client';
import type { PomodoroSettleResponse } from './types';

export type PomodoroPlanBody = {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  setsTarget: number;
};

/** 계획 세션 시작 — 재호출은 미정산 세트를 리셋하므로 반드시 settle 후에만 */
export async function startPomodoroPlan(plan: PomodoroPlanBody): Promise<void> {
  await api.post('/pomodoro/start', plan);
}

/** 완료 집중 세트 일괄 정산(서버 델타 지급 — 중복 호출 안전). finished=true면 세션 소거 */
export async function settlePomodoro(claimedSessions: number, finished: boolean): Promise<PomodoroSettleResponse> {
  const res = await api.post('/pomodoro/settle', { claimedSessions, finished });
  return res.data;
}
