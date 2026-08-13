import { autoEffectivePriority, effectivePriority, urgencyScore } from '../priority';

const now = new Date(2026, 6, 24, 12, 0);

describe('urgencyScore (백엔드 PriorityCalculator 이식)', () => {
  it('마감 없음 0.15, 지남 1.0, 1시간 내 0.95', () => {
    expect(urgencyScore(null, now)).toBe(0.15);
    expect(urgencyScore('2026-07-24T11:00', now)).toBe(1.0);
    expect(urgencyScore('2026-07-24T12:30', now)).toBe(0.95);
  });
  it('24h 내 0.85, 3일 내 0.6, 7일 내 0.4, 그 외 0.25', () => {
    expect(urgencyScore('2026-07-25T10:00', now)).toBe(0.85);
    expect(urgencyScore('2026-07-26T12:00', now)).toBe(0.6);
    expect(urgencyScore('2026-07-30T12:00', now)).toBe(0.4);
    expect(urgencyScore('2026-08-30T12:00', now)).toBe(0.25);
  });
});

it('언젠가 태스크 AI 30점 → 자동 실효 21점 (사용자 혼란 재현 케이스)', () => {
  expect(Math.round(autoEffectivePriority(0.3, null, now) * 100)).toBe(21);
});

it('AI 점수 없으면 0.5 취급', () => {
  expect(autoEffectivePriority(null, null, now)).toBeCloseTo(0.6 * 0.15 + 0.4 * 0.5);
});

describe('effectivePriority 바닥+합성 (2026-07-24 서버 정책)', () => {
  it('지정값은 바닥으로 보장된다 (마감 없음)', () => {
    expect(effectivePriority({ userPriorityScore: 0.4, aiPriorityScore: 0.8, deadline: null }, now)).toBe(0.4);
  });
  it('지정값도 마감 임박이면 올라간다', () => {
    expect(effectivePriority({ userPriorityScore: 0.4, aiPriorityScore: null, deadline: '2026-07-24T12:30' }, now))
      .toBeCloseTo(0.73);
  });
  it('지정 없으면 자동 합성과 같다', () => {
    expect(effectivePriority({ userPriorityScore: null, aiPriorityScore: 0.3, deadline: null }, now))
      .toBeCloseTo(autoEffectivePriority(0.3, null, now));
  });
});
