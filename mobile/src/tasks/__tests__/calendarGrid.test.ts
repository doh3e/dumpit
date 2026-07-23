import { bucketByDay, buildMonthCells } from '../calendarGrid';

it('2026-07: 1일이 수요일(getDay=3) → 선행 null 3개, 총 34칸', () => {
  const cells = buildMonthCells(2026, 6);
  expect(cells.slice(0, 3)).toEqual([null, null, null]);
  expect(cells.filter(Boolean).length).toBe(31);
});

it('bucketByDay: 같은 연·월만 날짜별로 묶는다', () => {
  const items = [{ d: '2026-07-05T10:00:00' }, { d: '2026-07-05T22:00:00' }, { d: '2026-08-05T10:00:00' }];
  const map = bucketByDay(items, (x) => x.d, 2026, 6);
  expect(map.get(5)?.length).toBe(2);
  expect(map.size).toBe(1);
});

it('buildMonthCells: 윤년 2월의 모든 날짜를 만든다', () => {
  const cells = buildMonthCells(2028, 1);
  expect(cells.filter((day) => day !== null)).toEqual(
    Array.from({ length: 29 }, (_, index) => index + 1),
  );
});

it('bucketByDay: 빈 목록은 빈 Map을 반환한다', () => {
  expect(bucketByDay([], () => null, 2026, 6).size).toBe(0);
});

it('bucketByDay: 다른 달·null·잘못된 날짜는 제외한다', () => {
  const items = [
    { d: '2026-06-30T23:59:00' },
    { d: '2026-07-01T00:00:00' },
    { d: '2026-08-01T00:00:00' },
    { d: null },
    { d: 'not-a-date' },
  ];
  const map = bucketByDay(items, (x) => x.d, 2026, 6);

  expect(map.size).toBe(1);
  expect(map.get(1)).toEqual([{ d: '2026-07-01T00:00:00' }]);
});
