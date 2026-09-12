const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet } = require('react-native');

let mockTheme;
const mockBack = jest.fn();

jest.mock('../../../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('expo-router', () => ({ router: { back: mockBack } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));

const { composeTheme } = require('../../../theme/compose');
const { resolveFonts } = require('../../../theme/typography');
const { ScreenHeader } = require('../ScreenHeader');

global.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockTheme = { ...composeTheme('light', null, { highContrast: false }), fonts: resolveFonts(false), scheme: 'light' };
  mockBack.mockReset();
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
