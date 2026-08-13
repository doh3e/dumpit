import { buildDeadlinePayload } from '../deadlineMode';

const now = new Date(2026, 6, 23, 14, 30);

it('AI: 마감 없음·noDeadline false (서버 AI가 추론)', () =>
  expect(buildDeadlinePayload('AI', null, now)).toEqual({ deadline: null, noDeadline: false }));

it('TODAY: 오늘 23:59', () =>
  expect(buildDeadlinePayload('TODAY', null, now)).toEqual({ deadline: '2026-07-23T23:59', noDeadline: false }));

it('NONE: noDeadline true', () =>
  expect(buildDeadlinePayload('NONE', null, now)).toEqual({ deadline: null, noDeadline: true }));

it('CUSTOM: 입력값 그대로', () =>
  expect(buildDeadlinePayload('CUSTOM', '2026-08-01T09:00', now)).toEqual({ deadline: '2026-08-01T09:00', noDeadline: false }));
