import { api } from './client';
import type { RepeatType, RoutineResponse } from './types';

export type RoutinePayload = {
  name: string;
  description: string | null;
  enabled: boolean;
  repeatType: RepeatType;
  daysOfWeek: number[];
  daysOfMonth: number[];
  monthlyWeekOrdinal: number | null;
  monthlyWeekDay: number | null;
  runOnLastDayIfMissing: boolean;
  createTime: string | null;       // "HH:mm"
  routineStartTime: string | null;
  routineEndTime: string | null;
  startDate: string;               // "YYYY-MM-DD"
  endDate: string | null;
};

export async function fetchRoutines(): Promise<RoutineResponse[]> {
  const res = await api.get('/routines');
  return res.data;
}

export async function createRoutine(payload: RoutinePayload): Promise<RoutineResponse> {
  const res = await api.post('/routines', payload);
  return res.data;
}

export async function patchRoutine(routineId: string, payload: RoutinePayload): Promise<RoutineResponse> {
  const res = await api.patch(`/routines/${routineId}`, payload);
  return res.data;
}

export async function toggleRoutine(routineId: string, enabled: boolean): Promise<RoutineResponse> {
  const res = await api.patch(`/routines/${routineId}/enabled`, { enabled });
  return res.data;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await api.delete(`/routines/${routineId}`);
}
