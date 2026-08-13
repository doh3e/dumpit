/**
 * 상세 시트 저장 시 중요도 패치 조각 (PATCH는 containsKey 기반 부분 업데이트).
 * - 슬라이더를 실제로 움직였을 때만 사용자 지정으로 저장
 * - 'AI 점수로 초기화'를 눌렀으면 지정 해제(null) → 긴급도 자동 조정 복귀
 * - 둘 다 아니면 키 자체를 보내지 않아 기존 상태(자동/기존 지정) 유지
 */
export function buildPriorityPatch(
  dirty: boolean, clearOverride: boolean, score: number,
): { userPriorityScore?: number | null } {
  if (dirty) return { userPriorityScore: score };
  if (clearOverride) return { userPriorityScore: null };
  return {};
}
