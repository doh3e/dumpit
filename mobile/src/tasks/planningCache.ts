import type { PlanningResponse, TaskResponse } from '../api/types';

/** 낙관적 업데이트용 불변 패치 — tasks·모든 sections에서 taskId 일치 항목에 patch 적용 */
export function updateTaskInPlanning(
  planning: PlanningResponse, taskId: string, patch: Partial<TaskResponse>,
): PlanningResponse {
  const apply = (list: TaskResponse[]) =>
    list.map((t) => (t.taskId === taskId ? { ...t, ...patch } : t));
  const sections = Object.fromEntries(
    Object.entries(planning.sections).map(([k, v]) => [k, apply(v)]),
  ) as PlanningResponse['sections'];
  return { ...planning, tasks: apply(planning.tasks), sections };
}
