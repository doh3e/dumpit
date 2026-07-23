import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { fetchAiUsage } from '../api/aiUsage';
import { fetchPlanning } from '../api/planning';
import { patchTask } from '../api/tasks';
import type { PlanningResponse, TaskResponse, TaskStatus } from '../api/types';
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

export const TOGGLE_MUTATION_KEY = ['toggle-task'] as const;

/** 낙관적 토글의 캐시 조작부 — 순수하게 분리해 테스트 대상으로 */
export function buildToggleHandlers(qc: QueryClient) {
  return {
    onMutate: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      await qc.cancelQueries({ queryKey: keys.planning });
      const prev = qc.getQueryData<PlanningResponse>(keys.planning);
      const prevTask = prev?.tasks.find((t) => t.taskId === taskId) ?? null;
      if (prev) {
        qc.setQueryData(keys.planning, updateTaskInPlanning(prev, taskId, {
          status,
          completedAt: status === 'DONE' ? toLocalDateTimeString(new Date()) : null,
        }));
      }
      return { prevTask };
    },
    // 전체 스냅샷 복원 대신 해당 태스크만 역패치 — 다른 태스크의 낙관 상태를 지우지 않는다
    onError: (_e: unknown, vars: { taskId: string }, ctx?: { prevTask?: TaskResponse | null }) => {
      const prevTask = ctx?.prevTask;
      if (!prevTask) return;
      const current = qc.getQueryData<PlanningResponse>(keys.planning);
      if (current) {
        qc.setQueryData(keys.planning, updateTaskInPlanning(current, vars.taskId, {
          status: prevTask.status,
          completedAt: prevTask.completedAt,
        }));
      }
    },
    onSettled: () => {
      // 마지막 in-flight 토글일 때만 리페치 — 연속 토글 시 서버 중간상태 역전 방지
      if (qc.isMutating({ mutationKey: [...TOGGLE_MUTATION_KEY] }) <= 1) {
        qc.invalidateQueries({ queryKey: keys.planning });
      }
    },
  };
}

/** 완료/해제 토글 — 즉시 반영, 실패 롤백, 성공 시 코인(/auth/me) 갱신 */
export function useToggleTask() {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationKey: [...TOGGLE_MUTATION_KEY],
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      patchTask(taskId, { status }),
    ...buildToggleHandlers(qc),
    onSuccess: () => {
      refresh();
    },
  });
}
