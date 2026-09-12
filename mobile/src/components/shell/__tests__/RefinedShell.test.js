const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text } = require('react-native');

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
const { resolveFonts } = require('../../../theme/typography');
const { ScreenHeader } = require('../ScreenHeader');
const { RetroTabBar } = require('../RetroTabBar');

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockTheme = { ...composeTheme('light', null, { highContrast: false }), fonts: resolveFonts(false), scheme: 'light' };
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
    const addIcon = add.find((node) => node.props.name === 'sparkle');
    const routine = tree.root.find((node) => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === '루틴');

    expect(addLabel).toBeTruthy();
    expect(addIcon).toBeTruthy();
    await act(async () => add.props.onPress());
    await act(async () => routine.props.onPress());
    expect(mockFabPress).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith({ type: 'tabPress', target: 'routine-key', canPreventDefault: true });
    expect(mockNavigate).toHaveBeenCalledWith('routine');
    await act(async () => tree.unmount());
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
