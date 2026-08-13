import { buildRoutinePayload, emptyRoutineForm, formFromRoutine, validateRoutineForm } from '../payload';
import type { RoutineResponse } from '../../api/types';

const form = { ...emptyRoutineForm('2026-07-24'), name: '아침 운동' };

describe('validateRoutineForm', () => {
  it('이름·반복 필수값·시간 순서 검증', () => {
    expect(validateRoutineForm(form)).toBeNull();
    expect(validateRoutineForm({ ...form, name: '  ' })).toContain('이름');
    expect(validateRoutineForm({ ...form, repeatType: 'WEEKLY' })).toContain('요일');
    expect(validateRoutineForm({ ...form, repeatType: 'MONTHLY' })).toContain('날짜');
    expect(validateRoutineForm({ ...form, endDate: '2026-07-01' })).toContain('종료일');
    expect(validateRoutineForm({
      ...form, hasStartTime: true, hasEndTime: true, startTime: '10:00', endTime: '09:00',
    })).toContain('종료 시간');
  });
});

describe('buildRoutinePayload (웹 buildPayload 이식)', () => {
  it('활성 repeatType 외 필드는 정리된다', () => {
    const p = buildRoutinePayload({ ...form, repeatType: 'WEEKLY', daysOfWeek: [2], daysOfMonth: [9], runOnLastDayIfMissing: true });
    expect(p.daysOfWeek).toEqual([2]);
    expect(p.daysOfMonth).toEqual([]);
    expect(p.monthlyWeekOrdinal).toBeNull();
    expect(p.runOnLastDayIfMissing).toBe(false);
  });

  it('시각 매핑 — createTime=시작, 종료는 시작 있을 때만', () => {
    const p = buildRoutinePayload({ ...form, hasStartTime: true, startTime: '06:30', hasEndTime: true, endTime: '07:30' });
    expect(p).toMatchObject({ createTime: '06:30', routineStartTime: '06:30', routineEndTime: '07:30' });
    const noStart = buildRoutinePayload({ ...form, hasStartTime: false, hasEndTime: true, endTime: '07:30' });
    expect(noStart).toMatchObject({ createTime: null, routineStartTime: null, routineEndTime: null });
    expect(buildRoutinePayload(form).endDate).toBeNull();
  });
});

describe('formFromRoutine', () => {
  it('응답 → 폼 복원 (HH:mm:ss 절단·createTime 폴백)', () => {
    const routine = {
      routineId: 'r1', name: '스트레칭', description: null, enabled: true,
      repeatType: 'WEEKLY', daysOfWeek: [6, 7], daysOfMonth: [],
      monthlyWeekOrdinal: null, monthlyWeekDay: null, runOnLastDayIfMissing: false,
      createTime: '08:00:00', routineStartTime: null, routineEndTime: '09:15:00',
      startDate: '2026-07-01', endDate: null, lastGeneratedDate: null, nextRunAt: null,
      createdAt: '', updatedAt: '',
    } as RoutineResponse;
    const f = formFromRoutine(routine);
    expect(f).toMatchObject({
      hasStartTime: true, startTime: '08:00', hasEndTime: true, endTime: '09:15',
      daysOfWeek: [6, 7], endDate: '',
    });
  });
});
