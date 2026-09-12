const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text, View } = require('react-native');

let mockTheme;
const mockBack = jest.fn();
const mockFabPress = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockNavigate = jest.fn();

jest.mock('../../../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('expo-router', () => ({ router: { back: mockBack } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { Text: ReactNative.Text },
    useAnimatedStyle: (factory) => factory(),
    withTiming: (value) => value,
  };
});

const { composeTheme } = require('../../../theme/compose');
const { contrastRatio } = require('../../../theme/contrast');
const { BG_SKINS, CHROME_SKINS } = require('../../../theme/skins');
const { resolveFonts } = require('../../../theme/typography');
const { ScreenHeader } = require('../ScreenHeader');
const { RetroTabBar } = require('../RetroTabBar');

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme(scheme = 'light', equipments = null, highContrast = false) {
  mockTheme = { ...composeTheme(scheme, equipments, { highContrast }), fonts: resolveFonts(false), scheme };
}

function tabState() {
  return {
    index: 0,
    routes: [
      { key: 'index-key', name: 'index' },
      { key: 'routine-key', name: 'routine' },
      { key: 'ideas-key', name: 'ideas' },
      { key: 'my-key', name: 'my' },
    ],
  };
}

async function renderTabBar(fabOpen) {
  let tree;
  await act(async () => {
    tree = create(
      <RetroTabBar
        state={tabState()}
        navigation={{ emit: mockEmit, navigate: mockNavigate }}
        onFabPress={mockFabPress}
        fabOpen={fabOpen}
      />,
    );
  });
  return tree;
}

beforeEach(() => {
  setTheme();
  mockBack.mockReset();
  mockFabPress.mockReset();
  mockEmit.mockClear();
  mockNavigate.mockReset();
});

