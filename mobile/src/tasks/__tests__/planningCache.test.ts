import { updateTaskInPlanning } from '../planningCache';

const task = (id: string, status = 'TODO') => ({ taskId: id, status }) as any;
const planning = {
  tasks: [task('a'), task('b')],
  sections: {
    overdue: [], today: [task('a')], tomorrow: [task('b')],
    next7Days: [], later: [], someday: [], recentDone: [],
  },
} as any;

it('tasks와 모든 섹션에서 해당 태스크만 패치, 불변', () => {
  const next = updateTaskInPlanning(planning, 'a', { status: 'DONE', completedAt: '2026-07-23T15:00:00' });
  expect(next.tasks[0].status).toBe('DONE');
  expect(next.sections.today[0].status).toBe('DONE');
  expect(next.sections.today[0].completedAt).toBe('2026-07-23T15:00:00');
  expect(next.sections.tomorrow[0].status).toBe('TODO');   // 다른 태스크 불변
  expect(planning.tasks[0].status).toBe('TODO');           // 원본 불변
});
