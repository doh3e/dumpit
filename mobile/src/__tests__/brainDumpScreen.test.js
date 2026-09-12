const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} = require('react-native');

let mockTheme;
let mockAiUsage;
let mockHardwareBackHandler;
const mockSubmitBrainDump = jest.fn();
const mockConfirmBrainDump = jest.fn();
const mockToastShow = jest.fn();
const mockToastError = jest.fn();
const mockRouterBack = jest.fn();
const mockAnnounce = jest.fn();
const mockInvalidateAfterAi = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('../theme/useTheme', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('../api/brainDump', () => ({
  submitBrainDump: (...args) => mockSubmitBrainDump(...args),
  confirmBrainDump: (...args) => mockConfirmBrainDump(...args),
}));
jest.mock('../api/client', () => ({
  getApiErrorMessage: (error) => error.message,
}));
jest.mock('../a11y/announce', () => ({
  announce: (...args) => mockAnnounce(...args),
}));
jest.mock('../components/retro/ToastProvider', () => ({
  useToast: () => ({ show: mockToastShow, error: mockToastError }),
}));
jest.mock('../query/hooks', () => ({
  useAiUsage: () => ({ data: mockAiUsage }),
  invalidateAfterAi: (...args) => mockInvalidateAfterAi(...args),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: mockRouterBack },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { linear: 'linear' },
    cancelAnimation: jest.fn(),
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (value) => ({ value }),
    withDelay: (_delay, value) => value,
    withRepeat: (value) => value,
    withTiming: (value) => value,
  };
});

const { composeTheme } = require('../theme/compose');
const { contrastRatio } = require('../theme/contrast');
const { BG_SKINS } = require('../theme/skins');
const { resolveFonts } = require('../theme/typography');
const { Chip } = require('../components/retro/Chip');
const { RetroBadge } = require('../components/retro/RetroBadge');
const { RetroButton } = require('../components/retro/RetroButton');
const { RetroCard } = require('../components/retro/RetroCard');
const BrainDumpScreen = require('../../app/brain-dump').default;

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.useFakeTimers();

const RESULT = {
  dumpId: 'local-dump',
  tasks: [
    {
      taskId: null,
      title: '발표 준비',
      description: '슬라이드 초안',
      aiPriorityScore: 0.8,
      category: 'WORK',
      deadline: '2026-09-13T16:00:00',
      estimatedMinutes: 90,
    },
    {
      taskId: null,
      title: '장보기',
      description: null,
      aiPriorityScore: 0.4,
      category: 'CHORE',
      deadline: null,
      estimatedMinutes: 20,
    },
    {
      taskId: null,
      title: '빨래',
      description: null,
      aiPriorityScore: 0.2,
      category: 'CHORE',
      deadline: '2026-09-12T22:00:00',
      estimatedMinutes: 30,
    },
  ],
};

function setTheme(scheme = 'light', equipments = null, highContrast = false) {
  mockTheme = {
    ...composeTheme(scheme, equipments, { highContrast }),
    fonts: resolveFonts(false),
    scheme,
  };
}

async function renderScreen() {
  let tree;
  await act(async () => {
    tree = create(<BrainDumpScreen />);
  });
  return tree;
}

function input(tree) {
  return tree.root.find(
    (node) => node.type === TextInput && node.props.accessibilityLabel === '브레인 덤프 내용',
  );
}

function control(tree, label, role = 'button') {
  return tree.root.find(
    (node) => node.props.accessibilityRole === role
      && node.props.accessibilityLabel === label
      && typeof node.props.style === 'function',
  );
}

