import type { Category, RecommendationBucket } from '../api/types';

/** 웹 constants/categories.js 이식 (색 클래스 제외 — 모바일은 토큰 직접 사용) */
export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'WORK', label: '업무', emoji: '💼' },
  { value: 'STUDY', label: '학업', emoji: '📚' },
  { value: 'APPOINTMENT', label: '약속', emoji: '📅' },
  { value: 'CHORE', label: '집안일', emoji: '🧹' },
  { value: 'ROUTINE', label: '루틴', emoji: '🔁' },
  { value: 'HEALTH', label: '건강', emoji: '💪' },
  { value: 'HOBBY', label: '취미', emoji: '🎮' },
  { value: 'OTHER', label: '기타', emoji: '📌' },
];
export const TASK_CATEGORIES = CATEGORIES.filter((c) => c.value !== 'ROUTINE');
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
export function getCategory(value: string | null | undefined) {
  return (value && CATEGORY_MAP[value]) || CATEGORY_MAP.OTHER;
}

/** 서버 UsageType 비용표와 일치 (변경 시 백엔드 확인) */
export const AI_COSTS = { TASK_CREATE: 1, TASK_REANALYZE: 1, SUBTASK_PROPOSAL: 3, BRAIN_DUMP: 5 } as const;

export const QUEUE_BUCKET_LABEL: Record<RecommendationBucket, string> = {
  OVERDUE: '마감 지남', TODAY: '오늘', TOMORROW: '내일',
  NEXT_7_DAYS: '일주일 내', LATER: '그 외', SOMEDAY: '언젠가',
};

/** 웹 shop/registry.js STICKER_SPRITES의 코드→이름. 이미지 require는 tasks/stickers.ts(Task 15)에서 */
export const STICKER_NAMES: Record<string, string> = {
  'sticker.heart': '하트', 'sticker.important': '중요!', 'sticker.star': '별',
  'sticker.fire': '불꽃', 'sticker.check': '체크', 'sticker.circle': '동그라미',
  'sticker.cross': '엑스', 'sticker.clover': '네잎클로버',
};
