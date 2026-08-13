import { api } from './client';
import type { Category, TaskResponse } from './types';

export type TaskCreateInput = {
  title: string;
  description?: string | null;
  deadline?: string | null;
  noDeadline?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  estimatedMinutes?: number | null;
  category?: Category | null;
  isLocked?: boolean;
};

export type SubtaskProposal = {
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
};

export async function createTask(input: TaskCreateInput): Promise<TaskResponse> {
  const res = await api.post('/tasks', input);
  return res.data;
}

/** 부분 업데이트 — 보낸 키만 반영(containsKey 기반). noDeadline true + non-null deadline 동시 전송 금지 */
export async function patchTask(taskId: string, patch: Record<string, unknown>): Promise<TaskResponse> {
  const res = await api.patch(`/tasks/${taskId}`, patch);
  return res.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export async function setSticker(taskId: string, code: string | null): Promise<TaskResponse> {
  const res = await api.put(`/tasks/${taskId}/sticker`, { code });
  return res.data;
}

/** AI 1점 — userPriorityScore가 null로 초기화됨 */
export async function reanalyzeTask(taskId: string): Promise<TaskResponse> {
  const res = await api.post(`/tasks/${taskId}/reanalyze`);
  return res.data;
}

/** AI 3점 */
export async function proposeSplit(taskId: string): Promise<{ subtasks: SubtaskProposal[] }> {
  const res = await api.post(`/tasks/${taskId}/split/propose`);
  return res.data;
}

export async function confirmSplit(taskId: string, subtasks: SubtaskProposal[]): Promise<TaskResponse[]> {
  const res = await api.post(`/tasks/${taskId}/split`, { subtasks });
  return res.data;
}
