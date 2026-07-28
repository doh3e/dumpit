import { widgetNative } from './native';
import { API_BASE_URL } from '../api/client';
import { deriveState, phasesFrom, type Session } from '../pomodoro/engine';
import type { TaskResponse } from '../api/types';

const PHASE_HORIZON = 12; // 알림 플랜 ROLLING_PHASES(6)보다 넉넉히 — 위젯은 조회만 하므로 저렴

export async function mirrorConfig(): Promise<void> {
  await widgetNative?.mirrorConfig(JSON.stringify({ apiBaseUrl: API_BASE_URL }));
}

/** 순수 — 렌더 밖(스토어 훅·구독 콜백)에서 now를 주입해 호출한다 */
export function buildPomodoroMirror(session: Session | null, now: number): string | null {
  if (!session) return null;
  const d = deriveState(session, now);
  return JSON.stringify({
    taskTitle: session.taskTitle,
    pausedAt: session.pausedAt,
    remainingSecAtPause: session.pausedAt != null ? d.remainingSec : null,
    done: d.phase === 'DONE',
    phases: phasesFrom(session, now, PHASE_HORIZON),
  });
}

export async function mirrorPomodoro(session: Session | null): Promise<void> {
  await widgetNative?.mirrorPomodoro(buildPomodoroMirror(session, Date.now()));
}

/** 표시용 필드만 추려 담는다 — 위젯 카드는 태스크 전체 DTO를 알 필요 없다 */
export function buildTodayMirror(tasks: TaskResponse[], now: number): string {
  return JSON.stringify({
    updatedAt: now,
    loggedIn: true,
    tasks: tasks.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      deadline: t.deadline ? t.deadline.slice(11, 16) : null,
      status: t.status,
    })),
  });
}

export async function mirrorTodayTasks(tasks: TaskResponse[]): Promise<void> {
  await widgetNative?.mirrorTodayTasks(buildTodayMirror(tasks, Date.now()));
}
