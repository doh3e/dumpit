const { afterEach, beforeEach, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { useQueryClient } = require('@tanstack/react-query');

const mockMirrorConfig = jest.fn();
const mockMirrorHero = jest.fn();
const mockAuthContext = React.createContext(null);

jest.mock('../mirror', () => ({
  mirrorConfig: (...args) => mockMirrorConfig(...args),
  mirrorHero: (...args) => mockMirrorHero(...args),
}));
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => require('react').useContext(mockAuthContext),
}));

const { AccountQueryProvider } = require('../../query/AccountQueryProvider');
const { keys } = require('../../query/keys');

const { WidgetConfigGate, WidgetMirrorGate } = require('../WidgetMirrorGate');

global.IS_REACT_ACT_ENVIRONMENT = true;

let tree;
let harnessRef;
let queryRef;

const QueryProbe = React.forwardRef(function QueryProbe(_props, ref) {
  const client = useQueryClient();
  React.useImperativeHandle(ref, () => client, [client]);
  return null;
});

const Harness = React.forwardRef(function Harness(_props, ref) {
  const [me, setMe] = React.useState({ email: 'a@example.com' });
  React.useImperativeHandle(ref, () => ({ setMe }), []);
  return (
    <mockAuthContext.Provider value={{ me }}>
      <WidgetConfigGate />
      <AccountQueryProvider>
        <QueryProbe ref={queryRef} />
        {WidgetMirrorGate && <WidgetMirrorGate />}
      </AccountQueryProvider>
    </mockAuthContext.Provider>
  );
});

beforeEach(() => {
  tree = null;
  harnessRef = React.createRef();
  queryRef = React.createRef();
  mockMirrorConfig.mockReset().mockResolvedValue(undefined);
  mockMirrorHero.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

it('계정 client 교체 시 이전 planning 구독을 끊고 새 client만 구독한다', async () => {
  await act(async () => { tree = create(<Harness ref={harnessRef} />); });
  const accountAClient = queryRef.current;

  accountAClient.setQueryData(keys.planning, { tasks: [{ taskId: 'a' }] });
  expect(mockMirrorHero).toHaveBeenCalledTimes(1);

  await act(async () => harnessRef.current.setMe({ email: 'a@example.com', coins: 10 }));
  expect(queryRef.current).toBe(accountAClient);

  await act(async () => harnessRef.current.setMe({ email: 'b@example.com' }));
  const accountBClient = queryRef.current;
  accountAClient.setQueryData(keys.planning, { tasks: [{ taskId: 'late-a' }] });
  accountBClient.setQueryData(keys.planning, { tasks: [{ taskId: 'b' }] });

  expect(mockMirrorConfig).toHaveBeenCalledTimes(1);
  expect(mockMirrorHero).toHaveBeenCalledTimes(2);
  expect(mockMirrorHero.mock.calls[1][0].tasks[0].taskId).toBe('b');

  await act(async () => tree.unmount());
  tree = null;
  accountBClient.setQueryData(keys.planning, { tasks: [{ taskId: 'after-unmount' }] });
  expect(mockMirrorHero).toHaveBeenCalledTimes(2);
  accountAClient.clear();
  accountBClient.clear();
});
