import { parseDate } from './dates';

/**
 * 백엔드 PriorityCalculator.java 이식 (표시용) — 서버 로직 변경 시 함께 갱신할 것.
 * 자동 모드 실효 중요도 = 긴급도 0.6 + AI 중요도 0.4.
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
