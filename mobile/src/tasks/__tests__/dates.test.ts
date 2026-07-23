import {
  parseDate, isSameLocalDate, isToday, formatTime, formatDeadline,
  toLocalDateTimeString, toLocalDateString,
} from '../dates';

describe('dates', () => {
  it('parseDate: null/빈값/깨진 값은 null, ISO는 Date', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('nope')).toBeNull();
    expect(parseDate('2026-07-24T18:00:00')?.getHours()).toBe(18);
  });

  it('parseDate: Jackson 배열 폴백(1-based month)', () => {
    const d = parseDate([2026, 7, 24, 18, 30, 0]);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(24);
    expect(d?.getMinutes()).toBe(30);
  });

  it('isSameLocalDate: 같은 날 다른 시각 true, 다른 날 false', () => {
    expect(isSameLocalDate(new Date(2026, 6, 23, 1), new Date(2026, 6, 23, 23))).toBe(true);
    expect(isSameLocalDate(new Date(2026, 6, 23), new Date(2026, 6, 24))).toBe(false);
  });

  it('isToday: 오늘 문자열 true, 내일 false, null false', () => {
    const now = new Date();
    expect(isToday(toLocalDateTimeString(now))).toBe(true);
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    expect(isToday(toLocalDateTimeString(tmr))).toBe(false);
    expect(isToday(null)).toBe(false);
  });

  it('formatTime: "18:05" 0패딩, 잘못된 값은 null', () => {
    expect(formatTime('2026-07-24T18:05:00')).toBe('18:05');
    expect(formatTime(null)).toBeNull();
  });

  it('formatDeadline: 웹 ko-KR 표기 재현 (오전/오후, 12시간제 0패딩)', () => {
    expect(formatDeadline('2026-07-24T18:00:00')).toBe('7월 24일 오후 06:00');
    expect(formatDeadline('2026-01-03T00:05:00')).toBe('1월 3일 오전 12:05');
    expect(formatDeadline('2026-12-31T12:00:00')).toBe('12월 31일 오후 12:00');
    expect(formatDeadline(null)).toBeNull();
  });

  it('toLocalDateTimeString: 분 단위 "YYYY-MM-DDTHH:mm"', () => {
    expect(toLocalDateTimeString(new Date(2026, 6, 3, 9, 5))).toBe('2026-07-03T09:05');
  });

  it('toLocalDateString: "YYYY-MM-DD"', () => {
    expect(toLocalDateString(new Date(2026, 6, 3))).toBe('2026-07-03');
  });
});
