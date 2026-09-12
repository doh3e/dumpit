const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text, View } = require('react-native');

let mockTheme;
let mockSession = null;
const mockToastShow = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('../../../theme/useTheme', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../../retro/ToastProvider', () => ({
  useToast: () => ({ show: mockToastShow }),
}));
jest.mock('expo-router', () => ({
  router: { push: mockRouterPush },
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (factory) => factory(),
    withSequence: (...values) => values.at(-1),
    withSpring: (value) => value,
  };
});
jest.mock('../../../pomodoro/store', () => ({
  getSession: () => mockSession,
  subscribe: () => () => {},
}));

const { composeTheme } = require('../../../theme/compose');
const { contrastRatio } = require('../../../theme/contrast');
const { BG_SKINS, CHROME_SKINS } = require('../../../theme/skins');
const { resolveFonts } = require('../../../theme/typography');
const { DEFAULT_SETTINGS } = require('../../../pomodoro/engine');
const { AiBadge } = require('../AiBadge');
const { HomeAppBar } = require('../HomeAppBar');
const { NowHeroCard } = require('../NowHeroCard');
const { PomodoroCard } = require('../PomodoroCard');
const { TaskListCard } = require('../TaskListCard');
const { TaskRow } = require('../TaskRow');

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme(scheme = 'light', equipments = null, highContrast = false) {
  mockTheme = {
    ...composeTheme(scheme, equipments, { highContrast }),
    fonts: resolveFonts(false),
    scheme,
  };
}

async function render(element) {
  let tree;
  await act(async () => {
    tree = create(element);
  });
  return tree;
}

function byLabel(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

function pressableStyle(node, pressed = false) {
  const style = typeof node.props.style === 'function'
    ? node.props.style({ pressed })
    : node.props.style;
  return StyleSheet.flatten(style);
}

function aiSurfaceStyle(node, pressed = false) {
  const surface = node.props.children({ pressed });
  return StyleSheet.flatten(surface.props.style);
}

function actualHeight(node) {
  const style = pressableStyle(node);
  return Math.max(style.height ?? 0, style.minHeight ?? 0);
}

function accessibleAncestors(node) {
  const ancestors = [];
  let parent = node.parent;
  while (parent) {
    if (parent.props?.accessible === true) ancestors.push(parent);
    parent = parent.parent;
  }
  return ancestors;
}

function refinedCards(tree) {
  return tree.root.findAll(
    (node) => node.type === View
      && StyleSheet.flatten(node.props.style)?.borderRadius === 12
      && (StyleSheet.flatten(node.props.style)?.boxShadow ?? 'none') === 'none',
  );
}

function task(overrides = {}) {
  return {
    taskId: 'task-1',
    parentTaskId: null,
    title: '아주 길어져도 잘리지 않아야 하는 발표 자료 최종 검토',
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

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  setTheme();
  mockSession = null;
  mockToastShow.mockClear();
  mockRouterPush.mockClear();
});

describe('홈 헤더 자원 표시', () => {
  it('긴 인사와 코인 420·AI 잔여 68을 한 행에 유지한다', async () => {
    const greeting = '아주아주긴사용자이름의 덤프';
    const tree = await render(
      <HomeAppBar
        me={{ name: '아주아주긴사용자이름', coins: 420, equipments: {} }}
        aiUsage={{ used: 32, limit: 100, remaining: 68, resetAt: '2026-09-13T00:00:00' }}
      />,
    );

    const greetingText = tree.root.find(
      (node) => node.type === Text && node.props.accessibilityLabel === greeting,
    );
    const coin = tree.root.find((node) => node.props.accessibilityLabel === '코인 420개');
    const ai = byLabel(tree, 'AI 잔여 68점');
    const coinNumber = tree.root.find((node) => node.type === Text && node.props.children === 420);
    const aiNumber = tree.root.find((node) => node.type === Text && node.props.children === 68);
    const aiSurface = ai.find(
      (node) => node.type === View && StyleSheet.flatten(node.props.style)?.borderWidth === 1.5,
    );

    expect(greetingText.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(greetingText.props.style).fontFamily).toBe(mockTheme.fonts.displayBold);
    expect(coin.props.accessibilityRole).toBeUndefined();
    expect(pressableStyle(ai).minHeight).toBeGreaterThanOrEqual(48);
    expect(pressableStyle(ai).minWidth).toBeGreaterThanOrEqual(48);
    expect(aiSurface.props.accessible).toBeUndefined();
    expect(StyleSheet.flatten(coinNumber.props.style).fontFamily).toBe(mockTheme.fonts.chrome);
    expect(StyleSheet.flatten(aiNumber.props.style).fontFamily).toBe(mockTheme.fonts.chrome);

    await act(async () => ai.props.onPress());
    expect(mockToastShow).toHaveBeenCalledWith('오늘 AI 32/100점 사용 · 자정에 초기화돼요');
    await unmount(tree);
  });

  it('AI 사용량을 아직 받지 못했을 때 잔여 0으로 표시하지 않는다', async () => {
    const tree = await render(
      <HomeAppBar me={{ name: '덤핏', coins: 420, equipments: {} }} aiUsage={undefined} />,
    );

    expect(tree.root.findAll(
      (node) => typeof node.props.accessibilityLabel === 'string'
        && node.props.accessibilityLabel.startsWith('AI 잔여'),
    )).toHaveLength(0);
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === '코인 420개')).not.toHaveLength(0);
    await unmount(tree);
  });
});

