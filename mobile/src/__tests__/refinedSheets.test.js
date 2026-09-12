const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Alert, StyleSheet, Text, View } = require('react-native');

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
  function Scroll({ children, contentContainerStyle, ...props }) {
    return <View testID="bottom-sheet-scroll-content" style={contentContainerStyle} {...props}>{children}</View>;
  }
  return { BottomSheetModal: Modal, BottomSheetView: View, BottomSheetScrollView: Scroll, BottomSheetTextInput: TextInput };
});
jest.mock('../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 12 }) }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: ['sticker.star'], isLoading: false }),
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
jest.mock('expo-router', () => ({ useFocusEffect: (effect) => effect() }));
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

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme() {
  mockTheme = { ...composeTheme('light', null, { highContrast: false }), fonts: resolveFonts(false), scheme: 'light' };
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
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(style(scroll).paddingBottom).toBeGreaterThanOrEqual(24);
    await act(async () => tree.unmount());
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

  it('서브태스크 제안은 로딩 뒤 선택한 항목만 실제 확정 요청으로 넘긴다', async () => {
    const pending = deferred();
    mockProposeSplit.mockReturnValue(pending.promise);
    const proposed = { subtasks: [
      { title: '첫 단계', description: '설명', estimatedMinutes: 10 },
      { title: '둘째 단계', description: null, estimatedMinutes: 20 },
    ] };
    const ref = React.createRef();
    const tree = await render(<SubtaskProposalSheet ref={ref} onCreated={jest.fn()} />);
    await act(async () => ref.current.present({ taskId: 'task-1', title: '긴 태스크', status: 'TODO' }));
    expect(tree.root.find((node) => node.type === Text && node.props.children === 'AI가 잘게 쪼개는 중…')).toBeTruthy();
    await act(async () => pending.resolve(proposed));
    const second = tree.root.find((node) => node.props.accessibilityLabel === '둘째 단계 포함');
    await act(async () => second.props.onPress());
    await act(async () => control(tree, '1개 만들기').props.onPress());
    expect(mockConfirmSplit).toHaveBeenCalledWith('task-1', [expect.objectContaining({ title: '첫 단계', estimatedMinutes: 10 })]);
    await act(async () => control(tree, '서브태스크 제안 닫기').props.onPress());
    expect(mockDismiss).toHaveBeenCalled();
    await act(async () => tree.unmount());
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
    expect(tree.root.findAll((node) => node.props.testID === 'bottom-sheet-scroll-content')
      .some((node) => style(node).paddingBottom >= 24 && node.props.keyboardShouldPersistTaps === 'handled')).toBe(true);
    await act(async () => change.props.onPress());
    await act(async () => control(tree, '시작 10시').props.onPress());
    await act(async () => control(tree, '저장').props.onPress());
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
    const pickerSheet = tree.root.find((node) => node.props.testID === 'bottom-sheet-modal' && node.props.maxDynamicContentSize != null);
    expect(pickerSheet.props.accessibilityState.expanded).toBe(true);
    await act(async () => start.props.onPress());
    expect(mockStartSession).toHaveBeenCalledWith(expect.objectContaining({ focusMin: 25 }), null);
    await act(async () => tree.unmount());
  });
});
