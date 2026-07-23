import { QueryClient } from '@tanstack/react-query';
import { buildToggleHandlers } from '../hooks';
import { keys } from '../keys';

jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ refresh: jest.fn() }) }));

// QueryClient gcTime 타이머가 jest 워커를 붙잡지 않도록 정리
const clients: QueryClient[] = [];
const makeClient = () => { const qc = new QueryClient(); clients.push(qc); return qc; };
afterEach(() => { clients.splice(0).forEach((qc) => qc.clear()); });

const task = (id: string, status = 'TODO') => ({ taskId: id, status, completedAt: null }) as any;
const makePlanning = () => ({
  tasks: [task('a'), task('b')],
  sections: {
    overdue: [], today: [task('a'), task('b')], tomorrow: [],
    next7Days: [], later: [], someday: [], recentDone: [],
  },
}) as any;

it('onMutate가 캐시를 낙관적으로 DONE 처리하고, onError가 롤백한다', async () => {
  const qc = makeClient();
  qc.setQueryData(keys.planning, makePlanning());
  const h = buildToggleHandlers(qc);

  const ctx = await h.onMutate({ taskId: 'a', status: 'DONE' });
  const optimistic = qc.getQueryData(keys.planning) as any;
  expect(optimistic.sections.today[0].status).toBe('DONE');
  expect(optimistic.sections.today[0].completedAt).toBeTruthy();
  expect(optimistic.tasks[0].status).toBe('DONE');

  h.onError(new Error('fail'), { taskId: 'a' }, ctx);
  const rolled = qc.getQueryData(keys.planning) as any;
  expect(rolled.sections.today[0].status).toBe('TODO');
  expect(rolled.sections.today[0].completedAt).toBeNull();
});

it('A 롤백이 B의 낙관 상태를 되돌리지 않는다 (태스크 단위 역패치)', async () => {
  const qc = makeClient();
  qc.setQueryData(keys.planning, makePlanning());
  const h = buildToggleHandlers(qc);

  const ctxA = await h.onMutate({ taskId: 'a', status: 'DONE' });
  await h.onMutate({ taskId: 'b', status: 'DONE' });

  h.onError(new Error('fail'), { taskId: 'a' }, ctxA);
  const after = qc.getQueryData(keys.planning) as any;
  expect(after.sections.today[0].status).toBe('TODO');   // a 롤백
  expect(after.sections.today[1].status).toBe('DONE');   // b 낙관 상태 유지
});

it('캐시가 비어 있으면 onMutate가 안전하게 no-op', async () => {
  const qc = makeClient();
  const h = buildToggleHandlers(qc);
  const ctx = await h.onMutate({ taskId: 'a', status: 'DONE' });
  expect(ctx.prevTask).toBeNull();
  h.onError(new Error('fail'), { taskId: 'a' }, ctx);   // throw 없이 통과해야 함
});
