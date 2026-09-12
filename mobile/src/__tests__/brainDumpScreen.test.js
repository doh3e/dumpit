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
let mockUserEmail;
const mockSubmitBrainDump = jest.fn();
const mockConfirmBrainDump = jest.fn();
const mockToastShow = jest.fn();
const mockToastError = jest.fn();
const mockRouterBack = jest.fn();
const mockAnnounce = jest.fn();
const mockInvalidateAfterAi = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockReadDraft = jest.fn();
const mockWriteDraft = jest.fn();
const mockClearDraft = jest.fn();

jest.mock('../theme/useTheme', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('../api/brainDump', () => ({
  submitBrainDump: (...args) => mockSubmitBrainDump(...args),
  confirmBrainDump: (...args) => mockConfirmBrainDump(...args),
}));
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ me: mockUserEmail ? { email: mockUserEmail } : null }),
}));
jest.mock('../brainDump/draft', () => ({
  readDraft: (...args) => mockReadDraft(...args),
  writeDraft: (...args) => mockWriteDraft(...args),
  clearDraft: (...args) => mockClearDraft(...args),
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
  mockUserEmail = 'a@example.com';
  mockReadDraft.mockReset().mockResolvedValue(null);
  mockWriteDraft.mockReset().mockImplementation(async (_account, rawText) => (
    rawText ? { version: 1, rawText, updatedAt: 1 } : null
  ));
  mockClearDraft.mockReset().mockResolvedValue(undefined);
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
  it('원문 복구가 끝난 뒤 editor를 한 번만 열고 계정별 7일 범위를 안내한다', async () => {
    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: '  복구 원문\n ', updatedAt: 1 });
    const tree = await renderScreen();

    const restored = input(tree);
    expect(restored.props.value).toBeUndefined();
    expect(restored.props.defaultValue).toBe('  복구 원문\n ');
    expect(mockReadDraft).toHaveBeenCalledWith('a@example.com');
    expect(tree.root.findAll(
      (node) => node.type === Text && typeof node.props.children === 'string'
        && node.props.children.includes('같은 기기의 이 앱에서 계정별로 마지막 수정부터 7일간'),
    )).toHaveLength(1);
    const more = control(tree, '초안 저장 범위 자세히');
    expect(more.props.accessibilityState).toEqual({ expanded: false });
    expect(controlStyle(more).minHeight).toBeGreaterThanOrEqual(48);
    expect(tree.root.findAll(
      (node) => node.type === Text && typeof node.props.children === 'string'
        && node.props.children.includes('화면 이동·앱 재시작·자동 세션 만료에는 남아 있어요'),
    )).toHaveLength(0);
    await act(async () => more.props.onPress());
    expect(control(tree, '초안 저장 범위 접기').props.accessibilityState).toEqual({ expanded: true });
    expect(tree.root.findAll(
      (node) => node.type === Text && typeof node.props.children === 'string'
        && node.props.children.includes('화면 이동·앱 재시작·자동 세션 만료에는 남아 있어요'),
    )).toHaveLength(1);
    expect(tree.root.findAll(
      (node) => node.type === Text && typeof node.props.children === 'string'
        && node.props.children.includes('지우기·등록 완료·직접 로그아웃·탈퇴 때 이 앱 초안이 삭제돼요'),
    )).toHaveLength(1);
    await unmount(tree);
  });

  it('입력 직후 원문을 저장하고 같은 editor에서 최신 저장 상태만 표시한다', async () => {
    const firstWrite = deferred();
    mockWriteDraft.mockReturnValueOnce(firstWrite.promise);
    const tree = await renderScreen();
    const mountedInput = input(tree);

    await changeText(tree, '첫 원문');
    expect(mockWriteDraft).toHaveBeenCalledWith('a@example.com', '첫 원문');
    expect(input(tree)).toBe(mountedInput);
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '저장 중...')).toHaveLength(1);

    await changeText(tree, '최신 원문');
    expect(input(tree)).toBe(mountedInput);
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '원문 초안 저장됨')).toHaveLength(1);
    await act(async () => firstWrite.resolve());
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '원문 초안 저장됨')).toHaveLength(1);
    await unmount(tree);
  });

  it('저장 실패 원인을 노출하지 않고 다음 입력으로 다시 저장할 수 있다', async () => {
    mockWriteDraft.mockRejectedValueOnce(new Error('민감한 원문 저장 실패'));
    const tree = await renderScreen();
    await changeText(tree, '실패 원문');
    await act(async () => { await Promise.resolve(); });

    expect(tree.root.findAll(
      (node) => node.type === Text && node.props.children === '이 기기에 저장하지 못했어요',
    )).toHaveLength(1);
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining('민감한'));

    await changeText(tree, '복구 원문');
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '원문 초안 저장됨')).toHaveLength(1);
    await unmount(tree);
  });

  it('A→B→A 전환 중 늦게 끝난 첫 A 저장소 응답을 현재 A editor에 넣지 않는다', async () => {
    const oldAccountA = deferred();
    mockReadDraft
      .mockReturnValueOnce(oldAccountA.promise)
      .mockResolvedValueOnce({ version: 1, rawText: 'B 원문', updatedAt: 2 })
      .mockResolvedValueOnce({ version: 1, rawText: '새 A 원문', updatedAt: 3 });
    const tree = await renderScreen();

    mockUserEmail = 'b@example.com';
    await act(async () => tree.update(<BrainDumpScreen />));
    expect(input(tree).props.defaultValue).toBe('B 원문');

    mockUserEmail = 'a@example.com';
    await act(async () => tree.update(<BrainDumpScreen />));
    expect(input(tree).props.defaultValue).toBe('새 A 원문');

    await act(async () => oldAccountA.resolve({ version: 1, rawText: '오래된 A 원문', updatedAt: 1 }));
    expect(input(tree).props.defaultValue).toBe('새 A 원문');
    await unmount(tree);
  });

  it('계정 전환 뒤 늦은 AI 응답을 새 계정 화면과 사용량에 반영하지 않는다', async () => {
    const oldAnalysis = deferred();
    mockSubmitBrainDump.mockReturnValueOnce(oldAnalysis.promise);
    const tree = await renderScreen();
    await changeText(tree, 'A 원문');
    await act(async () => { void control(tree, 'AI 분석').props.onPress(); await Promise.resolve(); });

    mockUserEmail = 'b@example.com';
    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: 'B 원문', updatedAt: 2 });
    await act(async () => tree.update(<BrainDumpScreen />));
    expect(input(tree).props.defaultValue).toBe('B 원문');

    await act(async () => oldAnalysis.resolve(RESULT));
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === '발표 준비 선택')).toHaveLength(0);
    expect(mockInvalidateAfterAi).not.toHaveBeenCalled();
    await unmount(tree);
  });

  it('IME 비제어 입력과 refined 평면 표현, 작은 폭 스크롤을 유지한다', async () => {
    const tree = await renderScreen();
    const dumpInput = input(tree);
    const back = control(tree, '뒤로');
    const scroll = tree.root.findByType(ScrollView);
    const card = tree.root.findByType(RetroCard);
    const button = tree.root.findAllByType(RetroButton).find((candidate) => candidate.props.label === 'AI 분석');
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

  it('등록 성공 뒤 초안 삭제 실패는 재등록하지 않고 성공 이동과 오류 안내를 유지한다', async () => {
    mockSubmitBrainDump.mockResolvedValue(RESULT);
    mockConfirmBrainDump.mockResolvedValue([]);
    mockClearDraft.mockRejectedValueOnce(new Error('민감한 삭제 오류'));
    const tree = await renderScreen();
    await changeText(tree, '등록할 원문');
    await analyze(tree);

    const add = control(tree, '선택한 3개 등록');
    await act(async () => add.props.onPress());

    expect(mockConfirmBrainDump).toHaveBeenCalledTimes(1);
    expect(mockClearDraft).toHaveBeenCalledWith('a@example.com');
    expect(mockToastError).toHaveBeenCalledWith('할 일은 등록했지만 원문 초안을 지우지 못했어요.');
    expect(mockToastError.mock.calls.flat().join(' ')).not.toContain('민감한 삭제 오류');
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(control(tree, '선택한 3개 등록').props.disabled).toBe(true);
    await act(async () => add.props.onPress());
    expect(mockConfirmBrainDump).toHaveBeenCalledTimes(1);
    await unmount(tree);
  });

  it('A→B→A 뒤 끝난 예전 등록 응답은 현재 A 초안을 지우거나 이동하지 않는다', async () => {
    const confirm = deferred();
    mockSubmitBrainDump.mockResolvedValue(RESULT);
    mockConfirmBrainDump.mockReturnValue(confirm.promise);
    const tree = await renderScreen();
    await changeText(tree, '첫 A 원문');
    await analyze(tree);
    await act(async () => { void control(tree, '선택한 3개 등록').props.onPress(); await Promise.resolve(); });

    mockUserEmail = 'b@example.com';
    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: 'B 원문', updatedAt: 2 });
    await act(async () => tree.update(<BrainDumpScreen />));
    mockUserEmail = 'a@example.com';
    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: '새 A 원문', updatedAt: 3 });
    await act(async () => tree.update(<BrainDumpScreen />));

    await act(async () => confirm.resolve([]));
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(input(tree).props.defaultValue).toBe('새 A 원문');
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    await unmount(tree);
  });

  it('같은 계정으로 화면을 다시 연 뒤 끝난 예전 등록 응답은 새 초안을 지우지 않는다', async () => {
    const confirm = deferred();
    mockSubmitBrainDump.mockResolvedValue(RESULT);
    mockConfirmBrainDump.mockReturnValue(confirm.promise);
    const first = await renderScreen();
    await changeText(first, '이전 화면 원문');
    await analyze(first);
    await act(async () => { void control(first, '선택한 3개 등록').props.onPress(); await Promise.resolve(); });
    await unmount(first);

    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: '다시 연 화면 원문', updatedAt: 4 });
    const current = await renderScreen();
    await act(async () => confirm.resolve([]));
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(input(current).props.defaultValue).toBe('다시 연 화면 원문');
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    await unmount(current);
  });

  it('등록 후 조회 갱신 중 화면이 바뀌면 예전 성공 안내와 이동을 실행하지 않는다', async () => {
    const invalidation = deferred();
    mockSubmitBrainDump.mockResolvedValue(RESULT);
    mockConfirmBrainDump.mockResolvedValue([]);
    mockInvalidateQueries.mockReturnValueOnce(invalidation.promise);
    const tree = await renderScreen();
    await changeText(tree, '등록할 원문');
    await analyze(tree);
    await act(async () => { void control(tree, '선택한 3개 등록').props.onPress(); await Promise.resolve(); });
    expect(mockClearDraft).toHaveBeenCalledWith('a@example.com');

    mockUserEmail = 'b@example.com';
    await act(async () => tree.update(<BrainDumpScreen />));
    await act(async () => invalidation.resolve());
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    await unmount(tree);
  });

  it('재분석 실패 시 기존 결과와 원문을 보존하고 5점 안내를 유지한다', async () => {
    mockSubmitBrainDump.mockResolvedValueOnce(RESULT).mockRejectedValueOnce(new Error('재분석 실패'));
    const tree = await renderScreen();
    await changeText(tree, '보존할 원문');
    await analyze(tree);

    await act(async () => control(tree, '다시 분석').props.onPress());

    expect(control(tree, '발표 준비 선택', 'checkbox')).toBeTruthy();
    expect(tree.root.findAllByType(RetroBadge).some((badge) => badge.props.text === '5점')).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith('재분석 실패');
    await unmount(tree);
  });
});

