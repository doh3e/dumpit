import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { DumpTaskItem } from '../../api/types';
import { parseDate, toLocalDateTimeString } from '../../tasks/dates';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';
import { DateTimeField } from '../task/DateTimeField';

const MAX_INTEGER = 2147483647;

type Fields = {
  title: string;
  deadline: string | null;
  estimatedMinutes: number | null;
};

type Props = {
  task: DumpTaskItem;
  onApply: (fields: Fields) => void;
  onCancel: () => void;
};

type Errors = Partial<Record<keyof Fields, string>>;

function initialDeadline(value: string | null): string | null {
  if (!value) return null;
  const parsed = parseDate(value);
  return parsed ? toLocalDateTimeString(parsed) : value;
}

function validateMinutes(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return '예상 시간은 1분 이상의 정수로 입력해주세요.';
  const parsed = Number(value);
  if (parsed < 1) return '예상 시간은 1분 이상의 정수로 입력해주세요.';
  return parsed <= MAX_INTEGER ? undefined : '예상 시간이 너무 커요. 더 짧게 입력해주세요.';
}

export function BrainDumpTaskEditor({ task, onApply, onCancel }: Props) {
  const { colors, fonts } = useTheme();
  const initialMinutes = task.estimatedMinutes == null ? '' : String(task.estimatedMinutes);
  const titleRef = useRef<TextInput>(null);
  const minutesRef = useRef<TextInput>(null);
  const titleValueRef = useRef(task.title ?? '');
  const minutesValueRef = useRef(initialMinutes);
  const [deadline, setDeadline] = useState(() => initialDeadline(task.deadline));
  const [minimumDeadline] = useState(() => new Date());
  const [errors, setErrors] = useState<Errors>({});

  const apply = () => {
    const title = titleValueRef.current.trim();
    const parsedDeadline = deadline ? parseDate(deadline) : null;
    const nextErrors: Errors = {
      title: !title
        ? '제목을 입력해주세요.'
        : title.length > 200 ? '제목은 200자 이하여야 해요.' : undefined,
      deadline: deadline && (!parsedDeadline || parsedDeadline.getTime() <= Date.now())
        ? '마감 일시는 현재 시간 이후여야 해요.'
        : undefined,
      estimatedMinutes: validateMinutes(minutesValueRef.current),
    };
    setErrors(nextErrors);

    if (nextErrors.title) titleRef.current?.focus();
    else if (nextErrors.estimatedMinutes) minutesRef.current?.focus();
    else if (!nextErrors.deadline) {
      onApply({
        title,
        deadline,
        estimatedMinutes: minutesValueRef.current ? Number(minutesValueRef.current) : null,
      });
    }
  };

  return (
    <View
      accessibilityLabel={`${task.title} 수정`}
      style={[styles.editor, { borderColor: colors.line, backgroundColor: colors.card }]}
    >
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.bodyBold }]}>할 일 제목</Text>
        <TextInput
          ref={titleRef}
          defaultValue={task.title ?? ''}
          onChangeText={(value) => {
            titleValueRef.current = value;
            if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
          }}
          maxLength={200}
          autoFocus
          accessibilityLabel="할 일 제목"
          accessibilityHint={errors.title}
          style={[
            styles.input,
            { borderColor: errors.title ? colors.dangerText : colors.line, color: colors.fg, backgroundColor: colors.bg, fontFamily: fonts.body },
          ]}
        />
        {errors.title ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: colors.dangerText, fontFamily: fonts.bodyBold }]}>
            {errors.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.bodyBold }]}>마감 일시 (선택)</Text>
        <DateTimeField
          value={deadline}
          onChange={(value) => {
            setDeadline(value);
            if (errors.deadline) setErrors((current) => ({ ...current, deadline: undefined }));
          }}
          minimumDate={minimumDeadline}
          placeholder="기한 없음"
        />
        {errors.deadline ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: colors.dangerText, fontFamily: fonts.bodyBold }]}>
            {errors.deadline}
          </Text>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.bodyBold }]}>예상 시간 (선택)</Text>
        <TextInput
          ref={minutesRef}
          defaultValue={initialMinutes}
          onChangeText={(value) => {
            minutesValueRef.current = value;
            if (errors.estimatedMinutes) {
              setErrors((current) => ({ ...current, estimatedMinutes: undefined }));
            }
          }}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="없음"
          placeholderTextColor={colors.subOnChip}
          accessibilityLabel="예상 시간(분)"
          accessibilityHint={errors.estimatedMinutes}
          style={[
            styles.input,
            { borderColor: errors.estimatedMinutes ? colors.dangerText : colors.line, color: colors.fg, backgroundColor: colors.bg, fontFamily: fonts.chrome },
          ]}
        />
        {errors.estimatedMinutes ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: colors.dangerText, fontFamily: fonts.bodyBold }]}>
            {errors.estimatedMinutes}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <RetroButton appearance="refined" label="취소" variant="ghost" onPress={onCancel} style={styles.action} />
        <RetroButton appearance="refined" label="적용" onPress={apply} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { borderWidth: 1.5, borderRadius: 10, padding: 12, gap: 12 },
  fieldGroup: { gap: 5 },
  label: { fontSize: 12 },
  input: { minHeight: 48, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  action: { minHeight: 48, minWidth: 88 },
});
