import { parseDate } from './dates';

/**
 * 백엔드 PriorityCalculator.java 이식 (표시용) — 서버·웹 frontend/src/utils/priority.js와 3중 동기화 필수.
 * 자동 모드 실효 = 긴급도 0.6 + AI 중요도 0.4.
 * 지정 모드 = max(지정값, 긴급도 0.6 + 지정 0.4) — 바닥+합성 (2026-07-24 정책).
 */
export function urgencyScore(deadline: string | null, now: Date): number {
  const d = parseDate(deadline);
  if (!d) return 0.15;
  const minutesLeft = (d.getTime() - now.getTime()) / 60_000;
  if (minutesLeft <= 0) return 1.0;
  if (minutesLeft <= 60) return 0.95;
  if (minutesLeft <= 60 * 24) return 0.85;
  if (minutesLeft <= 60 * 24 * 3) return 0.6;
  if (minutesLeft <= 60 * 24 * 7) return 0.4;
  return 0.25;
}

export function autoEffectivePriority(
  aiScore: number | null, deadline: string | null, now: Date = new Date(),
): number {
  const importance = aiScore ?? 0.5;
  return 0.6 * urgencyScore(deadline, now) + 0.4 * importance;
}

export function effectivePriority(
  t: { userPriorityScore: number | null; aiPriorityScore: number | null; deadline: string | null },
  now: Date = new Date(),
): number {
  if (t.userPriorityScore != null) {
    // 바닥+합성: 지정값 보장, 마감 임박 시 합성값이 위로 끌어올림 (서버 PriorityCalculator 동일)
    const urgency = urgencyScore(t.deadline, now);
    return Math.max(t.userPriorityScore, 0.6 * urgency + 0.4 * t.userPriorityScore);
  }
  return autoEffectivePriority(t.aiPriorityScore, t.deadline, now);
}
