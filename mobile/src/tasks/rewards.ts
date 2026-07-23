import type { TaskResponse } from '../api/types';
import { parseDate } from './dates';

/** 완료 코인 미리보기 — 실지급은 서버 coinsGranted 우선 (웹 taskRewards.js 이식) */
export function calcCompletionCoins(
  task: Pick<TaskResponse, 'parentTaskId' | 'deadline'> & { effectivePriority: number | null },
): number {
  if (task.parentTaskId) return 0;
  const deadline = parseDate(task.deadline);
  if (deadline && deadline < new Date()) return 5;
  const priority = task.effectivePriority ?? 0.5;
  return Math.floor(10 + priority * 40);
}
