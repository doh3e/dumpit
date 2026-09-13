const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const { Alert, ScrollView, StyleSheet, Text, TextInput } = require('react-native');

const mockPatchSettings = jest.fn();
const mockFetchSettings = jest.fn();
const mockDismiss = jest.fn();
const mockToast = { show: jest.fn(), error: jest.fn() };
const mockAuthState = { me: null, loading: false, signOut: jest.fn() };
let mockWindowWidth = 320;

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 800, scale: 1, fontScale: 1 }),
}));

jest.mock('../api/settings', () => ({
  fetchSettings: (...args) => mockFetchSettings(...args),
  patchSettings: (...args) => mockPatchSettings(...args),
}));
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
jest.mock('../widget/mirror', () => ({ mirrorTheme: jest.fn(async () => {}) }));
jest.mock('../components/retro/ToastProvider', () => ({ useToast: () => mockToast }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Modal = React.forwardRef(function Modal({ children, onChange, onDismiss, ...props }, ref) {
    const [open, setOpen] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => { setOpen(true); onChange?.(0); },
      dismiss: () => { setOpen(false); onChange?.(-1); onDismiss?.(); mockDismiss(); },
    }));
    return <View testID="settings-bottom-sheet" accessibilityState={{ expanded: open }} onDismiss={onDismiss} {...props}>{children}</View>;
  });
  const Scroll = ({ children, ...props }) => <View {...props}>{children}</View>;
  return { BottomSheetModal: Modal, BottomSheetScrollView: Scroll };
});

const { useSaveSettings, useUserSettings } = require('../query/routineHooks');
const { keys } = require('../query/keys');
const { ThemeProvider, useA11yPrefs, useThemeMode } = require('../theme/ThemeProvider');
const { useTheme } = require('../theme/useTheme');
const { palettes } = require('../theme/tokens');
const SettingsScreen = require('../../app/settings').default;
const { ActiveHoursCard } = require('../components/routine/ActiveHoursCard');
const { NotificationSettingsCard } = require('../components/settings/NotificationSettingsCard');

global.IS_REACT_ACT_ENVIRONMENT = true;

