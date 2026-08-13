import { api } from './client';
import type { IdeaNode, IdeaResponse, TaskResponse } from './types';

export type IdeaInput = {
  title: string;
  content?: string | null;
  pinned?: boolean;
  category?: string | null;
  parentIdeaId?: string | null;
};

export async function fetchIdeas(): Promise<IdeaResponse[]> {
  const res = await api.get('/ideas');
  return res.data;
}

export async function createIdea(input: IdeaInput): Promise<IdeaResponse> {
  const res = await api.post('/ideas', input);
  return res.data;
}

export async function patchIdea(ideaId: string, input: IdeaInput): Promise<IdeaResponse> {
  const res = await api.patch(`/ideas/${ideaId}`, input);
  return res.data;
}

export async function setIdeaSticker(ideaId: string, code: string | null): Promise<IdeaResponse> {
  const res = await api.put(`/ideas/${ideaId}/sticker`, { code });
  return res.data;
}

/** AI 1점 — 아이디어는 남고 convertedTaskId가 채워진다 */
export async function convertIdeaToTask(ideaId: string): Promise<TaskResponse> {
  const res = await api.post(`/ideas/${ideaId}/convert-to-task`);
  return res.data;
}

/** AI 5점 */
export async function extractIdeas(rawText: string): Promise<{ ideas: IdeaNode[] }> {
  const res = await api.post('/ideas/ai-extract', { rawText });
  return res.data;
}

export async function confirmExtract(ideas: IdeaNode[]): Promise<IdeaResponse[]> {
  const res = await api.post('/ideas/ai-extract/confirm', { ideas });
  return res.data;
}

export async function deleteIdea(ideaId: string): Promise<void> {
  await api.delete(`/ideas/${ideaId}`);
}
