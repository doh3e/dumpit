const { beforeEach, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');

let mockMe;
let mockObservedClient;
let mockRootRefetch;
const mockMirrorConfig = jest.fn();
const mockInitPushHandlers = jest.fn();
const mockPushCleanup = jest.fn();
const mockPushRouter = {};
const mockCanDismiss = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetModalProvider: ({ children }) => children }));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-router', () => ({
  router: {
    canDismiss: (...args) => mockCanDismiss(...args),
    dismissAll: (...args) => mockDismissAll(...args),
    replace: (...args) => mockReplace(...args),
  },
  Stack: () => null,
  useRouter: () => mockPushRouter,
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: ({ children }) => children }));
jest.mock('../a11y/SheetA11yContext', () => ({
  SheetA11yProvider: ({ children }) => children,
  SheetA11yScreenHost: ({ children }) => children,
}));
jest.mock('../auth/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ me: mockMe, loading: false }),
}));
jest.mock('../components/retro/ToastProvider', () => ({ ToastProvider: ({ children }) => children }));
jest.mock('../components/shell/AppBackground', () => ({
  AppBackground: () => {
    const { useQuery, useQueryClient } = require('@tanstack/react-query');
    mockObservedClient = useQueryClient();
    mockRootRefetch = useQuery({
      queryKey: ['root-observer'],
      queryFn: async () => `${mockMe.email}-render`,
      enabled: false,
    }).refetch;
    return null;
  },
}));
jest.mock('../push/fcm', () => ({ initPushHandlers: (...args) => mockInitPushHandlers(...args) }));
jest.mock('../theme/ThemeProvider', () => ({ ThemeProvider: ({ children }) => children }));
jest.mock('../theme/useTheme', () => ({ useTheme: () => ({ scheme: 'light' }) }));
jest.mock('../widget/mirror', () => ({ mirrorConfig: (...args) => mockMirrorConfig(...args) }));
jest.mock('../widget/todayMirror', () => ({ installTodayMirror: () => jest.fn() }));

const RootLayout = require('../../app/_layout').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockMe = { email: 'a@example.com' };
  mockObservedClient = null;
  mockRootRefetch = null;
  mockMirrorConfig.mockReset().mockResolvedValue(undefined);
  mockInitPushHandlers.mockReset().mockReturnValue(mockPushCleanup);
  mockPushCleanup.mockReset();
  mockCanDismiss.mockReset().mockReturnValue(false);
  mockDismissAll.mockReset();
  mockReplace.mockReset();
});

it('RootLayout은 계정 query를 교체해도 앱 수명 push handler는 한 번만 유지한다', async () => {
  let tree;
  await act(async () => { tree = create(<RootLayout />); });
  const accountAClient = mockObservedClient;
  accountAClient.setQueryData(['planning'], { owner: 'A' });
  expect(mockInitPushHandlers).toHaveBeenCalledTimes(1);
  expect(mockInitPushHandlers).toHaveBeenCalledWith(mockPushRouter);

  mockMe = { email: 'a@example.com', coins: 10 };
  await act(async () => tree.update(<RootLayout />));
  expect(mockObservedClient).toBe(accountAClient);

  mockMe = { email: 'b@example.com' };
  await act(async () => tree.update(<RootLayout />));
  const accountBClient = mockObservedClient;
  await act(async () => mockRootRefetch());

  expect(accountBClient).not.toBe(accountAClient);
  expect(accountBClient.getQueryData(['planning'])).toBeUndefined();
  expect(accountBClient.getQueryData(['root-observer'])).toBe('b@example.com-render');
  expect(accountAClient.getQueryData(['root-observer'])).toBeUndefined();
  expect(accountAClient.getQueryCache().getAll()).toHaveLength(0);

  mockMe = { email: 'a@example.com' };
  await act(async () => tree.update(<RootLayout />));
  const secondAccountAClient = mockObservedClient;
  expect(secondAccountAClient).not.toBe(accountBClient);

  mockMe = null;
  await act(async () => tree.update(<RootLayout />));
  const anonymousClient = mockObservedClient;
  expect(anonymousClient).not.toBe(secondAccountAClient);
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/');

  mockMe = { email: 'a@example.com' };
  await act(async () => tree.update(<RootLayout />));
  expect(mockObservedClient).not.toBe(anonymousClient);
  expect(mockInitPushHandlers).toHaveBeenCalledTimes(1);
  expect(mockPushCleanup).not.toHaveBeenCalled();
  expect(mockMirrorConfig).toHaveBeenCalledTimes(1);

  await act(async () => tree.unmount());
  expect(mockPushCleanup).toHaveBeenCalledTimes(1);
});
