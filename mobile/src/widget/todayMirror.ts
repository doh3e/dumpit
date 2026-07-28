import type { QueryClient } from '@tanstack/react-query';
import { keys } from '../query/keys';
import { mirrorTodayTasks } from './mirror';
import type { PlanningResponse } from '../api/types';

const PLANNING_KEY = JSON.stringify(keys.planning);

/** planning 캐시 갱신 → sections.today 미러. 무효화 지점 여럿을 좇지 않는 단일 구독. */
export function installTodayMirror(qc: QueryClient): () => void {
  return qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    if (JSON.stringify(event.query.queryKey) !== PLANNING_KEY) return;
    const data = event.query.state.data as PlanningResponse | undefined;
    if (!data?.sections?.today) return;
    void mirrorTodayTasks(data.sections.today);
  });
}