describe('브레인 덤프 나가기', () => {
  it('화면과 하드웨어 뒤로가기는 저장한 원문을 지우지 않고 바로 이동한다', async () => {
    const tree = await renderScreen();
    await changeText(tree, '남겨둘 원문');

    await act(async () => control(tree, '뒤로').props.onPress());
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(mockHardwareBackHandler()).toBe(true);
    expect(mockRouterBack).toHaveBeenCalledTimes(2);
    expect(mockClearDraft).not.toHaveBeenCalled();
    await unmount(tree);
  });

  it('로그아웃으로 화면이 내려간 뒤 캡처된 입력 callback은 초안을 되살리지 않는다', async () => {
    const tree = await renderScreen();
    const oldInput = input(tree);
    const lateInput = oldInput.props.onChangeText;
    await unmount(tree);

    lateInput('늦은 로그아웃 입력');

    expect(mockWriteDraft).not.toHaveBeenCalled();
  });

  it('지우기 확인 뒤 진행 중 입력을 막고 원문·결과·저장 키를 함께 없앤다', async () => {
    const clearing = deferred();
    mockClearDraft.mockReturnValueOnce(clearing.promise);
    const tree = await renderScreen();
    await changeText(tree, '지울 원문');
    const oldInput = input(tree);

    await act(async () => control(tree, '지우기').props.onPress());
    const destructive = Alert.alert.mock.calls[0][2].find((button) => button.text === '지우기');
    await act(async () => { void destructive.onPress(); await Promise.resolve(); });
    await act(async () => oldInput.props.onChangeText('늦은 입력'));
    expect(mockWriteDraft).toHaveBeenCalledTimes(1);

    await act(async () => clearing.resolve());
    expect(mockClearDraft).toHaveBeenCalledWith('a@example.com');
    expect(input(tree).props.defaultValue).toBe('');
    await unmount(tree);
  });

  it('화면이 내려간 뒤 남은 지우기 Alert callback은 새로 연 A 초안을 지우지 않는다', async () => {
    const first = await renderScreen();
    await changeText(first, '이전 화면 원문');
    await act(async () => control(first, '지우기').props.onPress());
    const destructive = Alert.alert.mock.calls[0][2].find((button) => button.text === '지우기');
    await unmount(first);

    mockReadDraft.mockResolvedValueOnce({ version: 1, rawText: '새로 연 A 원문', updatedAt: 5 });
    const current = await renderScreen();
    await act(async () => destructive.onPress());

    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(input(current).props.defaultValue).toBe('새로 연 A 원문');
    await unmount(current);
  });
});
