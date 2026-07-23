import { api } from './client';
import type { AiUsage } from './types';

export async function fetchAiUsage(): Promise<AiUsage> {
  const res = await api.get('/ai-usage');
  return res.data;
}
