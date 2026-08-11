// color: index.css의 .cat-* 클래스 (라이트/다크 토큰 대응)
// icon: assets/icons iconProps 이름 — OS 이모지 대신 도트 아이콘 (도트 통일 Phase B)
export const CATEGORIES = [
  { value: 'WORK', label: '업무', icon: 'work', color: 'cat-chip cat-work' },
  { value: 'STUDY', label: '학업', icon: 'study', color: 'cat-chip cat-study' },
  { value: 'APPOINTMENT', label: '약속', icon: 'appointment', color: 'cat-chip cat-appointment' },
  { value: 'CHORE', label: '집안일', icon: 'chore', color: 'cat-chip cat-chore' },
  { value: 'ROUTINE', label: '루틴', icon: 'routine', color: 'cat-chip cat-routine' },
  { value: 'HEALTH', label: '건강', icon: 'health', color: 'cat-chip cat-health' },
  { value: 'HOBBY', label: '취미', icon: 'hobby', color: 'cat-chip cat-hobby' },
  { value: 'OTHER', label: '기타', icon: 'other', color: 'cat-chip cat-other' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

export function getCategory(value) {
  return CATEGORY_MAP[value] || CATEGORY_MAP.OTHER
}
