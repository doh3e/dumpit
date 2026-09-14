const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Alert, Keyboard, Platform, StyleSheet, Text, View } = require('react-native');

Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

let mockTheme;
const mockOnChange = jest.fn();
const mockDismiss = jest.fn();
const mockCreateTask = jest.fn();
const mockProposeSplit = jest.fn();
const mockConfirmSplit = jest.fn();
const mockDeleteTask = jest.fn();
const mockSetSticker = jest.fn();
const mockPatchTask = jest.fn();
const mockToastError = jest.fn();
const mockSaveSettings = jest.fn();
const mockStartSession = jest.fn();
const mockPauseSession = jest.fn();
const mockResumeSession = jest.fn();
let mockWindowWidth = 320;
let mockWindowHeight = 800;
let mockQueryData = ['sticker.star'];
let mockKeyboardMetrics = null;
let mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 700 };
let mockDeferViewportMeasurement = false;
let mockPendingViewportMeasurements = [];
const mockKeyboardListeners = {
  keyboardDidShow: new Set(),
  keyboardDidHide: new Set(),
};

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: mockWindowHeight, scale: 1, fontScale: 1 }),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { TextInput, View } = require('react-native');
  const Modal = React.forwardRef(function Modal({ children, onChange, onDismiss, ...props }, ref) {
    const [open, setOpen] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => { setOpen(true); onChange?.(0); },
      dismiss: () => { setOpen(false); onChange?.(-1); onDismiss?.(); mockDismiss(); },
    }));
    return <View testID="bottom-sheet-modal" accessibilityState={{ expanded: open }} {...props}>{children}</View>;
  });
  const Scroll = React.forwardRef(function Scroll({ children, contentContainerStyle, ...props }, ref) {
    React.useImperativeHandle(ref, () => ({
      measureInWindow: (callback) => {
        const measure = () => callback(
          mockSheetViewportFrame.x,
          mockSheetViewportFrame.y,
          mockSheetViewportFrame.width,
          mockSheetViewportFrame.height,
        );
        if (mockDeferViewportMeasurement) mockPendingViewportMeasurements.push(measure);
        else measure();
      },
    }));
    return <View testID="bottom-sheet-scroll-content" style={contentContainerStyle} contentContainerStyle={contentContainerStyle} {...props}>{children}</View>;
  });
  return { BottomSheetModal: Modal, BottomSheetView: View, BottomSheetScrollView: Scroll, BottomSheetTextInput: TextInput };
});
jest.mock('../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 8, left: 12 }) }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockQueryData, isLoading: false, isFetching: false }),
  useQueryClient: () => ({ cancelQueries: jest.fn(), getQueryData: jest.fn(), setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
}));
jest.mock('../query/hooks', () => ({
  usePlanning: () => ({ data: { tasks: [] } }),
  useAiUsage: () => ({ data: { remaining: 100 } }),
  invalidateAfterAi: jest.fn(),
}));
jest.mock('../api/tasks', () => ({
  createTask: (...args) => mockCreateTask(...args),
  proposeSplit: (...args) => mockProposeSplit(...args),
  confirmSplit: (...args) => mockConfirmSplit(...args),
  deleteTask: (...args) => mockDeleteTask(...args),
  setSticker: (...args) => mockSetSticker(...args),
  patchTask: (...args) => mockPatchTask(...args), reanalyzeTask: jest.fn(),
}));
jest.mock('../api/shop', () => ({ fetchOwnedStickers: jest.fn() }));
jest.mock('../query/routineHooks', () => ({
  useUserSettings: () => ({ data: { routineStartHour: 9, routineEndHour: 22, notificationsEnabled: true, notificationThresholds: [60], briefingEnabled: true } }),
  useSaveSettings: () => ({ mutate: (...args) => mockSaveSettings(...args), isPending: false }),
}));
jest.mock('../components/retro/ToastProvider', () => ({ useToast: () => ({ show: jest.fn(), error: mockToastError }) }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect) => effect(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../components/shell/ScreenHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ScreenHeader: ({ title }) => <Text accessibilityRole="header">{title}</Text> };
});
jest.mock('../components/pomodoro/TimerRing', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { TimerRing: () => <View testID="timer-ring" /> };
});
jest.mock('../pomodoro/notifications', () => ({ requestNotificationPermission: jest.fn(async () => true), checkExactAlarm: jest.fn(async () => true), openAlarmSettings: jest.fn() }));
jest.mock('../pomodoro/persistence', () => ({ loadSettings: jest.fn(async () => ({ focusMin: 25, breakMin: 5, longBreakMin: 15, longBreakEvery: 4, setsTarget: 4 })), saveSettings: jest.fn() }));
jest.mock('../pomodoro/store', () => ({
  getSession: () => null,
  subscribe: () => () => {}, reconcile: jest.fn(), resetSession: jest.fn(async () => true),
  pauseSession: (...args) => mockPauseSession(...args), resumeSession: (...args) => mockResumeSession(...args),
  startSession: (...args) => mockStartSession(...args),
}));

