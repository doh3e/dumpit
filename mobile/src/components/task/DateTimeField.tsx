import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { parseDate, toLocalDateTimeString } from '../../tasks/dates';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = {
  value: string | null;              // "YYYY-MM-DDTHH:mm"
  onChange: (v: string | null) => void;
  minimumDate?: Date;
  placeholder?: string;
};

/** 날짜→시간 2단계 안드로이드 픽커. 표시 "M/D HH:mm" (둥근모) */
export function DateTimeField({ value, onChange, minimumDate, placeholder = '선택 안 함' }: Props) {
  const { colors } = useTheme();
  const [stage, setStage] = useState<'none' | 'date' | 'time'>('none');
  const [draft, setDraft] = useState<Date>(new Date());

  const current = parseDate(value);
  const label = current
    ? `${current.getMonth() + 1}/${current.getDate()} ${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`
    : placeholder;

  const onPickDate = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type !== 'set' || !picked) {
      setStage('none');
      return;
    }
    setDraft(picked);
    setStage('time');
  };

  const onPickTime = (event: DateTimePickerEvent, picked?: Date) => {
    setStage('none');
    if (event.type !== 'set' || !picked) return;
    const merged = new Date(draft);
    merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(toLocalDateTimeString(merged));
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(current ?? new Date());
          setStage('date');
        }}
        accessibilityRole="button"
        accessibilityLabel={`일시 선택, 현재 ${label}`}
        style={({ pressed }) => [
          styles.field,
          { borderColor: colors.line, backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.text, { color: current ? colors.fg : colors.sub, fontFamily: fonts.chrome }]}>
          📅 {label}
        </Text>
        {current && (
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityLabel="지우기">
            <Text style={[styles.clear, { color: colors.sub, fontFamily: fonts.chrome }]}>✕</Text>
          </Pressable>
        )}
      </Pressable>
      {stage === 'date' && (
        <DateTimePicker value={draft} mode="date" minimumDate={minimumDate} onChange={onPickDate} />
      )}
      {stage === 'time' && (
        <DateTimePicker value={draft} mode="time" is24Hour onChange={onPickTime} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44,
  },
  text: { fontSize: 12 },
  clear: { fontSize: 12 },
});
