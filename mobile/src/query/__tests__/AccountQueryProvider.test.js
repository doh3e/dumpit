const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { useQuery, useQueryClient } = require('@tanstack/react-query');

const mockAuthContext = React.createContext(null);
const mockToggleRoutine = jest.fn();

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => require('react').useContext(mockAuthContext),
}));
jest.mock('../../api/routines', () => ({
  toggleRoutine: (...args) => mockToggleRoutine(...args),
}));
jest.mock('../../api/settings', () => ({}));

const { AccountQueryProvider } = require('../AccountQueryProvider');
const { buildRoutineToggleHandlers, useToggleRoutine } = require('../routineHooks');
const { keys } = require('../keys');

global.IS_REACT_ACT_ENVIRONMENT = true;

const ACCOUNT_A = { email: 'a@example.com', coins: 10 };
const ACCOUNT_B = { email: 'b@example.com', coins: 20 };

let tree;
let harnessRef;
let queryRef;
let hookRef;

const QueryProbe = React.forwardRef(function QueryProbe(_props, ref) {
  const client = useQueryClient();
  React.useImperativeHandle(ref, () => client, [client]);
  return null;
});

const HookProbe = React.forwardRef(function HookProbe(_props, ref) {
  const { me } = React.useContext(mockAuthContext);
  const client = useQueryClient();
  const observerQuery = useQuery({
    queryKey: ['observer-account'],
    queryFn: async () => `${me?.email ?? 'anonymous'}-render`,
    enabled: false,
  });
  const routineMutation = useToggleRoutine();
  React.useImperativeHandle(ref, () => ({
    client,
    refetch: observerQuery.refetch,
    toggleRoutine: routineMutation.mutate,
  }), [client, observerQuery.refetch, routineMutation.mutate]);
  return null;
});

const Harness = React.forwardRef(function Harness({ initialMe = ACCOUNT_A }, ref) {
  const [me, setMe] = React.useState(initialMe);
  React.useImperativeHandle(ref, () => ({ setMe }), []);
  return (
    <mockAuthContext.Provider value={{ me }}>
      <AccountQueryProvider>
        <QueryProbe ref={queryRef} />
        <HookProbe ref={hookRef} />
      </AccountQueryProvider>
    </mockAuthContext.Provider>
  );
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function renderProvider(initialMe = ACCOUNT_A) {
  await act(async () => {
    tree = create(<Harness ref={harnessRef} initialMe={initialMe} />);
  });
}

async function changeAccount(me) {
  await act(async () => harnessRef.current.setMe(me));
}

beforeEach(() => {
  tree = null;
  harnessRef = React.createRef();
  queryRef = React.createRef();
  hookRef = React.createRef();
  mockToggleRoutine.mockReset();
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

describe('계정 세션 QueryClient 수명', () => {
  it('같은 email refresh는 client와 cache를 보존한다', async () => {
    await renderProvider();
    const first = queryRef.current;
    first.setQueryData(keys.planning, { owner: 'A' });

    await changeAccount({ ...ACCOUNT_A, coins: 99 });

    expect(queryRef.current).toBe(first);
    expect(queryRef.current.getQueryData(keys.planning)).toEqual({ owner: 'A' });
  });

  it('A→B는 빈 client로 교체하고 이전 query cache를 정리한다', async () => {
    await renderProvider();
    const accountAClient = queryRef.current;
    accountAClient.setQueryData(keys.planning, { owner: 'A' });
    await changeAccount(ACCOUNT_B);

    expect(queryRef.current).not.toBe(accountAClient);
    expect(queryRef.current.getQueryData(keys.planning)).toBeUndefined();
    expect(accountAClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('A→logout→A는 익명 cache와 실제 계정 cache도 분리한 새 client를 만든다', async () => {
    await renderProvider();
    const firstAccountClient = queryRef.current;
    firstAccountClient.setQueryData(keys.planning, { owner: 'first A session' });

    await changeAccount(null);
    const anonymousClient = queryRef.current;
    anonymousClient.setQueryData(keys.planning, { owner: 'anonymous' });

    await changeAccount(ACCOUNT_A);

    expect(anonymousClient).not.toBe(firstAccountClient);
    expect(queryRef.current).not.toBe(firstAccountClient);
    expect(queryRef.current).not.toBe(anonymousClient);
    expect(queryRef.current.getQueryData(keys.planning)).toBeUndefined();
    expect(firstAccountClient.getQueryCache().getAll()).toHaveLength(0);
    expect(anonymousClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('Provider unmount는 현재 client를 정리한다', async () => {
    await renderProvider();
    const client = queryRef.current;
    client.setQueryData(keys.planning, { owner: 'A' });

    await act(async () => tree.unmount());
    tree = null;

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('이전 세션 비동기 작업 격리', () => {
  it('실제 useQuery observer는 B 렌더의 refetch 결과를 B client에 저장한다', async () => {
    await renderProvider();
    const accountAClient = queryRef.current;

    await changeAccount(ACCOUNT_B);
    const accountBClient = queryRef.current;
    await act(async () => hookRef.current.refetch());

    expect(accountAClient.getQueryData(['observer-account'])).toBeUndefined();
    expect(accountBClient.getQueryData(['observer-account'])).toBe('b@example.com-render');
  });

  it('A에서 시작한 실제 useToggleRoutine의 늦은 rollback은 B cache를 쓰지 않는다', async () => {
    const gate = deferred();
    mockToggleRoutine.mockReturnValue(gate.promise);
    await renderProvider();
    const accountAClient = queryRef.current;
    accountAClient.setQueryData(keys.routines, [{ routineId: 'same-id', enabled: true }]);
    await act(async () => {
      hookRef.current.toggleRoutine({ routineId: 'same-id', enabled: false });
      await Promise.resolve();
    });

    await changeAccount(ACCOUNT_B);
    const accountBClient = queryRef.current;
    accountBClient.setQueryData(keys.routines, [{ routineId: 'same-id', enabled: false }]);
    await act(async () => {
      gate.reject(new Error('late A failure'));
      await gate.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(accountBClient.getQueryData(keys.routines)).toEqual([
      { routineId: 'same-id', enabled: false },
    ]);
    await act(async () => tree.unmount());
    tree = null;
  });

  it('A의 늦은 fetch 완료는 B cache에 들어오지 않는다', async () => {
    await renderProvider();
    const accountAClient = queryRef.current;
    const gate = deferred();
    const pending = accountAClient.fetchQuery({
      queryKey: keys.planning,
      queryFn: () => gate.promise,
      gcTime: 0,
    });
    const settled = pending.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );

    await changeAccount(ACCOUNT_B);
    const accountBClient = queryRef.current;
    await act(async () => {
      gate.resolve({ owner: 'late A' });
      await settled;
    });

    expect(accountBClient.getQueryData(keys.planning)).toBeUndefined();
    expect(accountAClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('A client를 잡은 mutation callback은 같은 key의 B cache를 롤백하지 않는다', async () => {
    await renderProvider();
    const accountAClient = queryRef.current;
    accountAClient.setQueryData(keys.routines, [{ routineId: 'same-id', enabled: true }]);
    const handlers = buildRoutineToggleHandlers(accountAClient);
    const context = await handlers.onMutate({ routineId: 'same-id', enabled: false });

    await changeAccount(ACCOUNT_B);
    queryRef.current.setQueryData(keys.routines, [{ routineId: 'same-id', enabled: false }]);
    handlers.onError(new Error('late A failure'), { routineId: 'same-id' }, context);

    expect(queryRef.current.getQueryData(keys.routines)).toEqual([
      { routineId: 'same-id', enabled: false },
    ]);
  });
});