describe('필수 조작 경계 대비', () => {
  const skinKeys = Object.keys(BG_SKINS);
  const equipmentCases = [
    null,
    ...skinKeys.map((skin) => ({ BACKGROUND: `bg.${skin}` })),
    ...Object.keys(CHROME_SKINS).map((skin) => ({ CHROME: `chrome.${skin}` })),
    { BACKGROUND: 'bg.galaxy', CHROME: 'chrome.candy' },
    { BACKGROUND: 'bg.candy', CHROME: 'chrome.galaxy' },
  ];

  it.each(['light', 'dark'])('%s 기본·고대비와 스킨에서 AI 버튼 경계 3:1과 글자 4.5:1을 지킨다', async (scheme) => {
    for (const equipments of equipmentCases) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, equipments, highContrast);
        for (const remaining of [68, 25, 5]) {
          const tree = await render(
            <AiBadge usage={{ used: 100 - remaining, limit: 100, remaining, resetAt: '2026-09-13T00:00:00' }} />,
          );
          const control = byLabel(
            tree,
            `AI 잔여 ${remaining}점${remaining < 10 ? ', 거의 소진' : ''}`,
          );
          const controlStyle = aiSurfaceStyle(control);
          const pressedStyle = aiSurfaceStyle(control, true);
          const label = tree.root.find((node) => node.type === Text && node.props.children === remaining);

          expect(controlStyle.backgroundColor).toBe(mockTheme.colors.card);
          expect(contrastRatio(controlStyle.borderColor, controlStyle.backgroundColor)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(controlStyle.borderColor, mockTheme.colors.chromeBg)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(StyleSheet.flatten(label.props.style).color, controlStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(pressedStyle.borderColor, pressedStyle.backgroundColor)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(StyleSheet.flatten(label.props.style).color, pressedStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          await unmount(tree);
        }
      }
    }
  });

  it.each(['light', 'dark'])('%s 기본·고대비와 배경 스킨에서 미완료 체크 경계 3:1을 지킨다', async (scheme) => {
    for (const skin of [null, ...skinKeys]) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, skin ? { BACKGROUND: `bg.${skin}` } : null, highContrast);
        const currentTask = task();
        const tree = await render(
          <TaskRow task={currentTask} onToggle={() => {}} onPress={() => {}} />,
        );
        const checkbox = tree.root.find(
          (node) => node.props.accessibilityRole === 'checkbox'
            && node.props.accessibilityLabel === `${currentTask.title} 완료`,
        );
        const mark = checkbox.find(
          (node) => node.type === View
            && StyleSheet.flatten(node.props.style)?.width === 22
            && StyleSheet.flatten(node.props.style)?.borderWidth === 2,
        );
        const markStyle = StyleSheet.flatten(mark.props.style);
        const pressedTarget = pressableStyle(checkbox, true);

        expect(pressedTarget.opacity ?? 1).toBe(1);
        expect(contrastRatio(markStyle.borderColor, markStyle.backgroundColor)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(markStyle.borderColor, pressedTarget.backgroundColor)).toBeGreaterThanOrEqual(3);
        await unmount(tree);
      }
    }
  });
});