const { composeTheme } = require('../theme/compose');
const { contrastRatio } = require('../theme/contrast');
const { BG_SKINS } = require('../theme/skins');
const { resolveFonts } = require('../theme/typography');
const { DateTimeField } = require('../components/task/DateTimeField');
const { TimeField } = require('../components/task/TimeField');
const { TaskPickerSheet } = require('../components/pomodoro/TaskPickerSheet');
const { PomodoroSettingsSheet } = require('../components/pomodoro/PomodoroSettingsSheet');
const { ActiveHoursCard } = require('../components/routine/ActiveHoursCard');
const { NotificationSettingsCard } = require('../components/settings/NotificationSettingsCard');
const { AddTaskSheet } = require('../components/task/AddTaskSheet');
const { SubtaskProposalSheet } = require('../components/task/SubtaskProposalSheet');
const { StickerPicker } = require('../components/task/StickerPicker');
const { TaskDetailSheet } = require('../components/task/TaskDetailSheet');
const PomodoroScreen = require('../../app/pomodoro').default;
const IdeaEditScreen = require('../../app/idea-edit').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme(scheme = 'light', equipments = null, highContrast = false) {
  mockTheme = { ...composeTheme(scheme, equipments, { highContrast }), fonts: resolveFonts(false), scheme };
}

async function render(element) {
  let tree;
  await act(async () => { tree = create(element); });
  return tree;
}

