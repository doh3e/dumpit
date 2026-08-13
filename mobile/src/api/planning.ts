import { api } from './client';
import type { PlanningResponse } from './types';

export async function fetchPlanning(): Promise<PlanningResponse> {
  const res = await api.get('/dashboard/planning');
  return res.data;
}