describe('지금 할 일 히어로', () => {
  it('refined 표면과 48dp 조작을 쓰며 실제 task 객체와 큐를 보존한다', async () => {
    const heroTask = task();
    const queueTask = task({ taskId: 'task-2', title: '다음 할 일' });
    const onComplete = jest.fn();
    const onEdit = jest.fn();
    const tree = await render(
      <NowHeroCard
        nowSuggestion={{
          type: 'OPEN_SLOT',
          title: '집중할 시간',
          message: '가장 중요한 일부터 시작해요.',
          task: heroTask,
          focusMinutes: 30,
        }}
        queue={[{ task: queueTask, score: 1, bucket: 'TODAY', reasons: [] }]}
        todayDone={1}
        todayTotal={3}
        allDone={false}
        onComplete={onComplete}
        onEdit={onEdit}
      />,
    );

    const titleEdit = byLabel(tree, `${heroTask.title} 수정`);
    const complete = byLabel(tree, '완료하기');
    const queue = byLabel(tree, '오늘, 다음 할 일');
    const titleEditIcon = titleEdit.find((node) => node.props.name === 'pencil');
    const title = titleEdit.parent.find((node) => node.type === Text && node.props.children === heroTask.title);
    const titleRow = title.parent;
    const titleRowStyle = StyleSheet.flatten(titleRow.props.style);
    const titleStyle = StyleSheet.flatten(title.props.style);
    const titleEditStyle = pressableStyle(titleEdit);

    expect(refinedCards(tree)).not.toHaveLength(0);
    expect(titleEditIcon).toBeTruthy();
    expect(title.props.numberOfLines).toBe(3);
    expect(titleRow.children[0]).toBe(title);
    expect(titleRow.children[1]).toBe(titleEdit);
    expect(titleRowStyle.flexDirection).toBe('column');
    expect(titleRowStyle.alignItems).toBe('stretch');
    expect(titleStyle.alignSelf).toBe('stretch');
    expect(titleStyle.minWidth).toBe(0);
    expect(titleEditStyle.alignSelf).toBe('flex-start');
    for (const control of [titleEdit, complete, queue]) {
      expect(pressableStyle(control).minHeight).toBeGreaterThanOrEqual(48);
      expect(accessibleAncestors(control)).toHaveLength(0);
    }

    await act(async () => complete.props.onPress());
    await act(async () => titleEdit.props.onPress());
    await act(async () => queue.props.onPress());
    expect(onComplete).toHaveBeenCalledWith(heroTask);
    expect(onEdit).toHaveBeenNthCalledWith(1, heroTask);
    expect(onEdit).toHaveBeenNthCalledWith(2, queueTask);
    await unmount(tree);
  });

  it('집중 상태에서도 오늘 진행률의 의미를 독립된 접근성 요소로 보존한다', async () => {
    const tree = await render(
      <NowHeroCard
        nowSuggestion={{ type: 'OPEN_SLOT', title: '', message: '', task: null, focusMinutes: null }}
        queue={[]}
        todayDone={2}
        todayTotal={4}
        allDone={false}
        focus={{ title: '발표 자료 검토' }}
        onComplete={() => {}}
        onEdit={() => {}}
      />,
    );
    const progress = tree.root.findAll(
      (node) => node.props.accessible === true
        && node.props.accessibilityLabel === '오늘 4개 중 2개 완료',
    );

    expect(refinedCards(tree)).not.toHaveLength(0);
    expect(progress).not.toHaveLength(0);
    await unmount(tree);
  });

  it.each(['light', 'dark'])('%s 기본·고대비와 기존 스킨에서 수정 라벨은 resting·pressed 표면 모두 4.5:1을 지킨다', async (scheme) => {
    for (const skin of [null, ...Object.keys(BG_SKINS)]) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, skin ? { BACKGROUND: `bg.${skin}` } : null, highContrast);
        const heroTask = task();
        const tree = await render(
          <NowHeroCard
            nowSuggestion={{ type: 'OPEN_SLOT', title: '집중할 시간', message: '가장 중요한 일부터 시작해요.', task: heroTask, focusMinutes: 30 }}
            queue={[]}
            todayDone={1}
            todayTotal={3}
            allDone={false}
            onComplete={() => {}}
            onEdit={() => {}}
          />,
        );
        const edit = byLabel(tree, `${heroTask.title} 수정`);
        const label = edit.find((node) => node.type === Text && node.props.children === '수정');
        const resting = pressableStyle(edit);
        const pressed = pressableStyle(edit, true);
        const labelStyle = StyleSheet.flatten(label.props.style);

        expect(resting.backgroundColor).toBe('transparent');
        expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
        expect(contrastRatio(labelStyle.color, mockTheme.colors.card)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(labelStyle.color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        await unmount(tree);
      }
    }
  });
});

