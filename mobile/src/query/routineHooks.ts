import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createRoutine, deleteRoutine, fetchRoutines, patchRoutine, toggleRoutine, type RoutinePayload,
} from '../api/routines';
import { fetchSettings, patchSettings } from '../api/settings';
import type { RoutineResponse, UserSettings } from '../api/types';
import { keys } from './keys';

export function useRoutines() {
  return useQuery({ queryKey: keys.routines, queryFn: fetchRoutines });
}

export function useUserSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: fetchSettings });
}

/** 낙관적 토글의 캐시 조작부 — hooks.ts buildToggleHandlers 패턴 미러 (테스트 대상) */
export function buildRoutineToggleHandlers(qc: QueryClient) {
  return {
    onMutate: async ({ routineId, enabled }: { routineId: string; enabled: boolean }) => {
      await qc.cancelQueries({ queryKey: keys.routines });
      const prev = qc.getQueryData<RoutineResponse[]>(keys.routines);
      const prevEnabled = prev?.find((r) => r.routineId === routineId)?.enabled ?? null;
      if (prev) {
        qc.setQueryData(keys.routines, prev.map((r) => (r.routineId === routineId ? { ...r, enabled } : r)));
      }
      return { prevEnabled };
    },
    onError: (_e: unknown, vars: { routineId: string }, ctx?: { prevEnabled?: boolean | null }) => {
      if (ctx?.prevEnabled == null) return;
      const current = qc.getQueryData<RoutineResponse[]>(keys.routines);
      if (current) {
        qc.setQueryData(
          keys.routines,
          current.map((r) => (r.routineId === vars.routineId ? { ...r, enabled: ctx.prevEnabled! } : r)),
        );
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.routines });
    },
  };
}

export function useToggleRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, enabled }: { routineId: string; enabled: boolean }) =>
      toggleRoutine(routineId, enabled),
    ...buildRoutineToggleHandlers(qc),
  });
}

/** 생성·수정 공용 — 루틴이 태스크를 만들므로 planning도 무효화 */
export function useSaveRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, routineId }: { payload: RoutinePayload; routineId?: string }) =>
      routineId ? patchRoutine(routineId, payload) : createRoutine(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.routines });
      qc.invalidateQueries({ queryKey: keys.planning });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (routineId: string) => deleteRoutine(routineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.routines });
      qc.invalidateQueries({ queryKey: keys.planning });
    },
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<UserSettings, 'routineStartHour' | 'routineEndHour'>>) =>
      patchSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(keys.settings, data);
    },
  });
}
