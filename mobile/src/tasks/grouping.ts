import type { TaskResponse } from '../api/types';
import { parseDate } from './dates';

/** 부모 순서 유지, 부모 바로 뒤에 자식 부착 (웹 TaskListCard groupByParent 이식) */
export function groupByParent(list: TaskResponse[]): TaskResponse[] {
  const ids = new Set(list.map((t) => t.taskId));
  const children = new Map<string, TaskResponse[]>();
  for (const t of list) {
    if (t.parentTaskId && ids.has(t.parentTaskId)) {
      const arr = children.get(t.parentTaskId) ?? [];
      arr.push(t);
      children.set(t.parentTaskId, arr);
    }
  }
  const out: TaskResponse[] = [];
  for (const t of list) {
    if (t.parentTaskId && ids.has(t.parentTaskId)) continue;
    out.push(t, ...(children.get(t.taskId) ?? []));
  }
  return out;
}

const deadlineMs = (t: TaskResponse) => parseDate(t.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;

export function sortByDeadline(list: TaskResponse[]): TaskResponse[] {
  return [...list].sort((a, b) => deadlineMs(a) - deadlineMs(b));
}

/** 웹 TaskBoardModal sortTasks 이식 — priority: 중요도↓·동률 마감↑ / deadline: 마감↑·동률 중요도↓ */
export function sortTasks(list: TaskResponse[], mode: 'priority' | 'deadline'): TaskResponse[] {
  return [...list].sort((a, b) => {
    const p = (b.effectivePriority ?? 0) - (a.effectivePriority ?? 0);
    const d = deadlineMs(a) - deadlineMs(b);
    return mode === 'priority' ? (p || d) : (d || p);
  });
}