function control(tree, label) {
  return tree.root.find((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
}

function style(node, pressed = false) {
  return StyleSheet.flatten(typeof node.props.style === 'function' ? node.props.style({ pressed }) : node.props.style);
}

function deferred() {
  let resolve;
  const promise = new Promise((onResolve) => { resolve = onResolve; });
  return { promise, resolve };
}

async function emitKeyboard(eventName, metrics = null) {
  mockKeyboardMetrics = metrics;
  await act(async () => {
    for (const listener of mockKeyboardListeners[eventName]) {
      listener(metrics == null ? undefined : { endCoordinates: metrics, duration: 0, easing: 'keyboard' });
    }
  });
}

beforeEach(() => {
  setTheme();
  mockOnChange.mockReset();
  mockDismiss.mockReset();
  mockCreateTask.mockReset();
  mockProposeSplit.mockReset();
  mockConfirmSplit.mockReset();
  mockDeleteTask.mockReset();
  mockSetSticker.mockReset();
  mockPatchTask.mockReset();
  mockToastError.mockReset();
  mockSaveSettings.mockReset();
  mockStartSession.mockReset();
  mockPauseSession.mockReset();
  mockResumeSession.mockReset();
  mockWindowWidth = 320;
  mockWindowHeight = 800;
  mockQueryData = ['sticker.star'];
  mockKeyboardMetrics = null;
  mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 700 };
  mockDeferViewportMeasurement = false;
  mockPendingViewportMeasurements = [];
  mockKeyboardListeners.keyboardDidShow.clear();
  mockKeyboardListeners.keyboardDidHide.clear();
  Keyboard.metrics = jest.fn(() => mockKeyboardMetrics);
  Keyboard.addListener = jest.fn((eventName, listener) => {
    mockKeyboardListeners[eventName].add(listener);
    return { remove: jest.fn(() => mockKeyboardListeners[eventName].delete(listener)) };
  });
  mockCreateTask.mockResolvedValue({});
  mockProposeSplit.mockResolvedValue({ subtasks: [] });
  mockConfirmSplit.mockResolvedValue({});
  mockSetSticker.mockResolvedValue({ taskId: 'task-1' });
  mockPatchTask.mockResolvedValue({ taskId: 'task-1' });
  mockStartSession.mockResolvedValue();
  Alert.alert = jest.fn();
});

describe('일시 필드의 독립 조작과 취소', () => {
  it('지우기는 48dp 별도 조작이며 picker를 열지 않고, 날짜 취소는 값을 보존한다', async () => {
    const tree = await render(<DateTimeField value="2026-09-13T09:30" onChange={mockOnChange} />);
    const clear = control(tree, '일시 지우기');

    expect(style(clear).minHeight).toBeGreaterThanOrEqual(48);
    expect(style(clear).minWidth).toBeGreaterThanOrEqual(48);
    await act(async () => clear.props.onPress());
    expect(mockOnChange).toHaveBeenCalledWith(null);
    expect(tree.root.findAllByType('DateTimePicker')).toHaveLength(0);

    const choose = control(tree, '일시 선택, 현재 9/13 09:30');
    await act(async () => choose.props.onPress());
    const picker = tree.root.findByType('DateTimePicker');
    await act(async () => picker.props.onChange({ type: 'dismissed' }));
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });

  it('날짜를 고른 뒤 시간 취소는 값 변경 없이 닫고, 시간 단독 필드도 48dp다', async () => {
    const tree = await render(<DateTimeField value={null} onChange={mockOnChange} />);
    await act(async () => control(tree, '일시 선택, 현재 선택 안 함').props.onPress());
    await act(async () => tree.root.findByType('DateTimePicker').props.onChange({ type: 'set' }, new Date(2026, 8, 13, 0, 0)));
    await act(async () => tree.root.findByType('DateTimePicker').props.onChange({ type: 'dismissed' }));
    expect(mockOnChange).not.toHaveBeenCalled();
    await act(async () => tree.unmount());

    const time = await render(<TimeField value="09:30" onChange={mockOnChange} />);
    expect(style(control(time, '시간 선택, 현재 09:30')).minHeight).toBeGreaterThanOrEqual(48);
    await act(async () => control(time, '시간 선택, 현재 09:30').props.onPress());
    await act(async () => time.root.findByType('DateTimePicker').props.onChange({ type: 'dismissed' }));
    expect(mockOnChange).not.toHaveBeenCalled();
    await act(async () => time.unmount());
  });
});

describe('refined sheet의 제목·닫기·보조 조작', () => {
  it('태스크 추가 시트는 uncontrolled 제목 입력을 유지하고 취소가 선택 상태를 바꾸지 않는다', async () => {
    const ref = React.createRef();
    const tree = await render(<AddTaskSheet ref={ref} />);
    await act(async () => ref.current.present());
    const title = tree.root.find((node) => node.props.accessibilityLabel === '할 일 제목');
    expect(title.props.value).toBeUndefined();
    expect(title.props.defaultValue).toBe('');
    await act(async () => title.props.onChangeText('한글 조합 중인 태스크'));
    await act(async () => control(tree, '오늘까지').props.onPress());
    const deadline = control(tree, '오늘까지');
    const deadlineSurface = deadline.find(
      (node) => node.type === View && StyleSheet.flatten(node.props.style)?.borderWidth === 1.5 && node.props.accessible !== true,
    );
    expect(style(deadline).minHeight).toBeGreaterThanOrEqual(48);
    expect(style(deadline).flexBasis).toBe('48%');
    expect(deadlineSurface).toBeTruthy();
    const more = control(tree, '옵션 더보기 ▼');
    expect(style(more).borderWidth).toBeUndefined();
    await act(async () => control(tree, '취소').props.onPress());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(control(tree, 'AI가 알아서').props.accessibilityState.selected).toBe(true);
    expect(control(tree, '오늘까지').props.accessibilityState.selected).toBe(false);
    const modal = tree.root.find((node) => node.props.testID === 'bottom-sheet-modal');
    const scroll = tree.root.find((node) => node.props.testID === 'bottom-sheet-scroll-content');
    expect(modal.props.keyboardBehavior).toBe('interactive');
    expect(modal.props.keyboardBlurBehavior).toBe('restore');
    expect(modal.props.android_keyboardInputMode).toBe('adjustResize');
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.maxDynamicContentSize).toBe(744);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    expect(style(scroll).paddingBottom).toBeGreaterThanOrEqual(24);
    await act(async () => tree.unmount());
  });

  it('태스크 추가 시트는 폭·높이 변경에도 비제어 제목과 단일 생성 payload를 보존한다', async () => {
    const ref = React.createRef();
    const screen = () => <AddTaskSheet ref={ref} />;
    const tree = await render(screen());
    await act(async () => ref.current.present());
    const title = tree.root.find((node) => node.props.accessibilityLabel === '할 일 제목');
    await act(async () => title.props.onChangeText('  회전해도 남을 제목  '));

    mockWindowWidth = 1200;
    mockWindowHeight = 400;
    await act(async () => tree.update(screen()));
    const resizedTitle = tree.root.find((node) => node.props.accessibilityLabel === '할 일 제목');
    const modal = tree.root.findByProps({ testID: 'bottom-sheet-modal' });
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(resizedTitle).toBe(title);
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(modal.props.maxDynamicContentSize).toBe(344);
    expect(style(scroll).paddingLeft).toBeGreaterThan(16);
    expect(style(scroll).paddingRight).toBeGreaterThan(16);

    await act(async () => control(tree, '추가').props.onPress());
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: '회전해도 남을 제목' }));
    await act(async () => tree.unmount());
  });

  it('태스크 추가 시트는 실제 viewport-keyboard 겹침만 스크롤 여백으로 반영하고 수명주기를 정리한다', async () => {
    const ref = React.createRef();
    const screen = () => <AddTaskSheet ref={ref} />;
    const tree = await render(screen());
    await act(async () => ref.current.present());
    const title = tree.root.find((node) => node.props.accessibilityLabel === '할 일 제목');
    await act(async () => title.props.onChangeText('  키보드 회전 제목  '));
    const basePadding = style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom;

    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 500, width: 320, height: 300 });
    let scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(style(scroll).paddingBottom).toBe(basePadding + 300);
    expect(tree.root.find((node) => node.props.accessibilityLabel === '할 일 제목')).toBe(title);
    expect(mockCreateTask).not.toHaveBeenCalled();

    // Native adjustResize가 viewport를 이미 IME 위로 줄이면 실제 겹침은 0이다.
    mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 400 };
    await act(async () => scroll.props.onLayout?.({ nativeEvent: { layout: mockSheetViewportFrame } }));
    scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(style(scroll).paddingBottom).toBe(basePadding);

    // 새 native event보다 Dimensions가 먼저 바뀌어도 frame bottom으로 window-local top을 복원한다.
    mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 700 };
    await act(async () => scroll.props.onLayout?.({ nativeEvent: { layout: mockSheetViewportFrame } }));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 300);
    mockSheetViewportFrame = { x: 0, y: 0, width: 800, height: 600 };
    mockWindowWidth = 800;
    mockWindowHeight = 600;
    await act(async () => tree.update(screen()));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 300);

    // 반대 순서에서는 새 폭의 event 좌표를 그대로 쓰고 이중 이동하지 않는다.
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 340, width: 600, height: 260 });
    mockSheetViewportFrame = { x: 0, y: 20, width: 600, height: 420 };
    mockWindowWidth = 600;
    await act(async () => tree.update(screen()));
    await act(async () => scroll.props.onLayout?.({ nativeEvent: { layout: mockSheetViewportFrame } }));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 100);

    // Bottom split의 display-space keyboard frame은 window-local 좌표로 정규화한다.
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 565, width: 600, height: 62.5 });
    mockSheetViewportFrame = { x: 0, y: 48.25, width: 600, height: 426.75 };
    mockWindowHeight = 475;
    await act(async () => tree.update(screen()));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 62.5);

    // Native viewport가 local keyboard top까지 이미 줄어든 경우에는 이중 보정하지 않는다.
    mockSheetViewportFrame = { x: 0, y: 48.25, width: 600, height: 364.25 };
    await act(async () => scroll.props.onLayout?.({ nativeEvent: { layout: mockSheetViewportFrame } }));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    // 같은 폭의 height-only resize도 새 window height로 원점을 다시 계산한다.
    mockSheetViewportFrame = { x: 0, y: 0, width: 600, height: 400 };
    mockWindowHeight = 400;
    await act(async () => tree.update(screen()));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 62.5);

    // IME 전환 중 음수 height는 겹침으로 사용하지 않는다.
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 565, width: 600, height: -56 });
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    mockDeferViewportMeasurement = true;
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 200, width: 600, height: 400 });
    const staleMeasurements = mockPendingViewportMeasurements.splice(0);
    await emitKeyboard('keyboardDidHide');
    await act(async () => staleMeasurements.forEach((measure) => measure()));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);
    await act(async () => control(tree, '추가').props.onPress());
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: '키보드 회전 제목' }));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);
    await act(async () => tree.unmount());
    expect(mockKeyboardListeners.keyboardDidShow.size).toBe(0);
    expect(mockKeyboardListeners.keyboardDidHide.size).toBe(0);
  });

  it('키보드 겹침 보완은 Android에만 적용해 iOS의 기존 sheet keyboard 처리를 유지한다', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockKeyboardMetrics = { screenX: 0, screenY: 500, width: 320, height: 300 };
    const tree = await render(<AddTaskSheet ref={React.createRef()} />);
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(style(scroll).paddingBottom).toBe(32);
    expect(Keyboard.addListener).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  });

  it.each(['light', 'dark'])('%s 기본·고대비와 기존 스킨에서 옵션 라벨·화살표는 resting·pressed 표면 모두 4.5:1을 지킨다', async (scheme) => {
    for (const skin of [null, ...Object.keys(BG_SKINS)]) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, skin ? { BACKGROUND: `bg.${skin}` } : null, highContrast);
        const ref = React.createRef();
        const tree = await render(<AddTaskSheet ref={ref} />);
        await act(async () => ref.current.present());
        const more = control(tree, '옵션 더보기 ▼');
        const text = more.find((node) => node.type === Text && node.props.children === '옵션 더보기');
        const arrow = more.find((node) => node.type === Text && node.props.children === '▼');
        const resting = style(more);
        const pressed = style(more, true);

        expect(resting.backgroundColor).toBe('transparent');
        expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
        for (const node of [text, arrow]) {
          const textStyle = StyleSheet.flatten(node.props.style);
          expect(contrastRatio(textStyle.color, mockTheme.colors.card)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(textStyle.color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        }

        await act(async () => more.props.onPress());
        const close = control(tree, '옵션 접기 ▲');
        const closeText = close.find((node) => node.type === Text && node.props.children === '옵션 접기');
        const closeArrow = close.find((node) => node.type === Text && node.props.children === '▲');
        for (const node of [closeText, closeArrow]) {
          const textStyle = StyleSheet.flatten(node.props.style);
          expect(contrastRatio(textStyle.color, mockTheme.colors.card)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(textStyle.color, style(close, true).backgroundColor)).toBeGreaterThanOrEqual(4.5);
        }
        await act(async () => tree.unmount());
      }
    }
  });

  it('태스크 상세 저장 실패는 실제 오류 경로를 보이고, 닫기는 저장하지 않는다', async () => {
    mockPatchTask.mockRejectedValue(new Error('저장 실패'));
    const ref = React.createRef();
    const tree = await render(<TaskDetailSheet ref={ref} />);
    await act(async () => ref.current.present({
      taskId: 'task-1', title: '수정할 태스크', description: '메모', deadline: null, startTime: null,
      estimatedMinutes: null, category: 'OTHER', userPriorityScore: null, aiPriorityScore: 0.5,
      isLocked: false, stickerCode: null, parentTaskId: null,
    }));
    const title = tree.root.find((node) => node.props.accessibilityLabel === '제목');
    expect(title.props.value).toBeUndefined();
    expect(title.props.defaultValue).toBe('수정할 태스크');
    const modal = tree.root.find((node) => node.props.testID === 'bottom-sheet-modal'
      && node.props.snapPoints?.[0] === '72%');
    const scroll = modal.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.snapPoints).toEqual(['72%', '95%']);
    expect(modal.props.android_keyboardInputMode).toBe('adjustResize');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    await act(async () => control(tree, '저장').props.onPress());
    expect(mockPatchTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ title: '수정할 태스크' }));
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('저장에 실패했어요.'));
    await act(async () => control(tree, '삭제').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith('삭제', '이 할 일을 삭제할까요?', expect.any(Array));
    const deleteAction = Alert.alert.mock.calls[0][2].find((action) => action.style === 'destructive');
    await act(async () => deleteAction.onPress());
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
    const savedBeforeClose = mockPatchTask.mock.calls.length;
    await act(async () => control(tree, '태스크 상세 닫기').props.onPress());
    expect(mockDismiss).toHaveBeenCalled();
    expect(mockPatchTask).toHaveBeenCalledTimes(savedBeforeClose);
    await act(async () => tree.unmount());
  });

  it('태스크 상세는 IME 회전 중 제목 identity와 draft를 유지하고 실제 겹침만 보정해 한 번 저장한다', async () => {
    const ref = React.createRef();
    const screen = () => <TaskDetailSheet ref={ref} />;
    const tree = await render(screen());
    await act(async () => ref.current.present({
      taskId: 'task-keyboard', title: '상세 원본', description: '메모', deadline: null, startTime: null,
      estimatedMinutes: null, category: 'OTHER', userPriorityScore: null, aiPriorityScore: 0.5,
      isLocked: false, stickerCode: null, parentTaskId: 'parent-1',
    }));
    const title = tree.root.find((node) => node.props.accessibilityLabel === '제목');
    await act(async () => title.props.onChangeText('상세 회전 제목'));
    const detailScroll = () => tree.root.find(
      (node) => node.props.testID === 'bottom-sheet-modal' && node.props.snapPoints?.[0] === '72%',
    ).findByProps({ testID: 'bottom-sheet-scroll-content' });
    const basePadding = style(detailScroll()).paddingBottom;

    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 500, width: 320, height: 300 });
    expect(style(detailScroll()).paddingBottom).toBe(basePadding + 300);
    expect(mockPatchTask).not.toHaveBeenCalled();

    mockSheetViewportFrame = { x: 0, y: 40, width: 800, height: 560 };
    mockWindowWidth = 800;
    mockWindowHeight = 600;
    await act(async () => tree.update(screen()));
    expect(tree.root.find((node) => node.props.accessibilityLabel === '제목')).toBe(title);
    expect(style(detailScroll()).paddingBottom).toBe(basePadding + 300);
    expect(mockPatchTask).not.toHaveBeenCalled();

    await act(async () => control(tree, '저장').props.onPress());
    expect(mockPatchTask).toHaveBeenCalledTimes(1);
    expect(mockPatchTask).toHaveBeenCalledWith('task-keyboard', expect.objectContaining({ title: '상세 회전 제목' }));
    expect(style(detailScroll()).paddingBottom).toBe(basePadding);
    await act(async () => tree.unmount());
  });

  it('서브태스크 제안은 IME 회전 중 비제어 제목과 선택을 유지해 수정한 항목만 확정한다', async () => {
    const pending = deferred();
    mockProposeSplit.mockReturnValue(pending.promise);
    const proposed = { subtasks: [
      { title: '첫 단계', description: '설명', estimatedMinutes: 10 },
      { title: '둘째 단계', description: null, estimatedMinutes: 20 },
    ] };
    const ref = React.createRef();
    const onCreated = jest.fn();
    const screen = () => <SubtaskProposalSheet ref={ref} onCreated={onCreated} />;
    mockWindowWidth = 600;
    mockWindowHeight = 960;
    const tree = await render(screen());
    await act(async () => ref.current.present({ taskId: 'task-1', title: '긴 태스크', status: 'TODO' }));
    expect(tree.root.find((node) => node.type === Text && node.props.children === 'AI가 잘게 쪼개는 중…')).toBeTruthy();
    await act(async () => pending.resolve(proposed));
    const modal = tree.root.findByProps({ testID: 'bottom-sheet-modal' });
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.snapPoints).toEqual(['65%']);
    expect(modal.props.android_keyboardInputMode).toBe('adjustResize');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    const firstTitle = tree.root.findAll((node) => node.props.accessibilityLabel === '서브태스크 제목')[0];
    expect(firstTitle.props.value).toBeUndefined();
    expect(firstTitle.props.defaultValue).toBe('첫 단계');
    await act(async () => firstTitle.props.onChangeText('첫 단계 한글'));
    const second = tree.root.find((node) => node.props.accessibilityLabel === '둘째 단계 포함');
    await act(async () => second.props.onPress());
    expect(second.props.accessibilityState.checked).toBe(false);
    expect(control(tree, '1개 만들기')).toBeTruthy();
    expect(mockProposeSplit).toHaveBeenCalledTimes(1);
    expect(mockConfirmSplit).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();

    mockWindowWidth = 960;
    mockWindowHeight = 600;
    await act(async () => tree.update(screen()));
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === '서브태스크 제목')[0]).toBe(firstTitle);
    expect(firstTitle.props.value).toBeUndefined();

    mockWindowWidth = 600;
    mockWindowHeight = 960;
    await act(async () => tree.update(screen()));
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === '서브태스크 제목')[0]).toBe(firstTitle);
    expect(firstTitle.props.value).toBeUndefined();
    expect(second.props.accessibilityState.checked).toBe(false);
    expect(control(tree, '1개 만들기')).toBeTruthy();
    expect(mockProposeSplit).toHaveBeenCalledTimes(1);
    expect(mockConfirmSplit).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();

    await act(async () => control(tree, '1개 만들기').props.onPress());
    expect(mockConfirmSplit).toHaveBeenCalledTimes(1);
    expect(mockConfirmSplit).toHaveBeenCalledWith('task-1', [{
      title: '첫 단계 한글', description: '설명', estimatedMinutes: 10,
    }]);
    expect(onCreated).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });

  it('서브태스크 제안은 실제 viewport-keyboard 겹침만 여백으로 반영하고 해제한다', async () => {
    const pending = deferred();
    mockProposeSplit.mockReturnValue(pending.promise);
    const ref = React.createRef();
    const tree = await render(<SubtaskProposalSheet ref={ref} onCreated={jest.fn()} />);
    await act(async () => ref.current.present({ taskId: 'task-keyboard', title: '긴 태스크', status: 'TODO' }));
    await act(async () => pending.resolve({ subtasks: [{ title: '첫 단계', description: '설명', estimatedMinutes: 10 }] }));

    let scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    const basePadding = style(scroll).paddingBottom;
    expect(scroll.props.onLayout).toEqual(expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledTimes(2);

    // adjustResize가 viewport를 이미 IME 위로 줄이면 추가 겹침은 없다.
    mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 400 };
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 500, width: 320, height: 300 });
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    // 실제로 시트가 가려졌을 때만 보이는 viewport와 keyboard top의 차이를 더한다.
    mockSheetViewportFrame = { x: 0, y: 100, width: 320, height: 700 };
    await act(async () => scroll.props.onLayout({ nativeEvent: { layout: mockSheetViewportFrame } }));
    scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(style(scroll).paddingBottom).toBe(basePadding + 300);

    await emitKeyboard('keyboardDidHide');
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 500, width: 320, height: 300 });
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding + 300);
    await act(async () => control(tree, '서브태스크 제안 닫기').props.onPress());
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    mockDeferViewportMeasurement = true;
    await emitKeyboard('keyboardDidShow', { screenX: 0, screenY: 200, width: 320, height: 600 });
    const staleMeasurements = mockPendingViewportMeasurements.splice(0);
    await emitKeyboard('keyboardDidHide');
    await act(async () => staleMeasurements.forEach((measure) => measure()));
    expect(style(tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' })).paddingBottom).toBe(basePadding);

    await act(async () => tree.unmount());
    expect(mockKeyboardListeners.keyboardDidShow.size).toBe(0);
    expect(mockKeyboardListeners.keyboardDidHide.size).toBe(0);
  });

  it('서브태스크 제안은 Android에서만 fillParent와 restore keyboard 동작을 사용한다', async () => {
    const androidTree = await render(<SubtaskProposalSheet ref={React.createRef()} onCreated={jest.fn()} />);
    const androidModal = androidTree.root.findByProps({ testID: 'bottom-sheet-modal' });
    expect(androidModal.props.keyboardBehavior).toBe('fillParent');
    expect(androidModal.props.keyboardBlurBehavior).toBe('restore');
    await act(async () => androidTree.unmount());

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const iosTree = await render(<SubtaskProposalSheet ref={React.createRef()} onCreated={jest.fn()} />);
    const iosModal = iosTree.root.findByProps({ testID: 'bottom-sheet-modal' });
    expect(iosModal.props.keyboardBehavior).toBeUndefined();
    expect(iosModal.props.keyboardBlurBehavior).toBeUndefined();
    await act(async () => iosTree.unmount());
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  });

  it('스티커 선택과 떼기는 실제 선택 핸들러만 호출하고 48dp 표면을 유지한다', async () => {
    const onSelect = jest.fn();
    const tree = await render(<StickerPicker current="sticker.star" onSelect={onSelect} />);
    const sticker = tree.root.find((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel?.startsWith('스티커 '));
    expect(style(sticker).minHeight).toBeGreaterThanOrEqual(48);
    await act(async () => sticker.props.onPress());
    expect(onSelect).toHaveBeenCalledWith('sticker.star');
    await act(async () => control(tree, '떼기 ✕').props.onPress());
    expect(onSelect).toHaveBeenCalledWith(null);
    await act(async () => tree.unmount());
  });

  it('태스크 선택 시트의 닫기와 빈 선택은 각각 실제 dismiss와 pick 핸들러를 호출한다', async () => {
    const onPick = jest.fn();
    const ref = React.createRef();
    const tree = await render(<TaskPickerSheet ref={ref} onPick={onPick} />);
    expect(tree.root.find((node) => node.type === Text && node.props.accessibilityRole === 'header' && node.props.children === '무엇에 집중할까요?')).toBeTruthy();
    await act(async () => control(tree, '태스크 선택 닫기').props.onPress());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    await act(async () => control(tree, '태스크 없이 집중').props.onPress());
    expect(onPick).toHaveBeenCalledWith(null);
    expect(style(control(tree, '태스크 없이 집중')).minHeight).toBeGreaterThanOrEqual(48);
    const modal = tree.root.findByProps({ testID: 'bottom-sheet-modal' });
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.maxDynamicContentSize).toBe(Math.round(mockWindowHeight * 0.62));
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    mockWindowHeight = 100;
    await act(async () => tree.update(<TaskPickerSheet ref={ref} onPick={onPick} />));
    expect(tree.root.findByProps({ testID: 'bottom-sheet-modal' }).props.maxDynamicContentSize).toBe(44);
    await act(async () => tree.unmount());
  });

  it('타이머 설정의 증감·취소·적용은 실제 draft와 핸들러를 사용한다', async () => {
    const onApply = jest.fn();
    const ref = React.createRef();
    const tree = await render(<PomodoroSettingsSheet ref={ref} initial={{ focusMin: 25, breakMin: 5, longBreakMin: 15, longBreakEvery: 4, setsTarget: 4 }} onApply={onApply} />);
    await act(async () => control(tree, '집중 (분) 늘리기').props.onPress());
    expect(tree.root.find((node) => node.type === Text && node.props.children === 30)).toBeTruthy();
    await act(async () => control(tree, '타이머 설정 취소').props.onPress());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    await act(async () => ref.current.present());
    await act(async () => control(tree, '적용').props.onPress());
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ focusMin: 25 }));
    const modal = tree.root.findByProps({ testID: 'bottom-sheet-modal' });
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.maxDynamicContentSize).toBe(744);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    await act(async () => tree.unmount());
  });

  it('타이머 draft는 폭·높이 변경에 유지되고 적용 뒤 취소·재진입은 저장 baseline을 복원한다', async () => {
    const initial = { focusMin: 25, breakMin: 5, longBreakMin: 15, longBreakEvery: 4, setsTarget: 4 };
    const onApply = jest.fn();
    const ref = React.createRef();
    const screen = () => <PomodoroSettingsSheet ref={ref} initial={{ ...initial }} onApply={onApply} />;
    const tree = await render(screen());
    await act(async () => ref.current.present());
    await act(async () => control(tree, '집중 (분) 늘리기').props.onPress());

    mockWindowWidth = 1200;
    mockWindowHeight = 400;
    await act(async () => tree.update(screen()));
    expect(tree.root.find((node) => node.type === Text && node.props.children === 30)).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'bottom-sheet-modal' }).props.maxDynamicContentSize).toBe(344);
    await act(async () => control(tree, '적용').props.onPress());
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ focusMin: 30 }));

    await act(async () => control(tree, '타이머 설정 취소').props.onPress());
    await act(async () => ref.current.present());
    await act(async () => control(tree, '적용').props.onPress());
    expect(onApply).toHaveBeenLastCalledWith(expect.objectContaining({ focusMin: 25 }));
    await act(async () => tree.unmount());
  });

  it('상위 아이디어 선택 시트는 62% 상한·safe-area·읽기 폭과 탭 유지 정책을 함께 적용한다', async () => {
    mockQueryData = [];
    mockWindowWidth = 1200;
    mockWindowHeight = 400;
    const tree = await render(<IdeaEditScreen />);
    const parent = tree.root.find((node) => node.props.accessibilityRole === 'button'
      && node.findAll((child) => child.type === Text && String(child.props.children).includes('상위:')).length > 0);
    await act(async () => parent.props.onPress());

    const modal = tree.root.findByProps({ testID: 'bottom-sheet-modal' });
    const scroll = tree.root.findByProps({ testID: 'bottom-sheet-scroll-content' });
    expect(modal.props.topInset).toBe(36);
    expect(modal.props.maxDynamicContentSize).toBe(248);
    expect(style(scroll).paddingLeft).toBeGreaterThan(20);
    expect(style(scroll).paddingRight).toBeGreaterThan(20);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(Array.isArray(scroll.props.contentContainerStyle)).toBe(false);
    await act(async () => tree.unmount());
  });

  it('늦게 로드된 initial과 값이 바뀐 initial을 반영하되 동일한 새 객체로는 draft를 지우지 않는다', async () => {
    const onApply = jest.fn();
    const initial = { focusMin: 25, breakMin: 5, longBreakMin: 15, longBreakEvery: 4, setsTarget: 4 };
    const loaded = { ...initial, focusMin: 45 };
    const ref = React.createRef();
    const tree = await render(<PomodoroSettingsSheet ref={ref} initial={initial} onApply={onApply} />);

    await act(async () => {
      tree.update(<PomodoroSettingsSheet ref={ref} initial={loaded} onApply={onApply} />);
    });
    expect(tree.root.find((node) => node.type === Text && node.props.children === 45)).toBeTruthy();

    await act(async () => control(tree, '집중 (분) 늘리기').props.onPress());
    expect(tree.root.find((node) => node.type === Text && node.props.children === 50)).toBeTruthy();
    await act(async () => {
      tree.update(<PomodoroSettingsSheet ref={ref} initial={{ ...loaded }} onApply={onApply} />);
    });
    expect(tree.root.find((node) => node.type === Text && node.props.children === 50)).toBeTruthy();

    await act(async () => tree.unmount());
  });
});

