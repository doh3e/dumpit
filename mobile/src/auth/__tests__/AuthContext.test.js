const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Text } = require('react-native');
const { useQuery, useQueryClient } = require('@tanstack/react-query');

const mockFetchMe = jest.fn();
const mockLoginWithRestoreConfirm = jest.fn();
const mockLogout = jest.fn();
const mockRegisterPushDevice = jest.fn();
const mockUnregisterPushDevice = jest.fn();
const mockClearWidgetMirrors = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();

jest.mock('../../api/auth', () => ({
  fetchMe: (...args) => mockFetchMe(...args),
  loginWithGoogleIdToken: jest.fn(),
  loginWithRestoreConfirm: (...args) => mockLoginWithRestoreConfirm(...args),
  logout: (...args) => mockLogout(...args),
}));
jest.mock('../../api/client', () => ({ api: {} }));
jest.mock('../../api/reauth', () => ({
  bypassReauth: jest.fn(),
  installSilentReauth: jest.fn(),
}));
jest.mock('../../push/fcm', () => ({
  registerPushDevice: (...args) => mockRegisterPushDevice(...args),
  unregisterPushDevice: (...args) => mockUnregisterPushDevice(...args),
}));
jest.mock('../../widget/mirror', () => ({
  clearWidgetMirrors: (...args) => mockClearWidgetMirrors(...args),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(undefined),
    signIn: (...args) => mockGoogleSignIn(...args),
    signInSilently: jest.fn(),
    signOut: (...args) => mockGoogleSignOut(...args),
  },
  isErrorWithCode: () => false,
}));

const { AuthProvider, useAuth } = require('../AuthContext');
const { AccountQueryProvider } = require('../../query/AccountQueryProvider');
const { keys } = require('../../query/keys');

global.IS_REACT_ACT_ENVIRONMENT = true;

const ME_A = {
  email: 'a@example.com',
  name: 'A',
  picture: null,
  coins: 10,
  isAdmin: false,
  equipments: { BACKGROUND: 'bg.ocean' },
};

const ME_B = {
  email: 'a@example.com',
  name: 'A',
  picture: null,
  coins: 20,
  isAdmin: false,
  equipments: { BACKGROUND: 'bg.rose' },
};

const ME_OTHER = {
  ...ME_A,
  email: 'b@example.com',
  name: 'B',
};

let authRef;
let tree;

