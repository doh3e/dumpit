const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { ScrollView, SectionList, StyleSheet, Text, View } = require('react-native');

let mockTheme;
let mockPlanningResult;
let mockWindowWidth = 320;
const mockBack = jest.fn();
const mockMutate = jest.fn();
const mockPresent = jest.fn();
const mockToastError = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 800, scale: 1, fontScale: 1 }),
}));

jest.mock('../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('../query/hooks', () => ({
  usePlanning: () => mockPlanningResult,
  useToggleTask: () => ({ mutate: mockMutate }),
}));
jest.mock('../components/retro/ToastProvider', () => ({
  useToast: () => ({ error: mockToastError }),
}));
jest.mock('expo-router', () => {
  const Stack = () => null;
  function StackScreen() { return null; }
  Stack.Screen = StackScreen;
  return { Stack, router: { back: mockBack } };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 20, left: 0 }),
}));
jest.mock('../components/task/TaskDetailSheet', () => {
  const React = require('react');
  const MockTaskDetailSheet = React.forwardRef(function MockTaskDetailSheet(_props, ref) {
    React.useImperativeHandle(ref, () => ({ present: mockPresent }));
    return null;
  });
  MockTaskDetailSheet.displayName = 'MockTaskDetailSheet';
  return { TaskDetailSheet: MockTaskDetailSheet };
});

const { composeTheme } = require('../theme/compose');
const { contrastRatio } = require('../theme/contrast');
const { BG_SKINS, CHROME_SKINS } = require('../theme/skins');
const { resolveFonts } = require('../theme/typography');
const TaskBoardScreen = require('../../app/task-board').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme(scheme = 'light', equipments = null, highContrast = false) {
  mockTheme = {
    ...composeTheme(scheme, equipments, { highContrast }),
    fonts: resolveFonts(false),
    scheme,
  };
}

function task(overrides = {}) {
  return {
    taskId: 'task-1',
    parentTaskId: null,
    title: '태스크',
    description: null,
    status: 'TODO',
    category: 'WORK',
    aiPriorityScore: 0.7,
    userPriorityScore: null,
    effectivePriority: 0.7,
    deadline: null,
    estimatedMinutes: 30,
    startTime: null,
    endTime: null,
    isLocked: false,
    routineId: null,
    routineScheduledDate: null,
    syncSource: 'LOCAL',
    createdAt: '2026-09-12T09:00:00',
    completedAt: null,
    stickerCode: null,
    coinsGranted: 0,
    ...overrides,
  };
}

function planningSections(overrides = {}) {
  return {
    overdue: [],
    today: [],
    tomorrow: [],
    next7Days: [],
    later: [],
    someday: [],
    recentDone: [],
    ...overrides,
  };
}

async function render() {
  let tree;
  await act(async () => { tree = create(<TaskBoardScreen />); });
  return tree;
}

function byLabel(tree, label) {
  return tree.root.find((node) =>
    node.props.accessibilityLabel === label
    && typeof node.props.onPress === 'function');
}

function controlStyle(node, pressed = false) {
  return StyleSheet.flatten(typeof node.props.style === 'function'
    ? node.props.style({ pressed }) : node.props.style);
}

function sectionData(tree, key) {
  return tree.root.findByType(SectionList).props.sections
    .find((section) => section.key === key).data;
}

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  setTheme();
  mockPlanningResult = { data: { sections: planningSections() } };
  mockWindowWidth = 320;
  mockBack.mockReset();
  mockMutate.mockReset();
  mockPresent.mockReset();
  mockToastError.mockReset();
});

