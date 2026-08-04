import type { PlanningResponse, TaskRecommendation } from '../api/types';

/**
 * 히어로 카드 미니 큐 — 웹 DashboardPage heroQueue와 동일 규칙(패리티).
 * 히어로 태스크 제외(seen 셋 선등록), 오늘 남은 일(마감순) 우선, 모자라면 추천 상위로 보충.
 * 추천 목록(focusRecommendations)을 그대로 쓰면 히어로(=최상위 추천)가 큐에 중복 등장한다.
 * 웹은 2개 상한이지만 모바일 홈·위젯(XTALL)은 3개까지 보여준다.
 * 위젯 네이티브 갱신 경로(WidgetApi.heroJsonFrom)에도 같은 규칙이 Kotlin으로 전사돼 있다 —
 * 여기를 바꾸면 그쪽도 함께 바꿔야 한다.
 */
export function buildHeroQueue(
  planning: PlanningResponse,
  heroTaskId: string | null,
  cap = 3,
): TaskRecommendation[] {
  const seen = new Set<string>(heroTaskId != null ? [heroTaskId] : []);
  const queue: TaskRecommendation[] = [];
  const todayByDeadline = [...(planning.sections?.today ?? [])].sort((a, b) => {
    const ad = a.deadline ? Date.parse(a.deadline) : Number.MAX_SAFE_INTEGER;
    const bd = b.deadline ? Date.parse(b.deadline) : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });
  for (const task of todayByDeadline) {
    if (queue.length >= cap) break;
    if (seen.has(task.taskId)) continue;
    seen.add(task.taskId);
    queue.push({ task, bucket: 'TODAY', score: 0, reasons: [] });
  }
  for (const recommendation of planning.focusRecommendations ?? []) {
    if (queue.length >= cap) break;
    if (!recommendation.task || seen.has(recommendation.task.taskId)) continue;
    seen.add(recommendation.task.taskId);
    queue.push(recommendation);
  }
  return queue;
}
