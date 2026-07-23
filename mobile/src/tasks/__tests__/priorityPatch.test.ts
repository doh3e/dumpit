import { buildPriorityPatch } from '../priorityPatch';

it('슬라이더를 움직였으면 그 값을 지정 저장', () =>
  expect(buildPriorityPatch(true, false, 0.7)).toEqual({ userPriorityScore: 0.7 }));

it('초기화를 눌렀으면 지정 해제(null)', () =>
  expect(buildPriorityPatch(false, true, 0.35)).toEqual({ userPriorityScore: null }));

it('둘 다 아니면 키를 보내지 않는다 (기존 상태 유지)', () =>
  expect(buildPriorityPatch(false, false, 0.35)).toEqual({}));

it('초기화 후 다시 움직였으면 움직인 값이 우선', () =>
  expect(buildPriorityPatch(true, true, 0.9)).toEqual({ userPriorityScore: 0.9 }));
