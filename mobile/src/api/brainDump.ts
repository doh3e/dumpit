import { api } from './client';
import type { DumpResponse, DumpTaskItem } from './types';

/** 확정 요청의 우선순위 필드명은 priorityScore (제안 응답의 aiPriorityScore에서 옮겨 담기) */
export type DumpConfirmTask = {
  title: string;
  description: string | null;
  priorityScore: number | null;
  category: string | null;
  deadline: string | null;
  estimatedMinutes: number | null;
};

/** AI 5점 */
export async function submitBrainDump(rawText: string): Promise<DumpResponse> {
  const res = await api.post('/brain-dump', { rawText });
  return res.data;
}

export async function confirmBrainDump(dumpId: string, tasks: DumpConfirmTask[]): Promise<DumpTaskItem[]> {
  const res = await api.post(`/brain-dump/${dumpId}/confirm`, { tasks });
  return res.data;
}
