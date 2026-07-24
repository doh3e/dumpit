import { repeatSummary, timeSummary } from '../repeatSummary';

const base = {
  repeatType: 'DAILY' as const,
  daysOfWeek: [] as number[],
  daysOfMonth: [] as number[],
  monthlyWeekOrdinal: null,
  monthlyWeekDay: null,
  runOnLastDayIfMissing: false,
};

describe('repeatSummary', () => {
  it('매일·요일·날짜·주차', () => {
    expect(repeatSummary(base)).toBe('매일');
    expect(repeatSummary({ ...base, repeatType: 'WEEKLY', daysOfWeek: [1, 3, 5] })).toBe('매주 월·수·금');
    expect(repeatSummary({ ...base, repeatType: 'MONTHLY', daysOfMonth: [15, 1] })).toBe('매월 1·15일');
    expect(repeatSummary({
      ...base, repeatType: 'MONTHLY', daysOfMonth: [31], runOnLastDayIfMissing: true,
    })).toBe('매월 31일 (없으면 말일)');
    expect(repeatSummary({
      ...base, repeatType: 'MONTHLY_WEEKDAY', monthlyWeekOrdinal: 3, monthlyWeekDay: 2,
    })).toBe('매월 셋째 화요일');
  });

  it('미설정 문구', () => {
    expect(repeatSummary({ ...base, repeatType: 'WEEKLY' })).toBe('요일 미설정');
    expect(repeatSummary({ ...base, repeatType: 'MONTHLY' })).toBe('날짜 미설정');
    expect(repeatSummary({ ...base, repeatType: 'MONTHLY_WEEKDAY' })).toBe('월간 요일 미설정');
  });
});

describe('timeSummary', () => {
  it('시작·종료 / 시작만 / 없음, HH:mm:ss 절단', () => {
    expect(timeSummary({ routineStartTime: '18:00:00', createTime: null, routineEndTime: '20:30:00' }))
      .toBe('18:00 시작 · 20:30 마감');
    expect(timeSummary({ routineStartTime: null, createTime: '06:00', routineEndTime: null }))
      .toBe('06:00 시작 · 일과 끝 마감');
    expect(timeSummary({ routineStartTime: null, createTime: null, routineEndTime: null }))
      .toBe('오늘 안에 · 일과 끝 마감');
  });
});