const clients = [];
const settings = (patch = {}) => ({
  routineStartHour: 9,
  routineEndHour: 22,
  notificationsEnabled: true,
  notificationThresholds: [60],
  briefingEnabled: true,
  aiMemory: null,
  ...patch,
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

function makeClient(initial = settings()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(keys.settings, initial);
  clients.push(client);
  return client;
}

function makeEmptyClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return client;
}

const SaveProbe = React.forwardRef(function SaveProbe(_props, ref) {
  const save = useSaveSettings();
  React.useImperativeHandle(ref, () => save, [save]);
  return null;
});

function SettingsQueryProbe() {
  useUserSettings();
  return null;
}

const ThemePreferenceProbe = React.forwardRef(function ThemePreferenceProbe(_props, ref) {
  const theme = useThemeMode();
  const a11y = useA11yPrefs();
  React.useImperativeHandle(ref, () => ({ ...theme, ...a11y }), [theme, a11y]);
  return null;
});

const ThemeVisualProbe = React.forwardRef(function ThemeVisualProbe(_props, ref) {
  const theme = useTheme();
  React.useImperativeHandle(ref, () => theme, [theme]);
  return null;
});

async function renderConsumers(client, refs) {
  let tree;
  await act(async () => {
    tree = create(
      <QueryClientProvider client={client}>
        {refs.map((ref, index) => <SaveProbe key={index} ref={ref} />)}
      </QueryClientProvider>,
    );
  });
  return tree;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function control(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label,
  );
}

function texts(tree, value) {
  return tree.root.findAll((node) => node.type === Text && node.props.children === value);
}

async function renderWithProviders(client, element) {
  let tree;
  await act(async () => {
    tree = create(
      <QueryClientProvider client={client}>
        <ThemeProvider>{element}</ThemeProvider>
      </QueryClientProvider>,
    );
  });
  return tree;
}

beforeEach(() => {
  mockPatchSettings.mockReset();
  mockFetchSettings.mockReset().mockResolvedValue(settings());
  AsyncStorage.getItem.mockReset().mockResolvedValue(null);
  AsyncStorage.setItem.mockReset().mockResolvedValue(undefined);
  AsyncStorage.removeItem.mockReset().mockResolvedValue(undefined);
  mockDismiss.mockReset();
  mockToast.show.mockReset();
  mockToast.error.mockReset();
  mockAuthState.me = null;
  mockAuthState.loading = false;
  mockAuthState.signOut.mockReset();
  mockWindowWidth = 320;
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(async () => {
  clients.splice(0).forEach((client) => {
    client.getMutationCache().getAll().forEach((mutation) => mutation.destroy());
    client.clear();
  });
  jest.restoreAllMocks();
});

describe('설정 PATCH 직렬화와 계정 경계', () => {
  it('서로 다른 hook 소비자 요청을 순서대로 전송하고 마지막 전체 응답을 캐시에 남긴다', async () => {
    const first = deferred();
    const second = deferred();
    mockPatchSettings
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const client = makeClient();
    const notification = React.createRef();
    const activeHours = React.createRef();
    const tree = await renderConsumers(client, [notification, activeHours]);

    let firstSave;
    let secondSave;
    await act(async () => {
      firstSave = notification.current.mutateAsync({ notificationsEnabled: false });
      secondSave = activeHours.current.mutateAsync({ routineStartHour: 8 });
      await Promise.resolve();
    });

    expect(mockPatchSettings).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.resolve(settings({ notificationsEnabled: false }));
      await firstSave;
    });
    expect(mockPatchSettings).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.resolve(settings({ notificationsEnabled: false, routineStartHour: 8 }));
      await secondSave;
    });

    expect(mockPatchSettings.mock.calls).toEqual([
      [{ notificationsEnabled: false }],
      [{ routineStartHour: 8 }],
    ]);
    expect(client.getQueryData(keys.settings)).toEqual(settings({
      notificationsEnabled: false,
      routineStartHour: 8,
    }));
    await act(async () => tree.unmount());
  });

  it('A에서 대기하던 요청은 unmount 뒤 B 쿠키로 전송하거나 어느 캐시·callback도 갱신하지 않는다', async () => {
    const sentFromA = deferred();
    let cookieAccount = 'A';
    const sentAccounts = [];
    mockPatchSettings.mockImplementation((patch) => {
      sentAccounts.push(cookieAccount);
      if (patch.notificationsEnabled === false) return sentFromA.promise;
      return Promise.resolve(settings({ routineStartHour: 7 }));
    });
    const clientA = makeClient(settings({ routineStartHour: 10 }));
    const firstA = React.createRef();
    const queuedA = React.createRef();
    const treeA = await renderConsumers(clientA, [firstA, queuedA]);
    const staleSuccess = jest.fn();
    const staleError = jest.fn();

    let firstPromise;
    let queuedPromise;
    await act(async () => {
      firstPromise = firstA.current.mutateAsync(
        { notificationsEnabled: false },
        { onSuccess: staleSuccess, onError: staleError },
      );
      queuedPromise = queuedA.current.mutateAsync(
        { routineStartHour: 23 },
        { onSuccess: staleSuccess, onError: staleError },
      );
      await Promise.resolve();
    });
    expect(mockPatchSettings).toHaveBeenCalledTimes(1);
    await act(async () => treeA.unmount());

    cookieAccount = 'B';
    const clientB = makeClient(settings({ routineStartHour: 6 }));
    const saveB = React.createRef();
    const treeB = await renderConsumers(clientB, [saveB]);
    await act(async () => {
      await saveB.current.mutateAsync({ routineStartHour: 7 });
    });
    sentFromA.resolve(settings({ notificationsEnabled: false, routineStartHour: 10 }));

    await expect(firstPromise).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' });
    await expect(queuedPromise).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' });
    await flush();

    expect(sentAccounts).toEqual(['A', 'B']);
    expect(clientA.getQueryData(keys.settings)).toEqual(settings({ routineStartHour: 10 }));
    expect(clientB.getQueryData(keys.settings)).toEqual(settings({ routineStartHour: 7 }));
    expect(staleSuccess).not.toHaveBeenCalled();
    expect(staleError).not.toHaveBeenCalled();
    await act(async () => treeB.unmount());
  });

  it('queue 요청 하나가 실패해도 다음 정상 저장은 막히지 않는다', async () => {
    mockPatchSettings
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce(settings({ routineStartHour: 8 }));
    const client = makeClient();
    const first = React.createRef();
    const second = React.createRef();
    const tree = await renderConsumers(client, [first, second]);

    const failed = first.current.mutateAsync({ notificationsEnabled: false });
    const succeeded = second.current.mutateAsync({ routineStartHour: 8 });

    await expect(failed).rejects.toThrow('first failed');
    await expect(succeeded).resolves.toEqual(settings({ routineStartHour: 8 }));
    expect(mockPatchSettings).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(keys.settings)).toEqual(settings({ routineStartHour: 8 }));
    await act(async () => tree.unmount());
  });

  it('진행 중이던 settings GET은 PATCH acknowledgement 뒤 캐시를 덮지 않는다', async () => {
    const staleLoad = deferred();
    mockFetchSettings.mockReturnValueOnce(staleLoad.promise);
    mockPatchSettings.mockResolvedValueOnce(settings({ routineStartHour: 8 }));
    const client = makeClient();
    const save = React.createRef();
    let tree;
    await act(async () => {
      tree = create(
        <QueryClientProvider client={client}>
          <SettingsQueryProbe />
          <SaveProbe ref={save} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
    expect(mockFetchSettings).toHaveBeenCalledTimes(1);

    await act(async () => {
      await save.current.mutateAsync({ routineStartHour: 8 });
    });
    staleLoad.resolve(settings({ routineStartHour: 23 }));
    await flush();

    expect(client.getQueryData(keys.settings)).toEqual(settings({ routineStartHour: 8 }));
    await act(async () => tree.unmount());
  });

  it('PATCH 중 새로 시작한 settings GET도 acknowledgement 뒤 캐시를 덮지 않는다', async () => {
    const patch = deferred();
    const staleLoad = deferred();
    mockPatchSettings.mockReturnValueOnce(patch.promise);
    const client = makeClient();
    const save = React.createRef();
    let tree;
    await act(async () => {
      tree = create(
        <QueryClientProvider client={client}>
          <SettingsQueryProbe />
          <SaveProbe ref={save} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
    await flush();
    mockFetchSettings.mockReturnValueOnce(staleLoad.promise);

    let saving;
    await act(async () => {
      saving = save.current.mutateAsync({ routineStartHour: 8 });
      await Promise.resolve();
    });
    expect(mockPatchSettings).toHaveBeenCalledTimes(1);

    const refetching = client.refetchQueries({ queryKey: keys.settings });
    await act(async () => {
      patch.resolve(settings({ routineStartHour: 8 }));
      await saving;
    });
    await act(async () => {
      staleLoad.resolve(settings({ routineStartHour: 23 }));
      await refetching;
    });

    expect(client.getQueryData(keys.settings)).toEqual(settings({ routineStartHour: 8 }));
    await act(async () => tree.unmount());
  });
});

describe('기기 설정 persistence acknowledgement', () => {
  it('로그아웃 후 늦게 완료된 이전 계정 스킨 cache 읽기를 표시하지 않는다', async () => {
    const equipmentRead = deferred();
    AsyncStorage.getItem.mockImplementation((key) => (
      key === 'dumpit_equipments' ? equipmentRead.promise : Promise.resolve(null)
    ));
    mockAuthState.loading = true;
    const probe = React.createRef();
    let tree;
    await act(async () => {
      tree = create(<ThemeProvider><ThemeVisualProbe ref={probe} /></ThemeProvider>);
    });

    mockAuthState.me = { email: 'a@example.com', equipments: { BACKGROUND: 'bg.ocean' } };
    mockAuthState.loading = false;
    await act(async () => {
      tree.update(<ThemeProvider><ThemeVisualProbe ref={probe} /></ThemeProvider>);
    });
    mockAuthState.me = null;
    await act(async () => {
      tree.update(<ThemeProvider><ThemeVisualProbe ref={probe} /></ThemeProvider>);
    });

    await act(async () => {
      equipmentRead.resolve(JSON.stringify({ BACKGROUND: 'bg.ocean' }));
      await equipmentRead.promise;
    });
    expect(probe.current.colors.bg).toBe(palettes.light.bg);
    await act(async () => tree.unmount());
  });

  it('StrictMode의 폐기된 첫 hydration은 현재 mount의 저장 대기를 풀거나 baseline을 바꾸지 않는다', async () => {
    const firstRead = deferred();
    const currentRead = deferred();
    let modeReads = 0;
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key !== 'dumpit_theme_mode') return Promise.resolve(null);
      modeReads += 1;
      return modeReads === 1 ? firstRead.promise : currentRead.promise;
    });
    const probe = React.createRef();
    let tree;
    await act(async () => {
      tree = create(
        <React.StrictMode>
          <ThemeProvider><ThemePreferenceProbe ref={probe} /></ThemeProvider>
        </React.StrictMode>,
      );
    });
    expect(modeReads).toBe(2);

    const saving = probe.current.setMode('light');
    await act(async () => {
      firstRead.resolve('dark');
      await Promise.resolve();
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('dumpit_theme_mode', 'light');

    await act(async () => {
      currentRead.resolve('system');
      await saving;
    });
    expect(probe.current.mode).toBe('light');
    await act(async () => tree.unmount());
  });

  it('hydration 중 요청은 저장값을 확인한 뒤 실행하고 실패하면 저장값으로 복원한다', async () => {
    const modeRead = deferred();
    AsyncStorage.getItem.mockImplementation((key) => (
      key === 'dumpit_theme_mode' ? modeRead.promise : Promise.resolve(null)
    ));
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));
    const probe = React.createRef();
    let tree;
    await act(async () => {
      tree = create(<ThemeProvider><ThemePreferenceProbe ref={probe} /></ThemeProvider>);
    });

    let saving;
    await act(async () => {
      saving = probe.current.setMode('light');
      await Promise.resolve();
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('dumpit_theme_mode', 'light');

    await act(async () => {
      modeRead.resolve('dark');
      await expect(saving).rejects.toThrow('storage full');
    });

    expect(probe.current.mode).toBe('dark');
    await act(async () => tree.unmount());
  });

  it('늦은 초기 읽기는 그 뒤 성공한 저장을 덮지 않는다', async () => {
    const modeRead = deferred();
    AsyncStorage.getItem.mockImplementation((key) => (
      key === 'dumpit_theme_mode' ? modeRead.promise : Promise.resolve(null)
    ));
    const probe = React.createRef();
    let tree;
    await act(async () => {
      tree = create(<ThemeProvider><ThemePreferenceProbe ref={probe} /></ThemeProvider>);
    });

    let saving;
    await act(async () => {
      saving = probe.current.setMode('light');
      modeRead.resolve('dark');
      await saving;
    });

    expect(probe.current.mode).toBe('light');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('dumpit_theme_mode', 'light');
    await act(async () => tree.unmount());
  });

  it('같은 키의 앞 저장 실패가 뒤의 성공값을 rollback하지 않는다', async () => {
    const firstWrite = deferred();
    AsyncStorage.setItem
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValueOnce(undefined);
    const probe = React.createRef();
    let tree;
    await act(async () => {
      tree = create(<ThemeProvider><ThemePreferenceProbe ref={probe} /></ThemeProvider>);
    });

    let first;
    let second;
    await act(async () => {
      first = probe.current.setMode('light').catch((error) => error);
      second = probe.current.setMode('dark');
      await Promise.resolve();
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstWrite.reject(new Error('first failed'));
      await first;
      await second;
    });

    expect(AsyncStorage.setItem.mock.calls.slice(0, 2)).toEqual([
      ['dumpit_theme_mode', 'light'],
      ['dumpit_theme_mode', 'dark'],
    ]);
    expect(probe.current.mode).toBe('dark');
    await act(async () => tree.unmount());
  });
});

describe('설정 화면 저장·취소 의미', () => {
  it('창 크기 변경 중 dirty 활동 시간을 보존하고 취소·저장 의미를 유지한다', async () => {
    mockPatchSettings.mockResolvedValueOnce(settings({ routineStartHour: 10 }));
    const client = makeClient();
    const screen = () => (
      <QueryClientProvider client={client}>
        <ThemeProvider><SettingsScreen /></ThemeProvider>
      </QueryClientProvider>
    );
    const tree = await renderWithProviders(client, <SettingsScreen />);

    await act(async () => control(tree, '변경').props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    mockWindowWidth = 1200;
    await act(async () => tree.update(screen()));
    expect(StyleSheet.flatten(tree.root.findByType(ScrollView).props.contentContainerStyle))
      .toEqual(expect.objectContaining({ paddingLeft: 236, paddingRight: 236 }));
    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);

    mockWindowWidth = 600;
    await act(async () => tree.update(screen()));
    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);
    await act(async () => control(tree, '활동 시간 취소').props.onPress());
    await act(async () => control(tree, '변경').props.onPress());
    expect(control(tree, '시작 9시').props.accessibilityState.selected).toBe(true);

    await act(async () => control(tree, '시작 10시').props.onPress());
    mockWindowWidth = 1200;
    await act(async () => tree.update(screen()));
    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    await flush();

    expect(mockPatchSettings).toHaveBeenCalledTimes(1);
    expect(mockPatchSettings).toHaveBeenCalledWith(expect.objectContaining({ routineStartHour: 10 }));
    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);
    await act(async () => tree.unmount());
  });

  it('같은 계정의 새 me 객체는 탈퇴 확인을 유지하고 계정 전환만 초기화한다', async () => {
    mockAuthState.me = { email: 'a@example.com' };
    const client = makeClient();
    const tree = await renderWithProviders(client, <SettingsScreen />);

    await act(async () => control(tree, '회원 탈퇴').props.onPress());
    const buttons = Alert.alert.mock.calls.at(-1)[2];
    await act(async () => buttons.find((button) => button.text === '계속').onPress());
    const withdrawalInputs = () => tree.root.findAll(
      (node) => node.type === TextInput && node.props.accessibilityLabel === '탈퇴 확인 입력',
    );
    expect(withdrawalInputs()).toHaveLength(1);

    mockAuthState.me = { email: 'a@example.com', coins: 10 };
    await act(async () => {
      tree.update(<QueryClientProvider client={client}><ThemeProvider><SettingsScreen /></ThemeProvider></QueryClientProvider>);
    });
    expect(withdrawalInputs()).toHaveLength(1);

    mockAuthState.me = { email: 'b@example.com' };
    await act(async () => {
      tree.update(<QueryClientProvider client={client}><ThemeProvider><SettingsScreen /></ThemeProvider></QueryClientProvider>);
    });
    expect(withdrawalInputs()).toHaveLength(0);
    expect(control(tree, '회원 탈퇴')).toBeTruthy();
    await act(async () => tree.unmount());
  });

  it('테마는 persistence 완료 뒤에만 저장 성공을 알리고 실패하면 이전 성공값으로 복원한다', async () => {
    const firstWrite = deferred();
    AsyncStorage.setItem
      .mockReturnValueOnce(firstWrite.promise)
      .mockRejectedValueOnce(new Error('storage full'));
    const client = makeClient();
    const tree = await renderWithProviders(client, <SettingsScreen />);

    await act(async () => {
      void control(tree, '라이트').props.onPress();
      await Promise.resolve();
    });
    expect(texts(tree, '이 기기에 저장했어요.')).toHaveLength(0);
    expect(control(tree, '다크').props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      firstWrite.resolve();
      await Promise.resolve();
    });
    expect(texts(tree, '이 기기에 저장했어요.')).toHaveLength(1);

    await act(async () => {
      void control(tree, '다크').props.onPress();
      await Promise.resolve();
    });
    await flush();
    expect(texts(tree, '이 기기에 저장하지 못했어요.')).toHaveLength(1);
    expect(control(tree, '라이트').props.accessibilityState.selected).toBe(true);
    await act(async () => tree.unmount());
  });

  it('활동 시간 취소와 sheet dismiss는 draft만 버리고 재진입 때 마지막 서버값을 복원한다', async () => {
    const client = makeClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    await act(async () => control(tree, '변경').props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => control(tree, '활동 시간 취소').props.onPress());
    expect(mockPatchSettings).not.toHaveBeenCalled();

    await act(async () => control(tree, '변경').props.onPress());
    expect(control(tree, '시작 9시').props.accessibilityState.selected).toBe(true);
    await act(async () => control(tree, '시작 10시').props.onPress());
    const sheet = tree.root.findByProps({ testID: 'settings-bottom-sheet' });
    await act(async () => sheet.props.onDismiss());
    await act(async () => control(tree, '변경').props.onPress());
    expect(control(tree, '시작 9시').props.accessibilityState.selected).toBe(true);
    await act(async () => tree.unmount());
  });

  it('활동 시간 sheet는 변경이 없어도 명시적 취소로 닫고 PATCH를 보내지 않는다', async () => {
    const client = makeClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    await act(async () => control(tree, '변경').props.onPress());
    const cancel = control(tree, '활동 시간 취소');
    expect(cancel.props.accessibilityState.disabled).toBe(false);
    await act(async () => cancel.props.onPress());

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockPatchSettings).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: 'settings-bottom-sheet' }).props.accessibilityState.expanded).toBe(false);
    await act(async () => tree.unmount());
  });

  it('활동 시간은 초기 서버값 전 편집을 막고 pristine만 동기화하며 dirty draft를 보존한다', async () => {
    const initialLoad = deferred();
    mockFetchSettings.mockReturnValueOnce(initialLoad.promise);
    const client = makeEmptyClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    expect(control(tree, '변경').props.accessibilityState.disabled).toBe(true);
    expect(control(tree, '활동 시간 저장').props.accessibilityState.disabled).toBe(true);
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    expect(mockPatchSettings).not.toHaveBeenCalled();

    await act(async () => {
      initialLoad.resolve(settings({ routineStartHour: 7, routineEndHour: 20 }));
      await initialLoad.promise;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(control(tree, '변경').props.accessibilityState.disabled).toBe(false);
    await act(async () => control(tree, '변경').props.onPress());
    expect(control(tree, '시작 7시').props.accessibilityState.selected).toBe(true);
    expect(control(tree, '활동 시간 저장').props.accessibilityState.disabled).toBe(true);
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    expect(mockPatchSettings).not.toHaveBeenCalled();

    await act(async () => control(tree, '시작 8시').props.onPress());
    await act(async () => {
      client.setQueryData(keys.settings, settings({ routineStartHour: 6, routineEndHour: 19 }));
    });
    expect(control(tree, '시작 8시').props.accessibilityState.selected).toBe(true);
    expect(control(tree, '끝 20시').props.accessibilityState.selected).toBe(true);

    await act(async () => control(tree, '활동 시간 취소').props.onPress());
    await act(async () => control(tree, '변경').props.onPress());
    expect(control(tree, '시작 6시').props.accessibilityState.selected).toBe(true);
    expect(control(tree, '끝 19시').props.accessibilityState.selected).toBe(true);
    await act(async () => tree.unmount());
  });

  it('활동 시간 저장 실패는 sheet와 draft를 유지하고 가까이에 알린다', async () => {
    mockPatchSettings.mockRejectedValueOnce(new Error('server down'));
    const client = makeClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    await act(async () => control(tree, '변경').props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    await flush();

    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);
    expect(texts(tree, '저장하지 못했어요. [APP-UNKNOWN]')).toHaveLength(1);
    expect(mockDismiss).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });

  it('활동 시간 저장 성공은 sheet를 유지하고 마지막 서버 승인값을 새 baseline으로 쓴다', async () => {
    mockPatchSettings.mockResolvedValueOnce(settings({ routineStartHour: 10 }));
    const client = makeClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    await act(async () => control(tree, '변경').props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    await flush();

    expect(tree.root.findByProps({ testID: 'settings-bottom-sheet' }).props.accessibilityState.expanded).toBe(true);
    expect(control(tree, '시작 10시').props.accessibilityState.selected).toBe(true);
    expect(control(tree, '활동 시간 저장').props.accessibilityState.disabled).toBe(true);
    expect(mockDismiss).not.toHaveBeenCalled();

    const cancel = control(tree, '활동 시간 취소');
    expect(cancel.props.accessibilityState.disabled).toBe(false);
    await act(async () => cancel.props.onPress());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ testID: 'settings-bottom-sheet' }).props.accessibilityState.expanded).toBe(false);
    await act(async () => tree.unmount());
  });

  it('활동 시간 저장 pending 중에는 명시적 취소와 dismiss 충돌을 막는다', async () => {
    const pending = deferred();
    mockPatchSettings.mockReturnValueOnce(pending.promise);
    const client = makeClient();
    const tree = await renderWithProviders(client, <ActiveHoursCard />);

    await act(async () => control(tree, '변경').props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => {
      control(tree, '활동 시간 저장').props.onPress();
      await Promise.resolve();
    });
    const cancel = control(tree, '활동 시간 취소');
    expect(cancel.props.accessibilityState.disabled).toBe(true);
    await act(async () => cancel.props.onPress());
    expect(mockDismiss).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(settings({ routineStartHour: 10 }));
      await pending.promise;
    });
    await flush();
    await act(async () => tree.unmount());
  });

  it('알림은 요청 중 연속 조작을 막고 실제 완료 뒤 성공을 알린다', async () => {
    const saving = deferred();
    mockPatchSettings.mockReturnValueOnce(saving.promise);
    const client = makeClient();
    const tree = await renderWithProviders(client, <NotificationSettingsCard />);
    const notificationSwitch = tree.root.findByProps({ accessibilityLabel: '알림 받기 스위치' });

    await act(async () => {
      notificationSwitch.props.onValueChange(false);
      notificationSwitch.props.onValueChange(false);
      await Promise.resolve();
    });
    expect(mockPatchSettings).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ accessibilityLabel: '알림 받기 스위치' }).props.disabled).toBe(true);
    expect(texts(tree, '계정에 저장했어요.')).toHaveLength(0);

    await act(async () => {
      saving.resolve(settings({ notificationsEnabled: false }));
      await Promise.resolve();
    });
    expect(texts(tree, '계정에 저장했어요.')).toHaveLength(1);
    await act(async () => tree.unmount());
  });

  it('알림 저장 실패는 기존 서버값을 유지하고 섹션 가까이에 알린다', async () => {
    mockPatchSettings.mockRejectedValueOnce(new Error('알림 저장 실패'));
    const client = makeClient();
    const tree = await renderWithProviders(client, <NotificationSettingsCard />);
    const notificationSwitch = tree.root.findByProps({ accessibilityLabel: '알림 받기 스위치' });

    await act(async () => notificationSwitch.props.onValueChange(false));
    await flush();

    expect(tree.root.findByProps({ accessibilityLabel: '알림 받기 스위치' }).props.value).toBe(true);
    expect(texts(tree, '저장하지 못했어요. [APP-UNKNOWN]')).toHaveLength(1);
    await act(async () => tree.unmount());
  });
});