describe('뽀모도로 진입 카드', () => {
  it.each(['light', 'dark'])('%s 기본·고대비와 배경 스킨에서 실행·일시정지 상태의 불투명 pressed 대비를 지킨다', async (scheme) => {
    for (const skin of [null, ...Object.keys(BG_SKINS)]) {
      for (const highContrast of [false, true]) {
        for (const paused of [false, true]) {
          setTheme(scheme, skin ? { BACKGROUND: `bg.${skin}` } : null, highContrast);
          const anchor = Date.now() - 60_000;
          mockSession = {
            settings: DEFAULT_SETTINGS,
            anchor,
            pausedAt: paused ? anchor + 30_000 : null,
            taskId: 'task-1',
            taskTitle: '발표 자료 검토',
            lastSettled: 0,
          };
          const tree = await render(<PomodoroCard />);
          const openCard = byLabel(tree, '뽀모도로 타이머 열기');
          const resting = pressableStyle(openCard);
          const pressed = pressableStyle(openCard, true);
          const title = openCard.find(
            (node) => node.type === Text && StyleSheet.flatten(node.props.style)?.fontSize === 15,
          );
          const status = openCard.find(
            (node) => node.type === Text && StyleSheet.flatten(node.props.style)?.fontSize === 12,
          );
          const titleStyle = StyleSheet.flatten(title.props.style);
          const statusStyle = StyleSheet.flatten(status.props.style);

          expect(resting.backgroundColor).toBe(mockTheme.colors.card);
          expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
          expect(resting.borderRadius).toBe(8);
          expect(pressed.borderRadius).toBe(8);
          expect(pressed.opacity ?? 1).toBe(1);
          expect(contrastRatio(titleStyle.color, resting.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(titleStyle.color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(statusStyle.color, resting.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(statusStyle.color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          await unmount(tree);
        }
      }
    }
  });

  it('실행 중 다시 열기 조작을 독립된 48dp refined 버튼으로 유지한다', async () => {
    mockSession = {
      settings: DEFAULT_SETTINGS,
      anchor: Date.now(),
      pausedAt: null,
      taskId: 'task-1',
      taskTitle: '발표 자료 검토',
      lastSettled: 0,
    };
    const tree = await render(<PomodoroCard />);
    const openCard = byLabel(tree, '뽀모도로 타이머 열기');
    const openButton = byLabel(tree, '집중 중 · 확인하기');

    expect(refinedCards(tree)).not.toHaveLength(0);
    expect(pressableStyle(openCard).minHeight).toBeGreaterThanOrEqual(48);
    expect(pressableStyle(openButton).minHeight).toBeGreaterThanOrEqual(48);
    expect(accessibleAncestors(openButton)).toHaveLength(0);

    await act(async () => openCard.props.onPress());
    await act(async () => openButton.props.onPress());
    expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/pomodoro');
    expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/pomodoro');
    await unmount(tree);
  });
});

describe('할 일 목록 카드', () => {
  it('태스크 전체 보기를 테마 대비의 48dp 무테두리 이동 링크로 제공한다', async () => {
    const todayTask = task();
    const onToggle = jest.fn();
    const onPressTask = jest.fn();
    const onPressBoard = jest.fn();
    const tree = await render(
      <TaskListCard
        sections={{
          overdue: [],
          today: [todayTask],
          tomorrow: [],
          next7Days: [],
          later: [],
          someday: [],
          recentDone: [],
        }}
        onToggle={onToggle}
        onPressTask={onPressTask}
        onPressBoard={onPressBoard}
      />,
    );

    const board = byLabel(tree, '태스크 전체 보기');
    const boardText = board.find(
      (node) => node.type === Text && node.props.children === '태스크 전체 보기 →',
    );
    const todayTab = byLabel(tree, '오늘');
    const checkbox = tree.root.find(
      (node) => node.props.accessibilityRole === 'checkbox'
        && node.props.accessibilityLabel === `${todayTask.title} 완료`,
    );
    const detail = tree.root.find(
      (node) => node.props.accessibilityRole === 'button'
        && node.props.accessibilityHint === '상세 보기',
    );

    expect(refinedCards(tree)).not.toHaveLength(0);
    for (const control of [board, todayTab, checkbox, detail]) {
      expect(actualHeight(control)).toBeGreaterThanOrEqual(48);
      expect(accessibleAncestors(control)).toHaveLength(0);
    }
    const boardResting = pressableStyle(board);
    const boardPressed = pressableStyle(board, true);
    const boardTextStyle = StyleSheet.flatten(boardText.props.style);
    expect(boardResting.borderWidth ?? 0).toBe(0);
    expect(boardResting.flexShrink).toBe(1);
    expect(boardResting.opacity ?? 1).toBe(1);
    expect(boardPressed.opacity ?? 1).toBe(1);
    expect(boardPressed.backgroundColor).toBe(mockTheme.colors.chip);
    expect(contrastRatio(boardTextStyle.color, mockTheme.colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(boardTextStyle.color, boardPressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);

    await act(async () => board.props.onPress());
    await act(async () => detail.props.onPress());
    await act(async () => checkbox.props.onPress({ nativeEvent: { pageX: 12, pageY: 34 } }));
    expect(onPressBoard).toHaveBeenCalledTimes(1);
    expect(onPressTask).toHaveBeenCalledWith(todayTask);
    expect(onToggle).toHaveBeenCalledWith(todayTask, 'DONE', { x: 12, y: 34 });
    await unmount(tree);
  });

  it('태스크 전체 보기 링크는 밝음·어두움 고대비 테마에서도 읽힌다', async () => {
    const sections = {
      overdue: [], today: [], tomorrow: [], next7Days: [], later: [], someday: [], recentDone: [],
    };

    for (const [scheme, highContrast] of [['light', false], ['light', true], ['dark', false], ['dark', true]]) {
      setTheme(scheme, null, highContrast);
      const tree = await render(
        <TaskListCard
          sections={sections}
          onToggle={() => {}}
          onPressTask={() => {}}
          onPressBoard={() => {}}
        />,
      );
      const board = byLabel(tree, '태스크 전체 보기');
      const boardText = board.find(
        (node) => node.type === Text && node.props.children === '태스크 전체 보기 →',
      );
      const boardTextStyle = StyleSheet.flatten(boardText.props.style);
      const boardPressed = pressableStyle(board, true);

      expect(contrastRatio(boardTextStyle.color, mockTheme.colors.card)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(boardTextStyle.color, boardPressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      await unmount(tree);
    }
  });

  it('완료 해제 glyph를 작은 크기로 유지하면서 실제 조작과 경계를 구분한다', async () => {
    setTheme('dark');
    const doneTask = task({ status: 'DONE', completedAt: new Date().toISOString() });
    const tree = await render(
      <TaskListCard
        sections={{
          overdue: [], today: [], tomorrow: [], next7Days: [], later: [], someday: [], recentDone: [doneTask],
        }}
        onToggle={() => {}}
        onPressTask={() => {}}
        onPressBoard={() => {}}
      />,
    );

    await act(async () => byLabel(tree, '오늘 완료한 일 접기 펼치기').props.onPress());
    const undo = tree.root.find(
      (node) => node.props.accessibilityRole === 'checkbox'
        && node.props.accessibilityLabel === `${doneTask.title} 완료 해제`,
    );
    const mark = undo.find(
      (node) => node.type === View && StyleSheet.flatten(node.props.style)?.width === 20,
    );
    const markStyle = StyleSheet.flatten(mark.props.style);
    const pressedTarget = pressableStyle(undo, true);

    expect(actualHeight(undo)).toBeGreaterThanOrEqual(48);
    expect(markStyle.width).toBe(20);
    expect(pressedTarget.opacity ?? 1).toBe(1);
    expect(contrastRatio(markStyle.borderColor, mockTheme.colors.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(markStyle.borderColor, pressedTarget.backgroundColor)).toBeGreaterThanOrEqual(3);
    await unmount(tree);
  });

  it('본문 상세 조작은 불투명한 눌림 표면과 chip 대비 메타를 유지한다', async () => {
    setTheme('dark');
    const currentTask = task();
    const tree = await render(<TaskRow task={currentTask} onToggle={() => {}} onPress={() => {}} />);
    const detail = tree.root.find(
      (node) => node.props.accessibilityRole === 'button' && node.props.accessibilityHint === '상세 보기',
    );
    const [meta] = detail.findAll(
      (node) => node.type === Text && StyleSheet.flatten(node.props.style)?.fontSize === 10,
    );
    const resting = pressableStyle(detail);
    const pressed = pressableStyle(detail, true);

    expect(resting.opacity ?? 1).toBe(1);
    expect(pressed.opacity ?? 1).toBe(1);
    expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
    expect(contrastRatio(StyleSheet.flatten(meta.props.style).color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    await unmount(tree);
  });
});
