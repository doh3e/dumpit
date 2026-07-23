import type { RoutineResponse } from '../api/types';

export const WEEK_DAYS = [
  { value: 1, label: '월' }, { value: 2, label: '화' }, { value: 3, label: '수' },
  { value: 4, label: '목' }, { value: 5, label: '금' }, { value: 6, label: '토' },
  { value: 7, label: '일' },
] as const;

export const MONTHLY_ORDINALS = [
  { value: 1, label: '첫째' }, { value: 2, label: '둘째' }, { value: 3, label: '셋째' },
  { value: 4, label: '넷째' }, { value: 5, label: '다섯째' },
] as const;

type RepeatFields = Pick<
  RoutineResponse,
  'repeatType' | 'daysOfWeek' | 'daysOfMonth' | 'monthlyWeekOrdinal' | 'monthlyWeekDay' | 'runOnLastDayIfMissing'
>;

/** 반복 규칙 요약 문구 — 웹 RoutinePage formatRule 이식 + 말일 실행 표기 */
export function repeatSummary(r: RepeatFields): string {
  if (r.repeatType === 'DAILY') return '매일';
  if (r.repeatType === 'WEEKLY') {
    const labels = WEEK_DAYS.filter((d) => r.daysOfWeek?.includes(d.value)).map((d) => d.label);
    return labels.length > 0 ? `매주 ${labels.join('·')}` : '요일 미설정';
  }
  if (r.repeatType === 'MONTHLY') {
    if (!r.daysOfMonth || r.daysOfMonth.length === 0) return '날짜 미설정';
    const days = [...r.daysOfMonth].sort((a, b) => a - b).join('·');
    return `매월 ${days}일${r.runOnLastDayIfMissing ? ' (없으면 말일)' : ''}`;
  }
  const ordinal = MONTHLY_ORDINALS.find((o) => o.value === r.monthlyWeekOrdinal)?.label;
  const day = WEEK_DAYS.find((d) => d.value === r.monthlyWeekDay)?.label;
  return ordinal && day ? `매월 ${ordinal} ${day}요일` : '월간 요일 미설정';
}

type TimeFields = Pick<RoutineResponse, 'routineStartTime' | 'createTime' | 'routineEndTime'>;

/** 시각 요약 — "HH:mm:ss"도 앞 5자만 표시 */
export function timeSummary(r: TimeFields): string {
  const start = (r.routineStartTime ?? r.createTime)?.slice(0, 5) ?? null;
  const end = r.routineEndTime?.slice(0, 5) ?? null;
  if (start && end) return `${start} 시작 · ${end} 마감`;
  if (start) return `${start} 시작 · 23:59 마감`;
  return '오늘 안에 · 23:59 마감';
}
