import { categoryBars, formatFocusTotal, heatLevel, heatmapWeeks } from '../stats';

describe('formatFocusTotal (웹 MyPage 이식)', () => {
  it('분·시간·시간+분', () => {
    expect(formatFocusTotal(45)).toBe('45분');
    expect(formatFocusTotal(120)).toBe('2시간');
    expect(formatFocusTotal(125)).toBe('2시간 5분');
    expect(formatFocusTotal(0)).toBe('0분');
  });
});

describe('heatmapWeeks', () => {
  it('7일 단위 주 배열 + 오늘 표시 (서버 키 순서 유지)', () => {
    const heatmap: Record<string, number> = {};
    for (let d = 1; d <= 9; d++) heatmap[`2026-07-${String(d).padStart(2, '0')}`] = d % 4;
    const weeks = heatmapWeeks(heatmap, '2026-07-09');
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[1]).toHaveLength(2);
    expect(weeks[1][1]).toMatchObject({ date: '2026-07-09', count: 1, isToday: true });
    expect(weeks[0][0].isToday).toBe(false);
  });
});

it('heatLevel 0/1/2/3+ 단계', () => {
  expect([heatLevel(0), heatLevel(1), heatLevel(2), heatLevel(3), heatLevel(9)]).toEqual([0, 1, 2, 3, 3]);
});

describe('categoryBars', () => {
  it('건수 내림차순·비율 합 1·색 포함', () => {
    const bars = categoryBars({ WORK: 3, HOBBY: 1 });
    expect(bars.map((b) => b.category)).toEqual(['WORK', 'HOBBY']);
    expect(bars[0].ratio).toBeCloseTo(0.75);
    expect(bars[0].color).toMatch(/^#/);
  });
  it('0건 카테고리는 제외, 전부 0이면 빈 배열', () => {
    expect(categoryBars({ WORK: 0 })).toEqual([]);
  });
});