describe('태스크 전체 화면 정렬', () => {
  it('제목과 분리된 가로 행에서 48dp 무테두리 단일 선택과 눌림 피드백을 제공한다', async () => {
    const tree = await render();
    const title = tree.root.find((node) => node.type === Text && node.props.children === '태스크 전체');
    const [sortRow] = tree.root.findAllByType(ScrollView);
    const priority = byLabel(tree, '중요도순');
    const deadline = byLabel(tree, '마감순');

    expect(title.parent.findAll((node) => ['중요도순', '마감순'].includes(node.props.accessibilityLabel))).toHaveLength(0);
    expect(sortRow.findAll((node) => node === priority)).toHaveLength(1);
    expect(sortRow.findAll((node) => node === deadline)).toHaveLength(1);
    expect(StyleSheet.flatten(title.props.style)).toEqual(expect.objectContaining({ flex: 1, minWidth: 0 }));
    expect(sortRow.props.horizontal).toBe(true);
    expect(sortRow.props.showsHorizontalScrollIndicator).toBe(false);
    expect(StyleSheet.flatten(sortRow.props.style)).toEqual(expect.objectContaining({ flexGrow: 0, flexShrink: 0 }));
    expect(StyleSheet.flatten(sortRow.props.contentContainerStyle)).toEqual(expect.objectContaining({
      paddingHorizontal: 16,
      gap: 4,
    }));

    mockWindowWidth = 1200;
    await act(async () => tree.update(<TaskBoardScreen />));
    expect(StyleSheet.flatten(title.parent.props.style)).toEqual(expect.objectContaining({
      paddingLeft: 236,
      paddingRight: 236,
    }));
    expect(StyleSheet.flatten(sortRow.props.contentContainerStyle)).toEqual(expect.objectContaining({
      paddingLeft: 236,
      paddingRight: 236,
    }));
    expect(StyleSheet.flatten(tree.root.findByType(SectionList).props.contentContainerStyle))
      .toEqual(expect.objectContaining({ paddingLeft: 236, paddingRight: 236 }));
    expect(byLabel(tree, '중요도순').props.accessibilityState).toEqual({ selected: true });

    mockWindowWidth = 600;
    await act(async () => tree.update(<TaskBoardScreen />));
    expect(StyleSheet.flatten(title.parent.props.style)).toEqual(expect.objectContaining({
      paddingLeft: 16,
      paddingRight: 16,
    }));

    for (const [control, selected] of [[priority, true], [deadline, false]]) {
      const resting = controlStyle(control);
      const pressed = controlStyle(control, true);
      const label = control.find((node) => node.type === Text && ['중요도순', '마감순'].includes(node.props.children));
      const marker = control.find((node) => node.type === View
        && node.props.accessible === false
        && StyleSheet.flatten(node.props.style)?.width === 18
        && StyleSheet.flatten(node.props.style)?.height === 2);

      expect(control.props.accessibilityRole).toBe('button');
      expect(control.props.accessibilityState).toEqual({ selected });
      expect(resting.borderWidth ?? 0).toBe(0);
      expect(resting.backgroundColor).toBe('transparent');
      expect(resting.minWidth).toBeGreaterThanOrEqual(48);
      expect(resting.minHeight).toBeGreaterThanOrEqual(48);
      expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
      expect(label.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(label.props.style).fontSize).toBe(12);
      expect(StyleSheet.flatten(marker.props.style).backgroundColor)
        .toBe(selected ? mockTheme.colors.accent2Text : 'transparent');
    }

    await act(async () => deadline.props.onPress());
    expect(byLabel(tree, '중요도순').props.accessibilityState).toEqual({ selected: false });
    expect(byLabel(tree, '마감순').props.accessibilityState).toEqual({ selected: true });
    await unmount(tree);
  });

  it('일반 버킷만 선택한 정책으로 다시 정렬하고 마감 지남은 항상 마감순으로 유지한다', async () => {
    const todayA = task({ taskId: 'today-a', title: '오늘 A', effectivePriority: 0.9, deadline: '2026-09-12T18:00:00' });
    const todayB = task({ taskId: 'today-b', title: '오늘 B', effectivePriority: 0.3, deadline: '2026-09-12T12:00:00' });
    const overdueA = task({ taskId: 'overdue-a', title: '지남 A', effectivePriority: 0.9, deadline: '2026-09-11T18:00:00' });
    const overdueB = task({ taskId: 'overdue-b', title: '지남 B', effectivePriority: 0.3, deadline: '2026-09-11T12:00:00' });
    mockPlanningResult = { data: { sections: planningSections({
      today: [todayA, todayB],
      overdue: [overdueA, overdueB],
    }) } };
    const tree = await render();

    expect(sectionData(tree, 'today').map((item) => item.taskId)).toEqual(['today-a', 'today-b']);
    expect(sectionData(tree, 'overdue').map((item) => item.taskId)).toEqual(['overdue-b', 'overdue-a']);
    await act(async () => byLabel(tree, '마감순').props.onPress());
    expect(sectionData(tree, 'today').map((item) => item.taskId)).toEqual(['today-b', 'today-a']);
    expect(sectionData(tree, 'overdue').map((item) => item.taskId)).toEqual(['overdue-b', 'overdue-a']);
    await act(async () => byLabel(tree, '중요도순').props.onPress());
    expect(sectionData(tree, 'today').map((item) => item.taskId)).toEqual(['today-a', 'today-b']);

    await act(async () => byLabel(tree, '뒤로').props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
    const detail = tree.root.find((node) => node.props.accessibilityHint === '상세 보기'
      && node.props.accessibilityLabel.startsWith(todayA.title));
    const checkbox = tree.root.find((node) => node.props.accessibilityLabel === `${todayA.title} 완료`);
    await act(async () => detail.props.onPress());
    await act(async () => checkbox.props.onPress({ nativeEvent: { pageX: 12, pageY: 34 } }));
    expect(mockPresent).toHaveBeenCalledWith(todayA);
    expect(mockMutate).toHaveBeenCalledWith(
      { taskId: todayA.taskId, status: 'DONE' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    await unmount(tree);
  });

  it.each(['light', 'dark'])('%s 기본·고대비와 스킨에서 배경·눌림 표면의 라벨과 선택 선 대비를 지킨다', async (scheme) => {
    const equipmentCases = [
      null,
      ...Object.keys(BG_SKINS).map((skin) => ({ BACKGROUND: `bg.${skin}` })),
      ...Object.keys(CHROME_SKINS).map((skin) => ({ CHROME: `chrome.${skin}` })),
      { BACKGROUND: 'bg.galaxy', CHROME: 'chrome.candy' },
      { BACKGROUND: 'bg.candy', CHROME: 'chrome.galaxy' },
    ];

    for (const equipments of equipmentCases) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, equipments, highContrast);
        const tree = await render();
        const surface = tree.root.find((node) => node.type === View
          && StyleSheet.flatten(node.props.style)?.flex === 1
          && StyleSheet.flatten(node.props.style)?.paddingTop === 12);
        expect(StyleSheet.flatten(surface.props.style).backgroundColor).toBeUndefined();

        for (const labelText of ['중요도순', '마감순']) {
          const control = byLabel(tree, labelText);
          const label = control.find((node) => node.type === Text && node.props.children === labelText);
          const labelColor = StyleSheet.flatten(label.props.style).color;
          expect(contrastRatio(labelColor, mockTheme.colors.bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(labelColor, mockTheme.colors.chip)).toBeGreaterThanOrEqual(4.5);
        }

        const marker = byLabel(tree, '중요도순').find((node) => node.type === View
          && node.props.accessible === false
          && StyleSheet.flatten(node.props.style)?.width === 18
          && StyleSheet.flatten(node.props.style)?.height === 2);
        const markerColor = StyleSheet.flatten(marker.props.style).backgroundColor;
        expect(contrastRatio(markerColor, mockTheme.colors.bg)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(markerColor, mockTheme.colors.chip)).toBeGreaterThanOrEqual(3);
        await unmount(tree);
      }
    }
  });
});
