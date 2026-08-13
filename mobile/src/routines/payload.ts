import type { RoutinePayload } from '../api/routines';
import type { RepeatType, RoutineResponse } from '../api/types';

/** 웹 RoutinePage EMPTY_FORM·buildPayload 이식 — 폼 상태와 요청 매핑을 순수 함수로 분리 */
export type RoutineFormState = {
  name: string;
  description: string;
  enabled: boolean;
  repeatType: RepeatType;
  daysOfWeek: number[];
  daysOfMonth: number[];
  monthlyWeekOrdinal: number;
  monthlyWeekDay: number;
  runOnLastDayIfMissing: boolean;
  hasStartTime: boolean;
  startTime: string;   // "HH:mm"
  hasEndTime: boolean;
  endTime: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // '' = 없음
};

export function emptyRoutineForm(today: string): RoutineFormState {
  return {
    name: '', description: '', enabled: true, repeatType: 'DAILY',
    daysOfWeek: [], daysOfMonth: [], monthlyWeekOrdinal: 1, monthlyWeekDay: 1,
    runOnLastDayIfMissing: false,
    hasStartTime: false, startTime: '06:00', hasEndTime: false, endTime: '07:00',
    startDate: today, endDate: '',
  };
}

export function formFromRoutine(r: RoutineResponse): RoutineFormState {
  const startTime = (r.routineStartTime ?? r.createTime)?.slice(0, 5) ?? '06:00';
  return {
    name: r.name ?? '',
    description: r.description ?? '',
    enabled: Boolean(r.enabled),
    repeatType: r.repeatType ?? 'DAILY',
    daysOfWeek: r.daysOfWeek ?? [],
    daysOfMonth: r.daysOfMonth ?? [],
    monthlyWeekOrdinal: r.monthlyWeekOrdinal ?? 1,
    monthlyWeekDay: r.monthlyWeekDay ?? 1,
    runOnLastDayIfMissing: Boolean(r.runOnLastDayIfMissing),
    hasStartTime: Boolean(r.routineStartTime ?? r.createTime),
    startTime,
    hasEndTime: Boolean(r.routineEndTime),
    endTime: r.routineEndTime?.slice(0, 5) ?? '07:00',
    startDate: r.startDate ?? '',
    endDate: r.endDate ?? '',
  };
}

/** 저장 가능 여부 검증 — 에러 문구 반환, 통과면 null (웹 검증 + 반복 필수값) */
export function validateRoutineForm(f: RoutineFormState): string | null {
  if (!f.name.trim()) return '루틴 이름을 입력해주세요.';
  if (f.repeatType === 'WEEKLY' && f.daysOfWeek.length === 0) return '반복할 요일을 골라주세요.';
  if (f.repeatType === 'MONTHLY' && f.daysOfMonth.length === 0) return '반복할 날짜를 골라주세요.';
  if (!f.startDate) return '시작일을 골라주세요.';
  if (f.endDate && f.endDate < f.startDate) return '종료일은 시작일 이후여야 해요.';
  if (f.hasStartTime && f.hasEndTime && f.endTime <= f.startTime) {
    return '종료 시간은 시작 시간 이후로 설정해주세요.';
  }
  return null;
}

export function buildRoutinePayload(f: RoutineFormState): RoutinePayload {
  return {
    name: f.name.trim(),
    description: f.description.trim() || null,
    enabled: f.enabled,
    repeatType: f.repeatType,
    daysOfWeek: f.repeatType === 'WEEKLY' ? f.daysOfWeek : [],
    daysOfMonth: f.repeatType === 'MONTHLY' ? f.daysOfMonth : [],
    monthlyWeekOrdinal: f.repeatType === 'MONTHLY_WEEKDAY' ? f.monthlyWeekOrdinal : null,
    monthlyWeekDay: f.repeatType === 'MONTHLY_WEEKDAY' ? f.monthlyWeekDay : null,
    runOnLastDayIfMissing: f.repeatType === 'MONTHLY' ? f.runOnLastDayIfMissing : false,
    createTime: f.hasStartTime ? f.startTime : null,
    routineStartTime: f.hasStartTime ? f.startTime : null,
    routineEndTime: f.hasStartTime && f.hasEndTime ? f.endTime : null,
    startDate: f.startDate,
    endDate: f.endDate || null,
  };
}