describe('활동·알림 카드의 refined 시각 조작', () => {
  it('서버 저장 의미는 바꾸지 않고 카드와 선택 조작만 refined 48dp·8dp로 표시하며 실제 저장 핸들러를 호출한다', async () => {
    const tree = await render(<View><ActiveHoursCard /><NotificationSettingsCard /></View>);
    const change = control(tree, '변경');
    const threshold = control(tree, '1시간 전');

    expect(style(change).minHeight).toBeGreaterThanOrEqual(48);
    expect(style(threshold).minHeight).toBeGreaterThanOrEqual(48);
    expect(style(threshold).borderRadius).toBe(8);
    expect(style(threshold).opacity ?? 1).toBe(1);
    const activeModal = tree.root.find((node) => node.props.testID === 'bottom-sheet-modal' && node.props.keyboardBehavior === 'interactive');
    expect(activeModal.props.keyboardBlurBehavior).toBe('restore');
    expect(activeModal.props.topInset).toBe(36);
    expect(activeModal.props.maxDynamicContentSize).toBe(744);
    expect(Array.isArray(activeModal.findByProps({ testID: 'bottom-sheet-scroll-content' }).props.contentContainerStyle)).toBe(false);
    expect(tree.root.findAll((node) => node.props.testID === 'bottom-sheet-scroll-content')
      .some((node) => style(node).paddingBottom >= 24 && node.props.keyboardShouldPersistTaps === 'handled')).toBe(true);
    await act(async () => change.props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => control(tree, '활동 시간 저장').props.onPress());
    expect(mockSaveSettings).toHaveBeenCalledWith(
      { routineStartHour: 10, routineEndHour: 22 }, expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await act(async () => threshold.props.onPress());
    expect(mockSaveSettings).toHaveBeenCalledWith(
      { notificationThresholds: [] }, expect.objectContaining({ onSettled: expect.any(Function) }),
    );
    await act(async () => tree.unmount());
  });
});

describe('뽀모도로 일반 조작', () => {
  it('실제 화면에서 태스크 선택과 집중 시작이 refined 48dp 조작으로 동작한다', async () => {
    const tree = await render(<PomodoroScreen />);
    const picker = control(tree, '집중할 태스크 고르기');
    const start = control(tree, '집중 시작');

    expect(tree.root.find((node) => node.type === Text && node.props.accessibilityRole === 'header' && node.props.children === '뽀모도로')).toBeTruthy();
    expect(style(picker).minHeight).toBeGreaterThanOrEqual(48);
    expect(style(start).minHeight).toBeGreaterThanOrEqual(48);
    await act(async () => picker.props.onPress());
    const pickerSheet = tree.root.find((node) => node.props.testID === 'bottom-sheet-modal'
      && node.props.maxDynamicContentSize === Math.round(mockWindowHeight * 0.62));
    expect(pickerSheet.props.accessibilityState.expanded).toBe(true);
    await act(async () => start.props.onPress());
    expect(mockStartSession).toHaveBeenCalledWith(expect.objectContaining({ focusMin: 25 }), null);
    await act(async () => tree.unmount());
  });
});
