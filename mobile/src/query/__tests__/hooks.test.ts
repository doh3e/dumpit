import { QueryClient } from '@tanstack/react-query';
import { buildToggleHandlers } from '../hooks';
import { keys } from '../keys';

jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ refresh: jest.fn() }) }));

// QueryClient gcTime 타이머가 jest 워커를 붙잡지 않도록 정리
const clients: QueryClient[] = [];
const makeClient = () => { const qc = new QueryClient(); clients.push(qc); return qc; };
afterEach(() => { clients.splice(0).forEach((qc) => qc.clear()); });

const planning = {
  tasks: [{ taskId: 'a', status: 'TODO' }],
  sections: {
    overdue: [], today: [{ taskId: 'a', status: 'TODO' }], tomorrow: [],
    next7Days: [], later: [], someday: [], recentDone: [],
  },
} as any;

it('onMutate가 캐시를 낙관적으로 DONE 처리하고, onError가 롤백한다', async () => {
  const qc = makeClient();
  qc.setQueryData(keys.planning, planning);
  const h = buildToggleHandlers(qc);

  const ctx = await h.onMutate({ taskId: 'a', status: 'DONE' });
  const optimistic = qc.getQueryData(keys.planning) as any;
  expect(optimistic.sections.today[0].status).toBe('DONE');
  expect(optimistic.sections.today[0].completedAt).toBeTruthy();
  expect(optimistic.tasks[0].status).toBe('DONE');

  h.onError(new Error('fail'), undefined, ctx);
  expect((qc.getQueryData(keys.planning) as any).sections.today[0].status).toBe('TODO');
});

it('캐시가 비어 있으면 onMutate가 안전하게 no-op', async () => {
  const qc = makeClient();
  const h = buildToggleHandlers(qc);
  const ctx = await h.onMutate({ taskId: 'a', status: 'DONE' });
  expect(ctx.prev).toBeUndefined();
  h.onError(new Error('fail'), undefined, ctx);   // throw 없이 통과해야 함
});
