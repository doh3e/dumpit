// color: index.css의 .cat-* 클래스 (라이트/다크 토큰 대응)
export const CATEGORIES = [
  { value: 'WORK', label: '업무', emoji: '💼', color: 'cat-chip cat-work' },
  { value: 'STUDY', label: '학업', emoji: '📚', color: 'cat-chip cat-study' },
  { value: 'APPOINTMENT', label: '약속', emoji: '📅', color: 'cat-chip cat-appointment' },
  { value: 'CHORE', label: '집안일', emoji: '🧹', color: 'cat-chip cat-chore' },
  { value: 'ROUTINE', label: '루틴', emoji: '🔁', color: 'cat-chip cat-routine' },
  { value: 'HEALTH', label: '건강', emoji: '💪', color: 'cat-chip cat-health' },
  { value: 'HOBBY', label: '취미', emoji: '🎮', color: 'cat-chip cat-hobby' },
  { value: 'OTHER', label: '기타', emoji: '📌', color: 'cat-chip cat-other' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

export function getCategory(value) {
  return CATEGORY_MAP[value] || CATEGORY_MAP.OTHER
}
