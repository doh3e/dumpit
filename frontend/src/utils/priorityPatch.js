// mobile/src/tasks/priorityPatch.ts 이식 — 슬라이더를 실제로 움직였을 때만 지정값을 저장해
// "저장만 눌러도 자동 조정이 꺼지는" 함정을 막는다.
export function buildPriorityPatch(dirty, clearOverride, score) {
  if (dirty) return { userPriorityScore: score }
  if (clearOverride) return { userPriorityScore: null }
  return {}
}
