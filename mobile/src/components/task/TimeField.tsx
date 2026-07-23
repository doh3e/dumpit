import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = {
  value: string;                     // "HH:mm"
  onChange: (v: string) => void;
  accessibilityLabel?: string;
};

function toDate(value: string): Date {
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return d;
}

/** 시간 단독 픽커 — DateTimeField의 시간 단계만 (루틴 시각용) */
export function TimeField({ value, onChange, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const onPick = (event: DateTimePickerEvent, picked?: Date) => {
    setOpen(false);
    if (event.type !== 'set' || !picked) return;
    onChange(`${String(picked.getHours()).padStart(2, '0')}:${String(picked.getMinutes()).padStart(2, '0')}`);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `시간 선택, 현재 ${value}`}
        style={({ pressed }) => [
          styles.field,
          { borderColor: colors.line, backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.text, { color: colors.fg, fontFamily: fonts.chrome }]}>🕐 {value}</Text>
      </Pressable>
      {open && <DateTimePicker value={toDate(value)} mode="time" is24Hour onChange={onPick} />}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 44, alignItems: 'flex-start', justifyContent: 'center',
  },
  text: { fontSize: 12 },
});