function controlStyle(node, pressed = false) {
  return StyleSheet.flatten(node.props.style({ pressed }));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function changeText(tree, value) {
  await act(async () => input(tree).props.onChangeText(value));
}

async function analyze(tree) {
  await act(async () => control(tree, 'AI 분석').props.onPress());
  await act(async () => jest.runOnlyPendingTimers());
}

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  setTheme();
  mockAiUsage = { used: 0, limit: 100, remaining: 100, resetAt: '2026-09-13T00:00:00' };
  mockSubmitBrainDump.mockReset();
  mockConfirmBrainDump.mockReset();
  mockToastShow.mockReset();
  mockToastError.mockReset();
  mockRouterBack.mockReset();
  mockAnnounce.mockReset();
  mockInvalidateAfterAi.mockReset();
  mockInvalidateQueries.mockReset().mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    mockHardwareBackHandler = handler;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('브레인 덤프 입력·분석', () => {
  it('IME 비제어 입력과 refined 평면 표현, 작은 폭 스크롤을 유지한다', async () => {
    const tree = await renderScreen();
    const dumpInput = input(tree);
    const back = control(tree, '뒤로');
    const scroll = tree.root.findByType(ScrollView);
    const card = tree.root.findByType(RetroCard);
    const button = tree.root.findByType(RetroButton);
    const cost = tree.root.findByType(RetroBadge);
    const counter = tree.root.find(
      (node) => node.type === Text
        && Array.isArray(node.props.children)
        && node.props.children.includes(3000),
    );

    expect(dumpInput.props.maxLength).toBe(3000);
    expect(dumpInput.props.value).toBeUndefined();
    expect(dumpInput.props.defaultValue).toBe('');
    expect(button.props.disabled).toBe(true);
    expect(cost.props.text).toBe('5점');
    expect(dumpInput.props.placeholderTextColor).toBe(mockTheme.colors.subOnChip);
    expect(StyleSheet.flatten(counter.props.style).color).toBe(mockTheme.colors.fg);
    expect(card.props.appearance).toBe('refined');
    expect(button.props.appearance).toBe('refined');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).flexGrow).toBe(1);
    expect(controlStyle(back).minWidth).toBeGreaterThanOrEqual(48);
    expect(controlStyle(back).minHeight).toBeGreaterThanOrEqual(48);
    await unmount(tree);
  });

  it('분석 중에 정적 토큰·진행 표시를 보이고 실패하면 원문을 복원한다', async () => {
    const pending = deferred();
    mockSubmitBrainDump.mockReturnValue(pending.promise);
    const tree = await renderScreen();
    await changeText(tree, '실패 후에도 남길 원문');

    await act(async () => {
      void control(tree, 'AI 분석').props.onPress();
      await Promise.resolve();
    });

    const progress = tree.root.find((node) => node.props.accessibilityRole === 'progressbar');
    expect(progress.props.accessibilityLabel).toBe('브레인 덤프 분석 중');
    expect(progress.props.accessibilityValue).toEqual({ text: '분석 중' });
    expect(tree.root.findByProps({ testID: 'brain-dump-loading-token' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'brain-dump-progress-indicator' })).toBeTruthy();
    expect(tree.root.findByType(RetroCard).props.appearance).toBe('refined');

    await act(async () => pending.reject(new Error('분석 실패')));
    const restored = input(tree);
    expect(restored.props.value).toBeUndefined();
    expect(restored.props.defaultValue).toBe('실패 후에도 남길 원문');
    expect(mockSubmitBrainDump).toHaveBeenCalledWith('실패 후에도 남길 원문');
    expect(mockToastError).toHaveBeenCalledWith('분석 실패');
    await unmount(tree);
  });

  it('빈 입력과 AI 잔여 4점에서 분석을 차단한다', async () => {
    mockAiUsage = { used: 96, limit: 100, remaining: 4, resetAt: '2026-09-13T00:00:00' };
    const tree = await renderScreen();

    expect(control(tree, 'AI 분석').props.disabled).toBe(true);
    await changeText(tree, '분석할 내용');
    const blocked = control(tree, 'AI 분석');
    expect(blocked.props.disabled).toBe(true);
    await act(async () => blocked.props.onPress());
    expect(mockSubmitBrainDump).not.toHaveBeenCalled();
    expect(tree.root.findAll(
      (node) => node.type === Text && node.props.children === '오늘 AI 점수가 부족해요',
    )).toHaveLength(1);
    await unmount(tree);
  });
});

