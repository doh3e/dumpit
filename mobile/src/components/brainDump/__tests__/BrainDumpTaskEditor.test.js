const { afterEach, beforeEach, describe, expect, it, jest } = require('@jest/globals');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { StyleSheet, Text, TextInput } = require('react-native');

let mockTheme;

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../../theme/useTheme', () => ({ useTheme: () => mockTheme }));

const { composeTheme } = require('../../../theme/compose');
const { resolveFonts } = require('../../../theme/typography');
const { DateTimeField } = require('../../task/DateTimeField');
const { BrainDumpTaskEditor } = require('../BrainDumpTaskEditor');

global.IS_REACT_ACT_ENVIRONMENT = true;

const task = {
  taskId: null,
  title: '발표 초안',
  description: '원래 설명',
  aiPriorityScore: 0.8,
  category: 'WORK',
  deadline: '2030-01-02T03:04:00',
  estimatedMinutes: 90,
};

function offsetDeadlineFixture() {
  return new Date(2030, 0, 2).getTimezoneOffset() === 0
    ? '2030-01-02T03:04:00.000+09:00'
    : '2030-01-02T03:04:00.000Z';
}

function expectedLocalInput(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function renderEditor(props = {}) {
  let tree;
  await act(async () => {
    tree = create(
      <BrainDumpTaskEditor
        task={task}
        onApply={jest.fn()}
        onCancel={jest.fn()}
        {...props}
      />,
    );
  });
  return tree;
}

function field(tree, label) {
  return tree.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === label);
}

function control(tree, label) {
  return tree.root.find(
    (node) => node.props.accessibilityRole === 'button'
      && node.props.accessibilityLabel === label
      && typeof node.props.style === 'function',
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-13T00:00:00.000Z'));
  mockTheme = {
    ...composeTheme('light', null, { highContrast: false }),
    fonts: resolveFonts(false),
    scheme: 'light',
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('BrainDumpTaskEditor', () => {
  it('IME 안전한 로컬 입력에서 제목을 trim하고 마감 지우기·예상 시간 없음으로 적용한다', async () => {
    const onApply = jest.fn();
    const tree = await renderEditor({ onApply });
    const title = field(tree, '할 일 제목');
    const minutes = field(tree, '예상 시간(분)');
    const dateField = tree.root.findByType(DateTimeField);

    expect(title.props.value).toBeUndefined();
    expect(title.props.defaultValue).toBe('발표 초안');
    expect(title.props.maxLength).toBe(200);
    expect(minutes.props.value).toBeUndefined();
    expect(dateField.props.value).toBe('2030-01-02T03:04');

    await act(async () => title.props.onChangeText('  다듬은 발표  '));
    await act(async () => control(tree, '일시 지우기').props.onPress());
    await act(async () => minutes.props.onChangeText(''));
    await act(async () => control(tree, '적용').props.onPress());

    expect(onApply).toHaveBeenCalledWith({
      title: '다듬은 발표',
      deadline: null,
      estimatedMinutes: null,
    });
    await act(async () => tree.unmount());
  });

  it('offset ISO 마감은 목록과 같은 로컬 wall-clock 값으로 편집한다', async () => {
    const deadline = offsetDeadlineFixture();
    const tree = await renderEditor({ task: { ...task, deadline } });

    expect(tree.root.findByType(DateTimeField).props.value).toBe(expectedLocalInput(deadline));
    await act(async () => tree.unmount());
  });

  it('유효한 미래 로컬 마감과 양의 정수를 그대로 적용한다', async () => {
    const onApply = jest.fn();
    const tree = await renderEditor({ onApply });

    await act(async () => control(tree, '적용').props.onPress());

    expect(onApply).toHaveBeenCalledWith({
      title: '발표 초안',
      deadline: '2030-01-02T03:04',
      estimatedMinutes: 90,
    });
    await act(async () => tree.unmount());
  });

  it('빈 제목·과거 마감·Integer 초과 예상 시간을 필드 가까이 표시하고 적용하지 않는다', async () => {
    const onApply = jest.fn();
    const tree = await renderEditor({ onApply });
    const title = field(tree, '할 일 제목');
    const minutes = field(tree, '예상 시간(분)');

    await act(async () => title.props.onChangeText('   '));
    await act(async () => control(tree, '적용').props.onPress());
    expect(title.props.accessibilityHint).toBe('제목을 입력해주세요.');
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '제목을 입력해주세요.')).toHaveLength(1);

    await act(async () => title.props.onChangeText('유효한 제목'));
    await act(async () => tree.root.findByType(DateTimeField).props.onChange('2000-01-01T00:00'));
    await act(async () => control(tree, '적용').props.onPress());
    expect(tree.root.findAll((node) => node.type === Text && node.props.children === '마감 일시는 현재 시간 이후여야 해요.')).toHaveLength(1);

    await act(async () => tree.root.findByType(DateTimeField).props.onChange(null));
    await act(async () => minutes.props.onChangeText('0'));
    await act(async () => control(tree, '적용').props.onPress());
    expect(minutes.props.accessibilityHint).toBe('예상 시간은 1분 이상의 정수로 입력해주세요.');

    await act(async () => minutes.props.onChangeText('1.5'));
    await act(async () => control(tree, '적용').props.onPress());
    expect(minutes.props.accessibilityHint).toBe('예상 시간은 1분 이상의 정수로 입력해주세요.');

    await act(async () => minutes.props.onChangeText('2147483648'));
    await act(async () => control(tree, '적용').props.onPress());
    expect(minutes.props.accessibilityHint).toBe('예상 시간이 너무 커요. 더 짧게 입력해주세요.');
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });

  it('취소는 로컬 변경을 버리고 두 조작은 48dp를 유지한다', async () => {
    const onApply = jest.fn();
    const onCancel = jest.fn();
    const tree = await renderEditor({ onApply, onCancel });
    await act(async () => field(tree, '할 일 제목').props.onChangeText('버릴 제목'));

    const cancel = control(tree, '취소');
    const apply = control(tree, '적용');
    expect(StyleSheet.flatten(cancel.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);
    expect(StyleSheet.flatten(apply.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);
    await act(async () => cancel.props.onPress());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
});