describe('하단 탐색', () => {
  it('추가 조작은 라벨을 보이고 기존 탭 이동과 열기 콜백을 보존한다', async () => {
    let tree;
    await act(async () => {
      tree = create(
        <RetroTabBar
          state={{
            index: 0,
            routes: [
              { key: 'index-key', name: 'index' },
              { key: 'routine-key', name: 'routine' },
              { key: 'ideas-key', name: 'ideas' },
              { key: 'my-key', name: 'my' },
            ],
          }}
          navigation={{ emit: mockEmit, navigate: mockNavigate }}
          onFabPress={mockFabPress}
          fabOpen={false}
        />,
      );
    });

    const add = tree.root.find((node) => node.props.accessibilityLabel === '추가');
    const addLabel = add.find((node) => node.type === Text && node.props.children === '추가');
    const indexIcon = tree.root.find((node) => node.props.name === 'home');
    let index = indexIcon.parent;
    while (typeof index.props.style !== 'function') index = index.parent;
    const addIcon = add.find(
      (node) => node.type === View
        && StyleSheet.flatten(node.props.style)?.width === 20
        && StyleSheet.flatten(node.props.style)?.height === 20,
    );
    const addLines = addIcon.findAll(
      (node) => node.type === View && StyleSheet.flatten(node.props.style)?.width === 14,
    );
    const routine = tree.root.find((node) => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === '루틴');

    expect(addLabel).toBeTruthy();
    expect(indexIcon.props.size).toBe(20);
    expect(addLines).toHaveLength(2);
    expect(StyleSheet.flatten(addLines[0].props.style).transform).toEqual([{ rotate: '0deg' }]);
    expect(StyleSheet.flatten(addLines[1].props.style).transform).toEqual([{ rotate: '90deg' }]);
    expect(StyleSheet.flatten(add.props.style({ pressed: false })).minHeight)
      .toBe(StyleSheet.flatten(index.props.style({ pressed: false })).minHeight);
    expect(StyleSheet.flatten(add.props.style({ pressed: false })).paddingVertical)
      .toBe(StyleSheet.flatten(index.props.style({ pressed: false })).paddingVertical);
    expect(add.props.accessibilityState).toEqual({ expanded: false });
    await act(async () => add.props.onPress());
    await act(async () => routine.props.onPress());
    expect(mockFabPress).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith({ type: 'tabPress', target: 'routine-key', canPreventDefault: true });
    expect(mockNavigate).toHaveBeenCalledWith('routine');
    await act(async () => {
      tree.update(
        <RetroTabBar
          state={{
            index: 0,
            routes: [
              { key: 'index-key', name: 'index' },
              { key: 'routine-key', name: 'routine' },
              { key: 'ideas-key', name: 'ideas' },
              { key: 'my-key', name: 'my' },
            ],
          }}
          navigation={{ emit: mockEmit, navigate: mockNavigate }}
          onFabPress={mockFabPress}
          fabOpen
        />,
      );
    });
    const close = tree.root.find((node) => node.props.accessibilityLabel === '닫기');
    const closeLabel = close.find((node) => node.type === Text && node.props.children === '닫기');
    const closeIcon = close.find(
      (node) => node.type === View
        && StyleSheet.flatten(node.props.style)?.width === 20
        && StyleSheet.flatten(node.props.style)?.height === 20,
    );
    const closeLines = closeIcon.findAll(
      (node) => node.type === View && StyleSheet.flatten(node.props.style)?.width === 14,
    );
    expect(closeLabel).toBeTruthy();
    expect(closeLines).toHaveLength(2);
    expect(StyleSheet.flatten(closeLines[0].props.style).transform).toEqual([{ rotate: '45deg' }]);
    expect(StyleSheet.flatten(closeLines[1].props.style).transform).toEqual([{ rotate: '-45deg' }]);
    expect(close.props.accessibilityState).toEqual({ expanded: true });
    await act(async () => close.props.onPress());
    expect(mockFabPress).toHaveBeenCalledTimes(2);
    await act(async () => tree.unmount());
  });

  it.each(['light', 'dark'])('%s 기본·고대비와 기존 스킨에서 추가·닫기 라벨은 모든 표면에서 4.5:1을 지킨다', async (scheme) => {
    const equipmentCases = [
      null,
      ...Object.keys(BG_SKINS).map((skin) => ({ BACKGROUND: `bg.${skin}` })),
      ...Object.keys(CHROME_SKINS).map((skin) => ({ CHROME: `chrome.${skin}` })),
      { BACKGROUND: 'bg.galaxy', CHROME: 'chrome.candy' },
    ];

    for (const equipments of equipmentCases) {
      for (const highContrast of [false, true]) {
        setTheme(scheme, equipments, highContrast);
        for (const fabOpen of [false, true]) {
          const label = fabOpen ? '닫기' : '추가';
          const tree = await renderTabBar(fabOpen);
          const control = tree.root.find((node) => node.props.accessibilityLabel === label);
          const text = control.find((node) => node.type === Text && node.props.children === label);
          const idle = StyleSheet.flatten(control.props.style({ pressed: false }));
          const pressed = StyleSheet.flatten(control.props.style({ pressed: true }));
          const textStyle = StyleSheet.flatten(text.props.style);

          expect(idle.backgroundColor).toBe(mockTheme.colors.chip);
          expect(pressed.backgroundColor).toBe(mockTheme.colors.card);
          expect(contrastRatio(textStyle.color, idle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(textStyle.color, pressed.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          await act(async () => tree.unmount());
        }
      }
    }
  });
});

describe('공통 refined 탐색', () => {
  it('뒤로 조작은 48dp이며 눌러도 불투명한 토큰 표면으로 피드백한다', async () => {
    let tree;
    await act(async () => { tree = create(<ScreenHeader title="긴 제목을 가진 일반 화면" />); });
    const back = tree.root.find((node) => node.props.accessibilityLabel === '뒤로');
    const idle = StyleSheet.flatten(back.props.style({ pressed: false }));
    const pressed = StyleSheet.flatten(back.props.style({ pressed: true }));

    expect(idle.minWidth).toBeGreaterThanOrEqual(48);
    expect(idle.minHeight).toBeGreaterThanOrEqual(48);
    expect(pressed.opacity ?? 1).toBe(1);
    expect(pressed.backgroundColor).toBe(mockTheme.colors.chip);
    await act(async () => back.props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
});