describe('브레인 덤프 선택·등록', () => {
  it('3개 중 2개만 확정 payload로 보내고 저장 실패 후에도 선택을 유지한다', async () => {
    mockSubmitBrainDump.mockResolvedValue(RESULT);
    const save = deferred();
    mockConfirmBrainDump.mockReturnValue(save.promise);
    const tree = await renderScreen();
    await changeText(tree, '발표를 준비하고 장보고 빨래하기');
    await analyze(tree);

    expect(mockAnnounce).toHaveBeenCalledWith('분석이 끝났어요. 후보 3개');
    await act(async () => control(tree, '장보기 선택', 'checkbox').props.onPress());

    const unselected = control(tree, '장보기 선택', 'checkbox');
    const selected = control(tree, '발표 준비 선택', 'checkbox');
    const pressed = controlStyle(unselected, true);
    const selectTitle = tree.root.find(
      (node) => node.type === Text && node.props.children === 'AI 분석 결과',
    );
    const selectHeading = selectTitle.parent;
    const selectHeader = selectHeading.parent;
    expect(unselected.props.accessibilityState).toEqual({ checked: false });
    expect(controlStyle(unselected).opacity).toBe(1);
    expect(pressed.opacity ?? 1).toBe(1);
    expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
    expect(StyleSheet.flatten(unselected.findByType(RetroCard).props.style).borderColor)
      .toBe(mockTheme.colors.sub);
    expect(StyleSheet.flatten(selected.findByType(RetroCard).props.style).borderColor)
      .toBe(mockTheme.colors.fg);
    expect(tree.root.findAllByType(RetroCard).every((card) => card.props.appearance === 'refined')).toBe(true);
    expect(tree.root.findByType(Chip).props.appearance).toBe('refined');
    expect(tree.root.findAllByType(RetroButton).every((button) => button.props.appearance === 'refined')).toBe(true);
    expect(tree.root.findAll(
      (node) => node.type === Text && ['01', '02', '03'].includes(node.props.children),
    )).toHaveLength(0);
    expect(StyleSheet.flatten(selectHeader.props.style).flexWrap).toBe('wrap');
    expect(StyleSheet.flatten(selectHeading.props.style).flexWrap).toBe('wrap');

    await act(async () => {
      void control(tree, '선택한 2개 등록').props.onPress();
      await Promise.resolve();
    });
    expect(mockConfirmBrainDump).toHaveBeenCalledWith(
      'local-dump', expect.arrayContaining([
        expect.objectContaining({ title: '발표 준비' }),
        expect.objectContaining({ title: '빨래' }),
      ]),
    );
    expect(mockConfirmBrainDump.mock.calls[0][1]).toHaveLength(2);
    const saving = control(tree, '선택한 2개 등록');
    expect(saving.props.disabled).toBe(true);
    await act(async () => saving.props.onPress());
    expect(mockConfirmBrainDump).toHaveBeenCalledTimes(1);

    await act(async () => save.reject(new Error('저장 실패')));
    expect(mockToastError).toHaveBeenCalledWith('저장 실패');
    expect(control(tree, '발표 준비 선택', 'checkbox').props.accessibilityState.checked).toBe(true);
    expect(control(tree, '장보기 선택', 'checkbox').props.accessibilityState.checked).toBe(false);
    expect(control(tree, '빨래 선택', 'checkbox').props.accessibilityState.checked).toBe(true);
    expect(control(tree, '선택한 2개 등록').props.disabled).toBe(false);
    expect(mockRouterBack).not.toHaveBeenCalled();
    await unmount(tree);
  });

  it('실제 조합 테마에서 결과 본문과 선택 경계 대비를 유지한다', () => {
    for (const scheme of ['light', 'dark']) {
      for (const skin of [null, ...Object.keys(BG_SKINS)]) {
        for (const highContrast of [false, true]) {
          const { colors } = composeTheme(
            scheme,
            skin ? { BACKGROUND: `bg.${skin}` } : null,
            { highContrast },
          );
          expect(contrastRatio(colors.fg, colors.card)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(colors.subOnChip, colors.card)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(colors.sub, colors.bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(colors.sub, colors.card)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(colors.fg, colors.chip)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(colors.sub, colors.chip)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});

describe('브레인 덤프 나가기', () => {
  it('화면과 하드웨어 뒤로가기에서 취소하면 원문을 남긴다', async () => {
    const tree = await renderScreen();
    await changeText(tree, '남겨둘 원문');

    await act(async () => control(tree, '뒤로').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith(
      '나가기',
      '작성 중인 내용이 사라져요. 나갈까요?',
      expect.arrayContaining([expect.objectContaining({ text: '취소', style: 'cancel' })]),
    );
    const cancel = Alert.alert.mock.calls[0][2].find((button) => button.text === '취소');
    await act(async () => cancel.onPress?.());
    expect(mockRouterBack).not.toHaveBeenCalled();

    Alert.alert.mockClear();
    expect(mockHardwareBackHandler()).toBe(true);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const hardwareCancel = Alert.alert.mock.calls[0][2].find((button) => button.text === '취소');
    await act(async () => hardwareCancel.onPress?.());
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(input(tree).props.defaultValue).toBe('남겨둘 원문');
    await unmount(tree);
  });
});
