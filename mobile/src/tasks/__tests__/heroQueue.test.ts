import { buildHeroQueue } from '../heroQueue';
import type { PlanningResponse, TaskResponse } from '../../api/types';

function task(id: string, deadline: string | null = null): TaskResponse {
  return { taskId: id, title: `task-${id}`, deadline } as TaskResponse;
}

function planning(partial: {
  today?: TaskResponse[];
  recs?: { task: TaskResponse; bucket: string }[];
}): PlanningResponse {
  return {
    sections: { today: partial.today ?? [] },
    focusRecommendations: (partial.recs ?? []).map((r) => ({ ...r, score: 0, reasons: [] })),
  } as unknown as PlanningResponse;
}

describe('buildHeroQueue (웹 DashboardPage heroQueue 패리티)', () => {
  it('히어로 태스크는 큐에서 제외된다 — 지금 할 일/다음에 중복 방지', () => {
    const hero = task('h', '2026-08-04T18:00:00');
    const p = planning({
      today: [hero, task('a', '2026-08-04T20:00:00')],
      recs: [{ task: hero, bucket: 'TODAY' }, { task: task('b'), bucket: 'TOMORROW' }],
    });
    const queue = buildHeroQueue(p, 'h');
    expect(queue.map((r) => r.task.taskId)).toEqual(['a', 'b']);
  });

  it('오늘 섹션(마감순)이 추천보다 우선하고, 모자라면 추천으로 보충한다', () => {
    const p = planning({
      today: [task('late', '2026-08-04T22:00:00'), task('early', '2026-08-04T09:00:00')],
      recs: [{ task: task('r1'), bucket: 'NEXT_7_DAYS' }],
    });
    const queue = buildHeroQueue(p, null);
    expect(queue.map((r) => r.task.taskId)).toEqual(['early', 'late', 'r1']);
    expect(queue[0].bucket).toBe('TODAY');
  });

  it('상한(기본 3)과 중복 제거를 지킨다', () => {
    const a = task('a', '2026-08-04T09:00:00');
    const p = planning({
      today: [a, task('b', '2026-08-04T10:00:00'), task('c', '2026-08-04T11:00:00'), task('d', '2026-08-04T12:00:00')],
      recs: [{ task: a, bucket: 'TODAY' }],
    });
    const queue = buildHeroQueue(p, null);
    expect(queue).toHaveLength(3);
    expect(new Set(queue.map((r) => r.task.taskId)).size).toBe(3);
  });
});
