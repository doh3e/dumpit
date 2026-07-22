// 뽀모도로 세트 전환 결정. setsTarget 0 = 무한 반복.
// completedSets: 방금 완료를 포함한 이번 런의 집중 완료 수.
// 세트 1은 기존 동작 보존 계약: 항상 짧은 휴식 후 정지(autoStartNextFocus가 false).
export function nextAfterFocus({ completedSets, setsTarget, longBreakEvery }) {
  if (setsTarget >= 2 && completedSets >= setsTarget) return { type: 'DONE' }
  return { type: 'BREAK', long: setsTarget !== 1 && completedSets % longBreakEvery === 0 }
}

export function autoStartNextFocus(setsTarget) {
  return setsTarget !== 1
}
