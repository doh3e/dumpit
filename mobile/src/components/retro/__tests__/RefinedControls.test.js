const { beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text, View } = require('react-native');

let mockTheme;

jest.mock('../../../theme/useTheme', () => ({
  useTheme: () => mockTheme,
}));

const { composeTheme } = require('../../../theme/compose');
const { contrastRatio } = require('../../../theme/contrast');
const { BG_SKINS } = require('../../../theme/skins');
const { resolveFonts } = require('../../../theme/typography');
const { Chip } = require('../Chip');
const { RetroButton } = require('../RetroButton');
const { RetroCard } = require('../RetroCard');

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTheme(scheme = 'light', equipments = null, highContrast = false, bold = false) {
  const composed = composeTheme(scheme, equipments, { highContrast });
  mockTheme = {
    ...composed,
    fonts: resolveFonts(bold),
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

function buttonByLabel(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityRole === 'button'
      && node.props.accessibilityLabel === label
      && typeof node.props.style === 'function',
  );
}

function pressableStyle(node, pressed = false) {
  return StyleSheet.flatten(node.props.style({ pressed }));
}

function textStyle(tree, label) {
  const text = tree.root.find(
    (node) => node.type === Text && node.props.children === label,
  );
  return StyleSheet.flatten(text.props.style);
}

async function unmount(tree) {
  await act(async () => tree.unmount());
}

beforeEach(() => {
  setTheme();
});

describe('RetroButton appearance', () => {
  it('refined 소형 버튼도 48dp이고 장식 그림자와 눌림 이동이 없다', async () => {
    const onPress = jest.fn();
    const tree = await render(
      <RetroButton appearance="refined" size="sm" label="저장" onPress={onPress} />,
    );
    const button = buttonByLabel(tree, '저장');
    const resting = pressableStyle(button);
    const pressed = pressableStyle(button, true);

    expect(resting.minHeight).toBeGreaterThanOrEqual(48);
    expect(resting.minWidth).toBeGreaterThanOrEqual(48);
    expect(resting.borderRadius).toBe(8);
    expect(resting.boxShadow ?? 'none').toBe('none');
    expect(pressed.boxShadow ?? 'none').toBe('none');
    expect(pressed.transform ?? []).toEqual([]);
    expect(textStyle(tree, '저장').fontFamily).toBe(mockTheme.fonts.chrome);

    await act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    await unmount(tree);
  });

  it('기본 retro는 기존 소형 크기와 3px 그림자·눌림 이동을 유지한다', async () => {
    const onPress = jest.fn();
    const tree = await render(<RetroButton size="sm" label="저장" onPress={onPress} />);
    const button = buttonByLabel(tree, '저장');
    const resting = pressableStyle(button);
    const pressed = pressableStyle(button, true);

    expect(resting.minHeight).toBe(34);
    expect(resting.boxShadow).toBe(`3px 3px 0px ${mockTheme.colors.shadowSm}`);
    expect(pressed.transform).toEqual([{ translateX: 3 }, { translateY: 3 }]);
    expect(textStyle(tree, '저장').fontFamily).toBe(mockTheme.fonts.displayBold);

    await act(async () => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    await unmount(tree);
  });

  it.each([
    ['primary', 'accentFill', 'onAccent', 'accentFill'],
    ['ghost', 'card', 'fg', 'sub'],
    ['danger', 'card', 'dangerText', 'dangerText'],
    ['focus', 'accent2Fill', 'onAccent', 'accent2Fill'],
  ])('refined %s가 역할별 채움·글자·경계를 사용한다', async (variant, bgKey, fgKey, borderKey) => {
    const tree = await render(
      <RetroButton appearance="refined" variant={variant} label={variant} onPress={() => {}} />,
    );
    const style = pressableStyle(buttonByLabel(tree, variant));

    expect(style.backgroundColor).toBe(mockTheme.colors[bgKey]);
    expect(style.borderColor).toBe(mockTheme.colors[borderKey]);
    expect(textStyle(tree, variant).color).toBe(mockTheme.colors[fgKey]);
    await unmount(tree);
  });

  it('busy와 disabled가 접근성 이름·상태 및 중복 실행 차단을 유지한다', async () => {
    const tree = await render(
      <View>
        <RetroButton
          appearance="refined"
          label="분석하기"
          accessibilityLabel="할 일 분석 중"
          busy
          onPress={() => {}}
        />
        <RetroButton appearance="refined" label="저장" disabled onPress={() => {}} />
      </View>,
    );
    const busy = buttonByLabel(tree, '할 일 분석 중');
    const disabled = buttonByLabel(tree, '저장');

    expect(busy.props.disabled).toBe(true);
    expect(busy.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(disabled.props.disabled).toBe(true);
    expect(disabled.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(pressableStyle(disabled).opacity).toBeLessThan(1);
    expect(pressableStyle(busy, true)).toEqual(pressableStyle(busy));
    expect(pressableStyle(disabled, true)).toEqual(pressableStyle(disabled));
    await unmount(tree);
  });
});

describe('RetroCard appearance', () => {
  it.each([false, true])('refined 카드는 hero=%s여도 12dp 평면 표면이다', async (hero) => {
    const tree = await render(
      <RetroCard appearance="refined" hero={hero}><Text>내용</Text></RetroCard>,
    );
    const style = StyleSheet.flatten(tree.root.findByType(View).props.style);

    expect(style.borderRadius).toBe(12);
    expect(style.backgroundColor).toBe(mockTheme.colors.card);
    expect(style.boxShadow ?? 'none').toBe('none');
    await unmount(tree);
  });

  it.each([
    [false, 3, 'shadowSm'],
    [true, 5, 'shadowHero'],
  ])('기본 retro hero=%s는 기존 %dpx 그림자를 유지한다', async (hero, offset, colorKey) => {
    const tree = await render(<RetroCard hero={hero}><Text>내용</Text></RetroCard>);
    const style = StyleSheet.flatten(tree.root.findByType(View).props.style);

    expect(style.borderRadius).toBe(10);
    expect(style.boxShadow).toBe(`${offset}px ${offset}px 0px ${mockTheme.colors[colorKey]}`);
    await unmount(tree);
  });
});

describe('Chip appearance', () => {
  it('refined 선택 칩은 48dp, selected 의미, 읽을 수 있는 글자와 명확한 경계를 갖는다', async () => {
    const onPress = jest.fn();
    const tree = await render(
      <Chip appearance="refined" label="오늘" selected onPress={onPress} />,
    );
    const chip = buttonByLabel(tree, '오늘');
    const style = pressableStyle(chip);
    const label = textStyle(tree, '오늘');

    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(style.borderRadius).toBe(8);
    expect(style.backgroundColor).toBe(mockTheme.colors.chip);
    expect(style.borderColor).toBe(mockTheme.colors.fg);
    expect(style.opacity).toBe(1);
    expect(label.color).toBe(mockTheme.colors.fg);
    expect(label.fontFamily).toBe(mockTheme.fonts.chrome);
    expect(chip.props.accessibilityState).toEqual({ selected: true, disabled: false });

    await act(async () => chip.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    await unmount(tree);
  });

  it('refined 비선택 칩은 흐리지 않고 disabled만 흐리며 상태를 노출한다', async () => {
    const tree = await render(
      <View>
        <Chip appearance="refined" label="할 일" onPress={() => {}} />
        <Chip appearance="refined" label="완료" disabled onPress={() => {}} />
      </View>,
    );
    const idle = buttonByLabel(tree, '할 일');
    const disabled = buttonByLabel(tree, '완료');

    expect(pressableStyle(idle).opacity).toBe(1);
    expect(idle.props.accessibilityState).toEqual({ selected: false, disabled: false });
    expect(pressableStyle(disabled).opacity).toBeLessThan(1);
    expect(disabled.props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(pressableStyle(disabled, true)).toEqual(pressableStyle(disabled));
    await unmount(tree);
  });

  it('기본 retro는 기존 34dp와 선택 색을 유지한다', async () => {
    const tree = await render(<Chip label="오늘" selected onPress={() => {}} />);
    const style = pressableStyle(buttonByLabel(tree, '오늘'));

    expect(style.minHeight).toBe(34);
    expect(style.backgroundColor).toBe(mockTheme.colors.accent2Fill);
    expect(textStyle(tree, '오늘').color).toBe(mockTheme.colors.onAccent);
    await unmount(tree);
  });
});

describe('refined 테마 조합', () => {
  const skins = [null, ...Object.keys(BG_SKINS)];

  it.each(['light', 'dark'])('%s 기본·고대비와 7개 스킨에서 역할 대비와 평면 표현을 유지한다', async (scheme) => {
    for (const skin of skins) {
      for (const highContrast of [false, true]) {
        setTheme(
          scheme,
          skin ? { BACKGROUND: `bg.${skin}` } : null,
          highContrast,
        );
        const tree = await render(
          <View>
            <RetroButton appearance="refined" label="primary" onPress={() => {}} />
            <RetroButton appearance="refined" label="ghost" variant="ghost" onPress={() => {}} />
            <RetroButton appearance="refined" label="danger" variant="danger" onPress={() => {}} />
            <RetroButton appearance="refined" label="focus" variant="focus" onPress={() => {}} />
            <Chip appearance="refined" label="selected" selected onPress={() => {}} />
            <Chip appearance="refined" label="unselected" onPress={() => {}} />
            <RetroCard appearance="refined"><Text>card</Text></RetroCard>
          </View>,
        );

        for (const label of ['primary', 'ghost', 'danger', 'focus', 'selected', 'unselected']) {
          const control = buttonByLabel(tree, label);
          const controlStyle = pressableStyle(control);
          const pressedStyle = pressableStyle(control, true);
          const labelStyle = textStyle(tree, label);
          expect(pressedStyle.opacity ?? 1).toBe(1);
          expect([pressedStyle.backgroundColor, pressedStyle.borderColor])
            .not.toEqual([controlStyle.backgroundColor, controlStyle.borderColor]);
          expect(contrastRatio(labelStyle.color, controlStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(controlStyle.borderColor, mockTheme.colors.card)).toBeGreaterThanOrEqual(3);
          expect(contrastRatio(labelStyle.color, pressedStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(pressedStyle.borderColor, mockTheme.colors.card)).toBeGreaterThanOrEqual(3);
          expect(controlStyle.minHeight).toBeGreaterThanOrEqual(48);
          expect(controlStyle.minWidth).toBeGreaterThanOrEqual(48);
          expect(controlStyle.boxShadow ?? 'none').toBe('none');
          expect(pressedStyle.boxShadow ?? 'none').toBe('none');
          expect(pressedStyle.transform ?? []).toEqual([]);
        }
        await unmount(tree);
      }
    }
  });

  it.each([false, true])('굵은 글자=%s에서 현재 chrome 폰트를 따른다', async (bold) => {
    setTheme('light', null, false, bold);
    const tree = await render(
      <View>
        <RetroButton appearance="refined" label="버튼" onPress={() => {}} />
        <Chip appearance="refined" label="칩" onPress={() => {}} />
      </View>,
    );

    expect(textStyle(tree, '버튼').fontFamily).toBe(resolveFonts(bold).chrome);
    expect(textStyle(tree, '칩').fontFamily).toBe(resolveFonts(bold).chrome);
    await unmount(tree);
  });
});
