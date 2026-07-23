import { settlePomodoro, startPomodoroPlan } from '../api/pomodoro';
import { patchTask } from '../api/tasks';
import type { TaskStatus } from '../api/types';
import {
  clampSettings, deriveState, pause, resume,
  type PomodoroSettings, type Session,
} from './engine';
import { buildNotificationPlan } from './notificationPlan';
import * as notifications from './notifications';
import * as persistence from './persistence';

/**
 * 뽀모도로 세션 컨트롤러 — 모듈 싱글턴 pub/sub (웹 pomodoroFocus 패턴).
 * 시간·전이는 engine이, 알림 내용은 notificationPlan이 결정하고 여기는 순서만 오케스트레이션한다.
 */
export type SettleResult = { coins: number; settledSessions: number };

let session: Session | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getSession(): Session | null {
  return session;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function setSession(next: Session | null): Promise<void> {
  session = next;
  if (next) await persistence.saveSession(next);
  else await persistence.clearSession();
  emit();
}

/** 앱 시작 1회 — 저장된 세션 복원 후 밀린 정산까지 */
export async function initPomodoro(): Promise<SettleResult | null> {
  session = await persistence.loadSession();
  emit();
  return reconcile();
}

export async function startSession(
  settings: PomodoroSettings,
  task: { taskId: string; title: string; status: TaskStatus } | null,
): Promise<void> {
  const s = clampSettings(settings);
  await notifications.ensureChannels();
  await startPomodoroPlan({
    focusMinutes: s.focusMin,
    breakMinutes: s.breakMin,
    longBreakMinutes: s.longBreakMin,
    longBreakEvery: s.longBreakEvery,
    setsTarget: s.setsTarget,
  });
  if (task && task.status === 'TODO') {
    // 집중 시작 = "손댄 일" 기록 (수동 시작 없음 정책) — 실패해도 타이머는 진행
    try { await patchTask(task.taskId, { status: 'IN_PROGRESS' }); } catch { /* 무시 */ }
  }
  const next: Session = {
    settings: s,
    anchor: Date.now(),
    pausedAt: null,
    taskId: task?.taskId ?? null,
    taskTitle: task?.title ?? null,
    lastSettled: 0,
  };
  await setSession(next);
  await notifications.applyPlan(buildNotificationPlan(next, Date.now()));
}

export async function pauseSession(): Promise<void> {
  if (!session) return;
  const next = pause(session, Date.now());
  await setSession(next);
  await notifications.applyPlan(buildNotificationPlan(next, Date.now()));
}

export async function resumeSession(): Promise<void> {
  if (!session) return;
  const next = resume(session, Date.now());
  await setSession(next);
  await notifications.applyPlan(buildNotificationPlan(next, Date.now()));
}

/** 리셋 — 지금까지 완료분은 정산(finished)하고 세션·알림을 걷는다 */
export async function resetSession(): Promise<void> {
  if (!session) return;
  const derived = deriveState(session, Date.now());
  try {
    await settlePomodoro(derived.completedFocusCount, true);
  } catch { /* 오프라인 — 서버 세션은 다음 start(settle 선행 규약)가 정리 */ }
  await notifications.cancelAll();
  await setSession(null);
}

/**
 * 복귀 정산 — 백그라운드에서 지나간 세트를 서버에 델타 청구하고 알림 창을 재계획한다.
 * settle 실패는 조용히 보류(델타 방식이라 다음 호출이 안전하게 재시도).
 */
export async function reconcile(): Promise<SettleResult | null> {
  if (!session) return null;
  const now = Date.now();
  const derived = deriveState(session, now);

  let result: SettleResult | null = null;
  if (derived.completedFocusCount > session.lastSettled) {
    try {
      const res = await settlePomodoro(derived.completedFocusCount, derived.phase === 'DONE');
      result = { coins: res.coins, settledSessions: res.settledSessions };
      session = { ...session, lastSettled: derived.completedFocusCount };
      await persistence.saveSession(session);
    } catch { /* 다음 기회에 재시도 */ }
  }

  if (derived.phase === 'DONE') {
    await notifications.cancelAll();
    const settled = session.lastSettled >= derived.completedFocusCount;
    if (settled) {
      await setSession(null);
    } else {
      emit(); // 정산 실패 — 세션을 남겨 다음 복귀 때 재청구
    }
  } else {
    await notifications.applyPlan(buildNotificationPlan(session, now));
    emit();
  }
  return result;
}

/** 테스트 전용 — 모듈 상태 초기화 */
export function resetStoreForTest(): void {
  session = null;
  listeners.clear();
}
