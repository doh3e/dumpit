import { QueryClient } from '@tanstack/react-query';
import type { RoutineResponse } from '../../api/types';
import { buildRoutineToggleHandlers } from '../routineHooks';
import { keys } from '../keys';

// QueryClient gcTime 타이머가 jest 워커를 붙잡지 않도록 정리
const clients: QueryClient[] = [];
const makeClient = () => { const qc = new QueryClient(); clients.push(qc); return qc; };
afterEach(() => { clients.splice(0).forEach((qc) => qc.clear()); });

const routine = (id: string, enabled = true) => ({ routineId: id, enabled }) as RoutineResponse;

it('onMutate가 enabled를 낙관 교체하고, onError가 역패치한다', async () => {
  const qc = makeClient();
  qc.setQueryData(keys.routines, [routine('a', true), routine('b', false)]);
  const h = buildRoutineToggleHandlers(qc);

  const ctx = await h.onMutate({ routineId: 'a', enabled: false });
  let list = qc.getQueryData<RoutineResponse[]>(keys.routines)!;
  expect(list.find((r) => r.routineId === 'a')?.enabled).toBe(false);
  expect(list.find((r) => r.routineId === 'b')?.enabled).toBe(false);

  h.onError(new Error('fail'), { routineId: 'a' }, ctx);
  list = qc.getQueryData<RoutineResponse[]>(keys.routines)!;
  expect(list.find((r) => r.routineId === 'a')?.enabled).toBe(true);
});

it('캐시가 비어 있으면 안전하게 no-op', async () => {
  const qc = makeClient();
  const h = buildRoutineToggleHandlers(qc);
  const ctx = await h.onMutate({ routineId: 'a', enabled: false });
  expect(ctx.prevEnabled).toBeNull();
  h.onError(new Error('fail'), { routineId: 'a' }, ctx); // throw 없이 통과
});
