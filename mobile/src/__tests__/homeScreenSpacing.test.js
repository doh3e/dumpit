const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { ScrollView, StyleSheet } = require('react-native');

let mockBottomInset = 0;
const mockPlanningRefetch = jest.fn();
const mockAiUsageRefetch = jest.fn();
const mockRefreshAuth = jest.fn();
const mockUnsubscribe = jest.fn();
const mockToast = { error: jest.fn(), show: jest.fn() };
const mockTasks = [];
const mockSections = {
  overdue: [],
  today: [],
  tomorrow: [],
  next7Days: [],
  later: [],
  someday: [],
  recentDone: [],
};
const mockPlanningData = { tasks: mockTasks, sections: mockSections, nowSuggestion: null };
const mockPlanningResult = {
  data: mockPlanningData,
  error: null,
  isError: false,
  isLoading: false,
  refetch: mockPlanningRefetch,
};
const mockAiUsageResult = { data: undefined, refetch: mockAiUsageRefetch };
const mockToggleResult = { mutate: jest.fn() };

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: mockBottomInset, left: 0 }),
}));
jest.mock('../theme/useTheme', () => ({
  useTheme: () => ({ colors: { accent: '#ff4d5a' }, fonts: { body: 'Pretendard' } }),
}));
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ me: null, refresh: mockRefreshAuth }),
}));
jest.mock('../components/retro/ToastProvider', () => ({
  useToast: () => mockToast,
}));
jest.mock('../query/hooks', () => ({
  usePlanning: () => mockPlanningResult,
  useAiUsage: () => mockAiUsageResult,
  useToggleTask: () => mockToggleResult,
}));
jest.mock('../pomodoro/store', () => ({
  getSession: () => null,
  reconcile: jest.fn(),
  subscribe: () => mockUnsubscribe,
  takePendingSettleResult: () => null,
}));
jest.mock('../components/home/HomeAppBar', () => ({ HomeAppBar: () => null }));
jest.mock('../components/home/MiniCalendar', () => ({ MiniCalendar: () => null }));
jest.mock('../components/home/NowHeroCard', () => ({ NowHeroCard: () => null }));
jest.mock('../components/home/PomodoroCard', () => ({ PomodoroCard: () => null }));
jest.mock('../components/home/TaskListCard', () => ({ TaskListCard: () => null }));
jest.mock('../components/task/TaskDetailSheet', () => {
  const React = require('react');
  return { TaskDetailSheet: React.forwardRef(function MockTaskDetailSheet() { return null; }) };
});
jest.mock('../components/fx/CoinToast', () => ({ CoinToast: () => null }));
jest.mock('../components/fx/PixelBurst', () => ({ PixelBurst: () => null }));
jest.mock('../components/fx/CelebrationOverlay', () => ({ CelebrationOverlay: () => null }));

const HomeScreen = require('../../app/(tabs)/index').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

async function renderHome() {
  let tree;
  await act(async () => { tree = create(<HomeScreen />); });
  return tree;
}

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  mockBottomInset = 0;
  mockPlanningRefetch.mockReset();
  mockAiUsageRefetch.mockReset();
  mockRefreshAuth.mockReset();
  mockUnsubscribe.mockReset();
  mockToast.error.mockReset();
  mockToast.show.mockReset();
  mockToggleResult.mutate.mockReset();
});

describe('홈 콘텐츠 간격', () => {
  it.each([0, 24, 48])('하단 안전 영역이 %idp여도 콘텐츠 간격은 고정된다', async (bottomInset) => {
    mockBottomInset = bottomInset;
    const tree = await renderHome();
    const scroll = tree.root.findByType(ScrollView);
    const spacing = StyleSheet.flatten(scroll.props.contentContainerStyle);

    expect(spacing.padding).toBe(16);
    expect(spacing.paddingBottom).toBe(24);
    expect(spacing.paddingTop).toBe(16);
    expect(spacing.gap).toBe(16);
    expect(scroll.props.refreshControl).toBeTruthy();

    await unmount(tree);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
