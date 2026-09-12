const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Alert, Text } = require('react-native');

const mockEquipItem = jest.fn();
const mockPurchaseItem = jest.fn();
const mockUnequipSlot = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRefreshAuth = jest.fn();
const mockToast = { error: jest.fn(), show: jest.fn() };

let mockCatalog;
let mockRefreshMe;
let mockHarness;

const NO_AUTH_UPDATE = Symbol('NO_AUTH_UPDATE');
const mockAuthContext = React.createContext(null);

jest.mock('../auth/AuthContext', () => ({
  useAuth: () => require('react').useContext(mockAuthContext),
}));
jest.mock('../api/shop', () => ({
  fetchCatalog: jest.fn(),
  equipItem: (...args) => mockEquipItem(...args),
  purchaseItem: (...args) => mockPurchaseItem(...args),
  unequipSlot: (...args) => mockUnequipSlot(...args),
}));
jest.mock('../api/client', () => ({
  getApiErrorMessage: (error, fallback) => error?.message ?? fallback,
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockCatalog, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock('../components/retro/ToastProvider', () => ({
  useToast: () => mockToast,
}));
jest.mock('../widget/mirror', () => ({ mirrorTheme: jest.fn() }));
jest.mock('../components/fx/CelebrationOverlay', () => ({ CelebrationOverlay: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const { RetroCard } = require('../components/retro/RetroCard');
const { ThemeProvider, useSkinPreview } = require('../theme/ThemeProvider');
const { BG_SKINS, CHROME_SKINS } = require('../theme/skins');
const { palettes } = require('../theme/tokens');
const { useTheme } = require('../theme/useTheme');
const ShopScreen = require('../../app/shop').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

const ACCOUNT_A = {
  email: 'a@example.com',
  name: 'A',
  picture: null,
  coins: 100,
  isAdmin: false,
  equipments: { BACKGROUND: 'bg.galaxy', CHROME: 'chrome.wood' },
};

const ACCOUNT_B = {
  ...ACCOUNT_A,
  email: 'b@example.com',
  name: 'B',
  equipments: { BACKGROUND: 'bg.candy', CHROME: 'chrome.candy' },
};

const ITEMS = [
  {
    code: 'bg.galaxy', type: 'THEME', slot: 'BACKGROUND', name: '은하 배경',
    description: '현재 배경', price: 10, tier: 'CONCEPT', owned: true, equipped: true,
  },
  {
    code: 'bg.ocean', type: 'THEME', slot: 'BACKGROUND', name: '바다 배경',
    description: '미리보기 A', price: 20, tier: 'COLOR', owned: true, equipped: false,
  },
  {
    code: 'bg.rose', type: 'THEME', slot: 'BACKGROUND', name: '장미 배경',
    description: '장착 B', price: 25, tier: 'COLOR', owned: true, equipped: false,
  },
  {
    code: 'bg.candy', type: 'THEME', slot: 'BACKGROUND', name: '사탕 배경',
    description: '구매 C', price: 30, tier: 'COLOR', owned: false, equipped: false,
  },
  {
    code: 'chrome.wood', type: 'THEME', slot: 'CHROME', name: '나무 크롬',
    description: '현재 크롬', price: 10, tier: 'CONCEPT', owned: true, equipped: true,
  },
  {
    code: 'chrome.rose', type: 'THEME', slot: 'CHROME', name: '장미 크롬',
    description: '다른 슬롯 미리보기', price: 20, tier: 'COLOR', owned: true, equipped: false,
  },
];

function ThemeProbe() {
  const theme = useTheme();
  const { preview } = useSkinPreview();
  return (
    <Text testID="theme-probe">
      {JSON.stringify({
        preview: preview ?? null,
        bg: theme.colors.bg,
        chromeBg: theme.colors.chromeBg,
      })}
    </Text>
  );
}

const Harness = React.forwardRef(function Harness({ initialMe = ACCOUNT_A }, ref) {
  const [me, setMe] = React.useState(initialMe);
  const [showShop, setShowShop] = React.useState(true);
  const refresh = React.useCallback(async () => {
    await mockRefreshAuth();
    if (mockRefreshMe !== NO_AUTH_UPDATE) setMe(mockRefreshMe);
  }, []);

  React.useImperativeHandle(ref, () => ({ setMe, setShowShop }), []);

  return (
    <mockAuthContext.Provider value={{ me, loading: false, refresh }}>
      <ThemeProvider>
        {showShop && <ShopScreen />}
        <ThemeProbe />
      </ThemeProvider>
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

async function renderShop(initialMe = ACCOUNT_A) {
  let tree;
  await act(async () => {
    tree = create(<Harness ref={mockHarness} initialMe={initialMe} />);
  });
  return tree;
}

function button(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityRole === 'button'
      && node.props.accessibilityLabel === label
      && typeof node.props.style === 'function',
  );
}

function itemCard(tree, name) {
  return tree.root.findAllByType(RetroCard).find((card) => (
    card.findAll((node) => node.type === Text && node.props.children === name).length > 0
  ));
}

function itemAction(tree, name, label) {
  return itemCard(tree, name).find(
    (node) => node.props.accessibilityRole === 'button'
      && node.props.accessibilityLabel === label
      && typeof node.props.style === 'function',
  );
}

function themeState(tree) {
  return JSON.parse(tree.root.findByProps({ testID: 'theme-probe' }).props.children);
}

async function press(node) {
  await act(async () => node.props.onPress());
}

async function preview(tree, itemName) {
  await press(button(tree, `${itemName} 미리보기`));
}

async function chooseTab(tree, label) {
  await press(button(tree, label));
}

async function startAction(tree, itemName, label) {
  await act(async () => {
    void itemAction(tree, itemName, label).props.onPress();
    await Promise.resolve();
  });
}

async function startPurchase(tree, itemName) {
  await press(itemAction(tree, itemName, '30'));
  const purchase = Alert.alert.mock.calls.at(-1)[2].find((entry) => entry.text === '구매');
  await act(async () => {
    void purchase.onPress();
    await Promise.resolve();
  });
}

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  mockCatalog = { coinBalance: 100, items: ITEMS.map((item) => ({ ...item })) };
  mockRefreshMe = NO_AUTH_UPDATE;
  mockHarness = React.createRef();
  mockEquipItem.mockReset().mockResolvedValue(undefined);
  mockPurchaseItem.mockReset().mockResolvedValue({ message: 'ok', remainingCoins: 70, equipped: true });
  mockUnequipSlot.mockReset().mockResolvedValue(undefined);
  mockInvalidateQueries.mockReset().mockResolvedValue(undefined);
  mockRefreshAuth.mockReset().mockResolvedValue(undefined);
  mockToast.error.mockReset();
  mockToast.show.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('상점 슬롯 미리보기', () => {
  it('preview는 해당 슬롯만 덮고 같은 슬롯 취소는 다른 슬롯 preview를 보존한다', async () => {
    const tree = await renderShop();
    await preview(tree, '바다 배경');

    await act(async () => mockHarness.current.setMe({
      ...ACCOUNT_A,
      equipments: { ...ACCOUNT_A.equipments, CHROME: 'chrome.candy' },
    }));
    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.ocean' });
    expect(themeState(tree).chromeBg).toBe(CHROME_SKINS.candy.light.chromeBg);

    await chooseTab(tree, '크롬');
    await preview(tree, '장미 크롬');
    await chooseTab(tree, '배경');
    await preview(tree, '바다 배경');

    expect(themeState(tree).preview).toEqual({ CHROME: 'chrome.rose' });
    await unmount(tree);
  });

  it('원래대로, 로그아웃, 상점 이탈은 모든 preview를 실제 장착으로 복원한다', async () => {
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await press(button(tree, '원래대로'));
    expect(themeState(tree).preview).toBeNull();

    await preview(tree, '바다 배경');
    await act(async () => mockHarness.current.setMe(null));
    expect(themeState(tree).preview).toBeNull();
    expect(themeState(tree).bg).toBe(palettes.light.bg);

    await act(async () => mockHarness.current.setMe(ACCOUNT_A));
    await preview(tree, '바다 배경');
    await act(async () => mockHarness.current.setShowShop(false));
    expect(themeState(tree).preview).toBeNull();
    await unmount(tree);
  });
});

describe('상점 장착 acknowledgement', () => {
  it.each([
    ['장착', '장미 배경', '장착', 'bg.rose'],
    ['구매', '사탕 배경', '30', 'bg.candy'],
    ['해제', '은하 배경', '해제', null],
  ])('%s 성공은 refresh의 실제 장착 반영 뒤 성공 슬롯만 지운다', async (kind, itemName, label, expectedCode) => {
    const refreshGate = deferred();
    mockRefreshAuth.mockReturnValue(refreshGate.promise);
    mockRefreshMe = {
      ...ACCOUNT_A,
      equipments: expectedCode
        ? { ...ACCOUNT_A.equipments, BACKGROUND: expectedCode }
        : { CHROME: ACCOUNT_A.equipments.CHROME },
    };
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await chooseTab(tree, '크롬');
    await preview(tree, '장미 크롬');
    await chooseTab(tree, '배경');

    if (kind === '구매') await startPurchase(tree, itemName);
    else await startAction(tree, itemName, label);

    expect(themeState(tree).preview).toEqual({
      BACKGROUND: 'bg.ocean',
      CHROME: 'chrome.rose',
    });
    expect(itemAction(tree, kind === '해제' ? '장미 배경' : '은하 배경', kind === '해제' ? '장착' : '해제').props.disabled)
      .toBe(true);

    await act(async () => refreshGate.resolve());
    expect(themeState(tree).preview).toEqual({ CHROME: 'chrome.rose' });
    expect(mockRefreshAuth).toHaveBeenCalledTimes(1);
    await unmount(tree);
  });

  it.each([
    ['장착', '장미 배경', '장착', mockEquipItem],
    ['구매', '사탕 배경', '30', mockPurchaseItem],
    ['해제', '은하 배경', '해제', mockUnequipSlot],
  ])('%s API 실패는 preview와 장착 표시를 보존한다', async (kind, itemName, label, apiCall) => {
    apiCall.mockRejectedValueOnce(new Error(`${kind} 실패`));
    const tree = await renderShop();
    await preview(tree, '바다 배경');

    if (kind === '구매') await startPurchase(tree, itemName);
    else await startAction(tree, itemName, label);

    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.ocean' });
    expect(themeState(tree).bg).toBe(BG_SKINS.ocean.light.bg);
    expect(mockRefreshAuth).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(`${kind} 실패`);
    await unmount(tree);
  });

  it('refresh가 오류를 삼켜 실제 장착을 못 바꾸면 busy만 풀고 preview를 유지한다', async () => {
    mockRefreshMe = NO_AUTH_UPDATE;
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await startAction(tree, '장미 배경', '장착');

    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.ocean' });
    expect(itemAction(tree, '장미 배경', '장착').props.disabled).toBe(false);
    await unmount(tree);
  });

  it('refresh 대기 중 취소하거나 새 preview를 고르면 오래된 성공이 새 preview를 지우지 않는다', async () => {
    const refreshGate = deferred();
    mockRefreshAuth.mockReturnValue(refreshGate.promise);
    mockRefreshMe = { ...ACCOUNT_A, equipments: { ...ACCOUNT_A.equipments, BACKGROUND: 'bg.rose' } };
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await startAction(tree, '장미 배경', '장착');

    await preview(tree, '바다 배경');
    await preview(tree, '사탕 배경');
    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.candy' });

    await act(async () => refreshGate.resolve());
    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.candy' });
    await unmount(tree);
  });
});

describe('상점 mutation 경계', () => {
  it('렌더 전 연속 실행과 다른 상품 mutation을 함께 차단한다', async () => {
    const equipGate = deferred();
    mockEquipItem.mockReturnValue(equipGate.promise);
    const tree = await renderShop();
    const equip = itemAction(tree, '장미 배경', '장착');

    await act(async () => {
      void equip.props.onPress();
      void equip.props.onPress();
      await Promise.resolve();
    });

    expect(mockEquipItem).toHaveBeenCalledTimes(1);
    expect(itemAction(tree, '사탕 배경', '30').props.disabled).toBe(true);
    await act(async () => equipGate.resolve());
    await unmount(tree);
  });

  it('A→B→A 계정 전환 뒤 끝난 이전 mutation은 refresh하거나 새 preview를 지우지 않는다', async () => {
    const equipGate = deferred();
    mockEquipItem.mockReturnValue(equipGate.promise);
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await startAction(tree, '장미 배경', '장착');

    await act(async () => mockHarness.current.setMe(ACCOUNT_B));
    await act(async () => mockHarness.current.setMe(ACCOUNT_A));
    await preview(tree, '사탕 배경');
    await act(async () => equipGate.resolve());

    expect(mockRefreshAuth).not.toHaveBeenCalled();
    expect(themeState(tree).preview).toEqual({ BACKGROUND: 'bg.candy' });
    await unmount(tree);
  });

  it('상점이 unmount된 뒤 끝난 mutation은 refresh와 상태 반영을 생략한다', async () => {
    const equipGate = deferred();
    mockEquipItem.mockReturnValue(equipGate.promise);
    const tree = await renderShop();
    await preview(tree, '바다 배경');
    await startAction(tree, '장미 배경', '장착');
    await act(async () => mockHarness.current.setShowShop(false));
    expect(themeState(tree).preview).toBeNull();

    await act(async () => equipGate.resolve());
    expect(mockRefreshAuth).not.toHaveBeenCalled();
    expect(themeState(tree).preview).toBeNull();
    await unmount(tree);
  });
});
