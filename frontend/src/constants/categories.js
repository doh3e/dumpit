export const CATEGORIES = [
  { value: 'WORK', label: '업무', emoji: '💼', color: 'bg-blue-100 text-blue-700 border-blue-400' },
  { value: 'STUDY', label: '학업', emoji: '📚', color: 'bg-indigo-100 text-indigo-700 border-indigo-400' },
  { value: 'APPOINTMENT', label: '약속', emoji: '📅', color: 'bg-pink-100 text-pink-700 border-pink-400' },
  { value: 'CHORE', label: '집안일', emoji: '🧹', color: 'bg-amber-100 text-amber-700 border-amber-400' },
  { value: 'ROUTINE', label: '루틴', emoji: '🔁', color: 'bg-purple-100 text-purple-700 border-purple-400' },
  { value: 'HEALTH', label: '건강', emoji: '💪', color: 'bg-green-100 text-green-700 border-green-400' },
  { value: 'HOBBY', label: '취미', emoji: '🎮', color: 'bg-rose-100 text-rose-700 border-rose-400' },
  { value: 'OTHER', label: '기타', emoji: '📌', color: 'bg-gray-100 text-gray-700 border-gray-400' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

export function getCategory(value) {
  return CATEGORY_MAP[value] || CATEGORY_MAP.OTHER
}
