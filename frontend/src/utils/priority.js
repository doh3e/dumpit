// 백엔드 PriorityCalculator.java 이식 (표시용) — 서버·mobile/src/tasks/priority.ts와 3중 동기화 필수.
// 자동 모드 실효 = 긴급도 0.6 + 중요도 0.4, 지정 모드 = max(지정값, 긴급도 0.6 + 지정 0.4).
export function urgencyScore(deadline, now) {
  if (!deadline) return 0.15
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return 0.15
  const minutesLeft = (d.getTime() - now.getTime()) / 60000
  if (minutesLeft <= 0) return 1.0
  if (minutesLeft <= 60) return 0.95
  if (minutesLeft <= 60 * 24) return 0.85
  if (minutesLeft <= 60 * 24 * 3) return 0.6
  if (minutesLeft <= 60 * 24 * 7) return 0.4
  return 0.25
}

export function effectivePriority({ userPriorityScore, aiPriorityScore, deadline }, now = new Date()) {
  const urgency = urgencyScore(deadline, now)
  if (userPriorityScore != null) {
    return Math.max(userPriorityScore, 0.6 * urgency + 0.4 * userPriorityScore)
  }
  const importance = aiPriorityScore ?? 0.5
  return 0.6 * urgency + 0.4 * importance
}
