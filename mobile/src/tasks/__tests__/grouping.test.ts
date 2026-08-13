import { groupByParent, sortByDeadline, sortTasks } from '../grouping';

const t = (id: string, extra: object = {}) =>
  ({ taskId: id, parentTaskId: null, deadline: null, effectivePriority: 0.5, ...extra }) as any;

it('groupByParent: 부모 바로 뒤에 자식, 자식 최상위 중복 없음', () => {
  const list = [t('a'), t('c1', { parentTaskId: 'b' }), t('b'), t('a1', { parentTaskId: 'a' })];
  expect(groupByParent(list).map((x) => x.taskId)).toEqual(['a', 'a1', 'b', 'c1']);
});

it('groupByParent: 부모가 리스트에 없는 자식은 최상위 유지', () => {
  const list = [t('x', { parentTaskId: 'ghost' }), t('y')];
  expect(groupByParent(list).map((x) => x.taskId)).toEqual(['x', 'y']);
});

it('sortByDeadline: 마감 오름차순, null은 뒤로', () => {
  const list = [t('n'), t('b', { deadline: '2026-07-25T10:00:00' }), t('a', { deadline: '2026-07-24T10:00:00' })];
  expect(sortByDeadline(list).map((x) => x.taskId)).toEqual(['a', 'b', 'n']);
});

it('sortTasks priority: effectivePriority 내림차순, 동률 시 deadline 오름차순', () => {
  const list = [
    t('lo', { effectivePriority: 0.2 }),
    t('hiLate', { effectivePriority: 0.9, deadline: '2026-07-26T10:00:00' }),
    t('hiSoon', { effectivePriority: 0.9, deadline: '2026-07-24T10:00:00' }),
  ];
  expect(sortTasks(list, 'priority').map((x) => x.taskId)).toEqual(['hiSoon', 'hiLate', 'lo']);
});

it('sortTasks deadline: 마감 오름차순, 동률 시 priority 내림차순', () => {
  const d = '2026-07-24T10:00:00';
  const list = [t('lo', { deadline: d, effectivePriority: 0.1 }), t('hi', { deadline: d, effectivePriority: 0.9 })];
  expect(sortTasks(list, 'deadline').map((x) => x.taskId)).toEqual(['hi', 'lo']);
});
