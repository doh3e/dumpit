const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text, TextInput } = require('react-native');

let mockTheme;
let mockRoutineResult;
const mockMutate = jest.fn();
const mockPush = jest.fn();
const mockToastError = jest.fn();
const mockExtractIdeas = jest.fn();
const mockConfirmExtract = jest.fn();
const mockInvalidateAfterAi = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('../query/routineHooks', () => ({
  useRoutines: () => mockRoutineResult,
  useToggleRoutine: () => ({ mutate: mockMutate }),
}));
jest.mock('../api/client', () => ({ getApiErrorMessage: (error) => error.message }));
jest.mock('../components/retro/ToastProvider', () => ({ useToast: () => ({ error: mockToastError, show: jest.fn() }) }));
jest.mock('expo-router', () => ({ router: { push: mockPush } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock('../api/ideas', () => ({
  extractIdeas: (...args) => mockExtractIdeas(...args),
  confirmExtract: (...args) => mockConfirmExtract(...args),
}));
jest.mock('../query/hooks', () => ({
  useAiUsage: () => ({ data: { used: 0, limit: 100, remaining: 100, resetAt: '2026-09-13T00:00:00' } }),
  invalidateAfterAi: (...args) => mockInvalidateAfterAi(...args),
}));

const { composeTheme } = require('../theme/compose');
const { resolveFonts } = require('../theme/typography');
const { RetroButton } = require('../components/retro/RetroButton');
const { RetroCard } = require('../components/retro/RetroCard');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const RoutineScreen = require('../../app/(tabs)/routine').default;
const IdeaDumpScreen = require('../../app/idea-dump').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme() {
  mockTheme = { ...composeTheme('light', null, { highContrast: false }), fonts: resolveFonts(false), scheme: 'light' };
}

async function render(element) {
  let tree;
  await act(async () => { tree = create(element); });
  return tree;
}

function pressableStyle(node, pressed = false) {
  return StyleSheet.flatten(node.props.style({ pressed }));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function control(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label,
  );
}

beforeEach(() => {
  setTheme();
  mockRoutineResult = { data: [{
    routineId: 'routine-1', name: '아주 길어진 한국어 루틴 이름도 한 줄에서 안전하게 잘려야 해요',
    enabled: true, repeatType: 'WEEKLY', daysOfWeek: [1], daysOfMonth: [], monthlyWeekOrdinal: null,
    monthlyWeekDay: null, runOnLastDayIfMissing: false, createTime: null, routineStartTime: null,
    routineEndTime: null, startDate: '2026-09-12', endDate: null, lastGeneratedDate: null,
    nextRunAt: null, createdAt: '2026-09-12T00:00:00', updatedAt: '2026-09-12T00:00:00', description: null,
  }], refetch: jest.fn(() => Promise.resolve()) };
  mockMutate.mockReset();
  mockPush.mockReset();
  mockToastError.mockReset();
  mockExtractIdeas.mockReset();
  mockConfirmExtract.mockReset();
  mockInvalidateAfterAi.mockReset();
  mockInvalidateQueries.mockReset();
  AsyncStorage.getItem.mockResolvedValue('');
  AsyncStorage.setItem.mockResolvedValue();
  AsyncStorage.removeItem.mockResolvedValue();
});

describe('루틴 화면의 refined 목록 표면', () => {
  it('실제 화면 renderer가 빈 목록을 안내하고 긴 한국어 행의 refined 탐색을 전달한다', async () => {
    mockRoutineResult.data = [];
    let tree = await render(<RoutineScreen />);
    expect(tree.root.find((node) => node.type === Text && String(node.props.children).includes('반복되는 일을 루틴으로'))).toBeTruthy();
    await act(async () => tree.unmount());

    mockRoutineResult.data[0] = {
      routineId: 'routine-1', name: '아주 길어진 한국어 루틴 이름도 한 줄에서 안전하게 잘려야 해요',
      enabled: true, repeatType: 'WEEKLY', daysOfWeek: [1], daysOfMonth: [], monthlyWeekOrdinal: null,
      monthlyWeekDay: null, runOnLastDayIfMissing: false, createTime: null, routineStartTime: null,
      routineEndTime: null, startDate: '2026-09-12', endDate: null, lastGeneratedDate: null,
      nextRunAt: null, createdAt: '2026-09-12T00:00:00', updatedAt: '2026-09-12T00:00:00', description: null,
    };
    tree = await render(<RoutineScreen />);
    const card = tree.root.findByType(RetroCard);
    const createButton = tree.root.findByType(RetroButton);
    const row = tree.root.find((node) => node.props.accessibilityLabel?.endsWith('편집'));
    const name = row.find((node) => node.props.numberOfLines === 1 && typeof node.props.children === 'string');

    expect(card.props.appearance).toBe('refined');
    expect(createButton.props.appearance).toBe('refined');
    expect(pressableStyle(row).minHeight).toBeGreaterThanOrEqual(48);
    expect(pressableStyle(row, true).opacity ?? 1).toBe(1);
    expect(pressableStyle(row, true).backgroundColor).toBe(mockTheme.colors.chip);
    expect(name.props.numberOfLines).toBe(1);
    await act(async () => row.props.onPress());
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/routine-edit' }));
    await act(async () => tree.unmount());
  });

  it('실제 화면의 루틴 토글 실패는 오류를 알리고 편집 탐색은 유지한다', async () => {
    mockMutate.mockImplementation((_vars, options) => options.onError(new Error('루틴 상태를 바꾸지 못했어요.')));
    const tree = await render(<RoutineScreen />);
    const toggle = tree.root.find((node) => node.props.accessibilityLabel?.endsWith('활성 스위치'));
    const row = tree.root.find((node) => node.props.accessibilityLabel?.endsWith('편집'));

    await act(async () => toggle.props.onValueChange(false));
    expect(mockMutate).toHaveBeenCalledWith(
      { routineId: 'routine-1', enabled: false }, expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(mockToastError).toHaveBeenCalledWith('루틴 상태를 바꾸지 못했어요.');
    await act(async () => row.props.onPress());
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/routine-edit' }));
    await act(async () => tree.unmount());
  });
});

describe('아이디어 덤프 화면의 선택·로딩·실패', () => {
  it('실제 화면 renderer에서 추출 중 상태를 보이고 선택한 묶음을 저장 실패 뒤에도 보존한다', async () => {
    const pending = deferred();
    mockExtractIdeas.mockReturnValue(pending.promise);
    mockConfirmExtract.mockRejectedValue(new Error('저장 실패'));
    const tree = await render(<IdeaDumpScreen />);
    await act(async () => { await Promise.resolve(); });
    const input = tree.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === '아이디어 내용');
    await act(async () => input.props.onChangeText('긴 한국어 아이디어를 계층으로 정리해요'));
    const extract = control(tree, 'AI로 정리 (5점)');

    await act(async () => { void extract.props.onPress(); await Promise.resolve(); });
    expect(extract.props.disabled).toBe(true);
    expect(mockExtractIdeas).toHaveBeenCalledWith('긴 한국어 아이디어를 계층으로 정리해요');

    await act(async () => pending.resolve({ ideas: [
      { title: '첫 번째 아이디어', content: null, category: 'HOBBY', children: [] },
      { title: '두 번째 아이디어', content: '긴 설명', category: null, children: [] },
    ] }));
    const selected = tree.root.findAll(
      (node) => node.props.accessibilityState?.selected === true && typeof node.props.onPress === 'function',
    );
    expect(selected).toHaveLength(2);
    await act(async () => selected[1].props.onPress());
    expect(tree.root.findAll(
      (node) => node.props.accessibilityState?.selected === true && typeof node.props.onPress === 'function',
    )).toHaveLength(1);

    await act(async () => control(tree, '저장하기 (1개 묶음)').props.onPress());
    expect(mockConfirmExtract).toHaveBeenCalledWith([expect.objectContaining({ title: '첫 번째 아이디어' })]);
    expect(mockToastError).toHaveBeenCalledWith('저장 실패');
    expect(control(tree, '저장하기 (1개 묶음)').props.disabled).toBe(false);
    await act(async () => tree.unmount());
  });
});