const AuthProbe = React.forwardRef(function AuthProbe(_props, ref) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const accountQuery = useQuery({
    queryKey: ['auth-account-observer'],
    queryFn: async () => auth.me?.email ?? 'anonymous',
    enabled: false,
  });
  React.useImperativeHandle(ref, () => ({
    ...auth,
    queryClient,
    refetchAccountQuery: accountQuery.refetch,
  }), [accountQuery.refetch, auth, queryClient]);
  return (
    <Text testID="auth-state">
      {JSON.stringify({ me: auth.me, loading: auth.loading })}
    </Text>
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

function authError(status) {
  return { isAxiosError: true, response: { status } };
}

async function renderProvider({ strictMode = false } = {}) {
  await act(async () => {
    tree = create(
      <AuthProvider>
        <AccountQueryProvider>
          <AuthProbe ref={authRef} />
        </AccountQueryProvider>
      </AuthProvider>,
      strictMode ? { unstable_strictMode: true } : undefined,
    );
    await Promise.resolve();
  });
}

function authState() {
  return JSON.parse(tree.root.findByProps({ testID: 'auth-state' }).props.children);
}

async function startRefresh() {
  let request;
  await act(async () => {
    request = authRef.current.refresh();
    await Promise.resolve();
  });
  return { request };
}

async function settle(gate, value, request) {
  await act(async () => {
    gate.resolve(value);
    if (request) await request;
    else await gate.promise;
  });
}

async function fail(gate, error, request) {
  await act(async () => {
    gate.reject(error);
    if (request) await request;
    else await gate.promise.catch(() => undefined);
  });
}

beforeEach(() => {
  authRef = React.createRef();
  tree = null;
  mockFetchMe.mockReset();
  mockLoginWithRestoreConfirm.mockReset();
  mockLogout.mockReset().mockResolvedValue(undefined);
  mockRegisterPushDevice.mockReset().mockResolvedValue(undefined);
  mockUnregisterPushDevice.mockReset().mockResolvedValue(undefined);
  mockClearWidgetMirrors.mockReset().mockResolvedValue(undefined);
  mockGoogleSignIn.mockReset().mockResolvedValue({ type: 'success', data: { idToken: 'native-id-token' } });
  mockGoogleSignOut.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

describe('AuthProvider refresh 세대', () => {
  it('StrictMode effect 재설정에서도 현재 startup refresh를 commit한다', async () => {
    mockFetchMe.mockResolvedValue(ME_A);
    await renderProvider({ strictMode: true });

    expect(authState()).toEqual({ me: ME_A, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('R1→R2로 시작하고 R2→R1로 성공해도 최신 R2 사용자만 유지한다', async () => {
    const r1 = deferred();
    const r2 = deferred();
    mockFetchMe.mockReturnValueOnce(r1.promise).mockReturnValueOnce(r2.promise);
    await renderProvider();
    const { request: request2 } = await startRefresh();

    await settle(r2, ME_B, request2);
    expect(authState()).toEqual({ me: ME_B, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);

    await settle(r1, ME_A);
    expect(authState()).toEqual({ me: ME_B, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('최신 성공 뒤 늦게 끝난 %i은 사용자를 로그아웃하지 않는다', async (status) => {
    const r1 = deferred();
    const r2 = deferred();
    mockFetchMe.mockReturnValueOnce(r1.promise).mockReturnValueOnce(r2.promise);
    await renderProvider();
    const { request: request2 } = await startRefresh();

    await settle(r2, ME_B, request2);
    await fail(r1, authError(status));

    expect(authState()).toEqual({ me: ME_B, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('최신 refresh가 끝나기 전에는 오래된 finally가 startup loading을 끝내지 않는다', async () => {
    const r1 = deferred();
    const r2 = deferred();
    mockFetchMe.mockReturnValueOnce(r1.promise).mockReturnValueOnce(r2.promise);
    await renderProvider();
    const { request: request2 } = await startRefresh();

    await settle(r1, ME_A);
    expect(authState()).toEqual({ me: null, loading: true });
    expect(mockRegisterPushDevice).not.toHaveBeenCalled();

    await settle(r2, ME_B, request2);
    expect(authState()).toEqual({ me: ME_B, loading: false });
  });

  it('최신 401은 로그아웃하고 최신 transient 오류는 기존 사용자를 보존한다', async () => {
    mockFetchMe.mockResolvedValueOnce(ME_A);
    await renderProvider();
    expect(authState().me).toEqual(ME_A);

    mockFetchMe.mockRejectedValueOnce(authError(500));
    await act(async () => authRef.current.refresh());
    expect(authState()).toEqual({ me: ME_A, loading: false });

    mockFetchMe.mockRejectedValueOnce(authError(401));
    await act(async () => authRef.current.refresh());
    expect(authState()).toEqual({ me: null, loading: false });
  });
});

describe('AuthProvider 인증 경계', () => {
  it('명시적 로그아웃 뒤 다른 계정 로그인은 이전 planning cache를 읽지 않는다', async () => {
    mockFetchMe.mockResolvedValue(ME_A);
    mockLoginWithRestoreConfirm.mockResolvedValue({ ...ME_OTHER, restored: false });
    await renderProvider();
    const accountAClient = authRef.current.queryClient;
    accountAClient.setQueryData(keys.planning, { tasks: [{ title: 'A 작업' }] });

    await act(async () => authRef.current.signOut());
    await act(async () => authRef.current.signInWithGoogle());
    await act(async () => authRef.current.refetchAccountQuery());

    expect(authState().me.email).toBe(ME_OTHER.email);
    expect(authRef.current.queryClient).not.toBe(accountAClient);
    expect(authRef.current.queryClient.getQueryData(keys.planning)).toBeUndefined();
    expect(authRef.current.queryClient.getQueryData(['auth-account-observer'])).toBe(ME_OTHER.email);
    expect(accountAClient.getQueryData(['auth-account-observer'])).toBeUndefined();
    expect(accountAClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('로그인 성공은 이전 refresh를 무효화해 늦은 사용자와 push 등록을 막는다', async () => {
    const startup = deferred();
    mockFetchMe.mockReturnValue(startup.promise);
    mockLoginWithRestoreConfirm.mockResolvedValue({ ...ME_B, restored: false });
    await renderProvider();

    await act(async () => authRef.current.signInWithGoogle());
    expect(authState()).toEqual({ me: ME_B, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);

    await settle(startup, ME_A);
    expect(authState()).toEqual({ me: ME_B, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('로그아웃 시작은 이전 refresh를 무효화해 늦은 사용자가 되살아나지 않게 한다', async () => {
    const startup = deferred();
    mockFetchMe.mockReturnValue(startup.promise);
    await renderProvider();

    await act(async () => authRef.current.signOut());
    expect(authState()).toEqual({ me: null, loading: false });

    await settle(startup, ME_A);
    expect(authState()).toEqual({ me: null, loading: false });
    expect(mockRegisterPushDevice).not.toHaveBeenCalled();
    expect(mockUnregisterPushDevice).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockGoogleSignOut).toHaveBeenCalledTimes(1);
  });

  it('로그아웃 처리 중 시작된 refresh도 최종 로그아웃 상태를 덮지 않는다', async () => {
    const unregister = deferred();
    const duringLogout = deferred();
    mockFetchMe.mockResolvedValueOnce(ME_A).mockReturnValueOnce(duringLogout.promise);
    mockUnregisterPushDevice.mockReturnValue(unregister.promise);
    await renderProvider();

    let signOut;
    await act(async () => {
      signOut = authRef.current.signOut();
      await Promise.resolve();
    });
    const { request } = await startRefresh();

    await act(async () => {
      unregister.resolve();
      await signOut;
    });
    expect(authState()).toEqual({ me: null, loading: false });

    await settle(duringLogout, ME_A, request);
    expect(authState()).toEqual({ me: null, loading: false });
    expect(mockRegisterPushDevice).toHaveBeenCalledTimes(1);
  });

  it('Provider unmount 뒤 끝난 refresh는 상태와 push를 commit하지 않는다', async () => {
    const startup = deferred();
    mockFetchMe.mockReturnValue(startup.promise);
    await renderProvider();

    await act(async () => tree.unmount());
    tree = null;
    await settle(startup, ME_A);

    expect(mockRegisterPushDevice).not.toHaveBeenCalled();
  });
});
