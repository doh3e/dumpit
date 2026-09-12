const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet } = require('react-native');

let mockTheme;
const mockMutate = jest.fn();
const mockPush = jest.fn();

jest.mock('../theme/useTheme', () => ({ useTheme: () => mockTheme }));
jest.mock('../query/routineHooks', () => ({
  useRoutines: () => ({ data: [{
    routineId: 'routine-1', name: '아주 길어진 한국어 루틴 이름도 한 줄에서 안전하게 잘려야 해요',
    enabled: true, repeatType: 'WEEKLY', daysOfWeek: ['MON'], nextRunAt: null,
  }], refetch: () => Promise.resolve() }),
  useToggleRoutine: () => ({ mutate: mockMutate }),
}));
jest.mock('../api/client', () => ({ getApiErrorMessage: (error) => error.message }));
jest.mock('../components/retro/ToastProvider', () => ({ useToast: () => ({ error: jest.fn() }) }));
jest.mock('expo-router', () => ({ router: { push: mockPush } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));

const { composeTheme } = require('../theme/compose');
const { resolveFonts } = require('../theme/typography');
const { RoutineListCard } = require('../components/routine/RoutineListCard');
const { RetroButton } = require('../components/retro/RetroButton');
const { RetroCard } = require('../components/retro/RetroCard');

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

beforeEach(() => {
  setTheme();
  mockMutate.mockReset();
  mockPush.mockReset();
});

describe('루틴 화면의 refined 목록 표면', () => {
  it('긴 한국어 루틴도 실제 행 조작에서 평면 카드·48dp 버튼·불투명 누름 상태를 유지한다', async () => {
    const tree = await render(<RoutineListCard />);
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
});
