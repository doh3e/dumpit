import { calcCompletionCoins } from '../rewards';

const base = { parentTaskId: null, deadline: null, effectivePriority: 0.5 } as any;

it('서브태스크는 0', () => expect(calcCompletionCoins({ ...base, parentTaskId: 'x' })).toBe(0));

it('마감 지남은 5 고정', () =>
  expect(calcCompletionCoins({ ...base, deadline: '2020-01-01T00:00:00' })).toBe(5));

it('그 외 floor(10 + priority*40)', () => {
  expect(calcCompletionCoins({ ...base, effectivePriority: 0 })).toBe(10);
  expect(calcCompletionCoins({ ...base, effectivePriority: 1 })).toBe(50);
  expect(calcCompletionCoins({ ...base, effectivePriority: 0.72 })).toBe(38);
});

it('priority null이면 0.5 취급 → 30', () =>
  expect(calcCompletionCoins({ ...base, effectivePriority: null })).toBe(30));
