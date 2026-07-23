import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { fetchAiUsage } from '../api/aiUsage';
import { fetchPlanning } from '../api/planning';
import { patchTask } from '../api/tasks';
import type { PlanningResponse, TaskStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { updateTaskInPlanning } from '../tasks/planningCache';
import { toLocalDateTimeString } from '../tasks/dates';
import { keys } from './keys';

export function usePlanning() {
  return useQuery({ queryKey: keys.planning, queryFn: fetchPlanning });
}

export function useAiUsage() {
  return useQuery({ queryKey: keys.aiUsage, queryFn: fetchAiUsage });
}

/** AI 소비 mutation 성공 시 호출 — 잔여 점수 배지 갱신 */
export function invalidateAfterAi(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: keys.aiUsage });
}

/** 낙관적 토글의 캐시 조작부 — 순수하게 분리해 테스트 대상으로 */
export function buildToggleHandlers(qc: QueryClient) {
  return {
    onMutate: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      await qc.cancelQueries({ queryKey: keys.planning });
      const prev = qc.getQueryData<PlanningResponse>(keys.planning);
      if (prev) {
        qc.setQueryData(keys.planning, updateTaskInPlanning(prev, taskId, {
          status,
          completedAt: status === 'DONE' ? toLocalDateTimeString(new Date()) : null,
        }));
      }
      return { prev };
    },
    onError: (_e: unknown, _v: unknown, ctx?: { prev?: PlanningResponse }) => {
      if (ctx?.prev) qc.setQueryData(keys.planning, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.planning });
    },
  };
}

/** 완료/해제 토글 — 즉시 반영, 실패 롤백, 성공 시 코인(/auth/me) 갱신 */
export function useToggleTask() {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      patchTask(taskId, { status }),
    ...buildToggleHandlers(qc),
    onSuccess: () => {
      refresh();
    },
  });
}
