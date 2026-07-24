import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { getApiErrorMessage } from '../src/api/client';
import type { RepeatType, RoutineResponse } from '../src/api/types';
import { Chip } from '../src/components/retro/Chip';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { TimeField } from '../src/components/task/TimeField';
import { useDeleteRoutine, useRoutines, useSaveRoutine } from '../src/query/routineHooks';
import {
  buildRoutinePayload, emptyRoutineForm, formFromRoutine, validateRoutineForm,
  type RoutineFormState,
} from '../src/routines/payload';
import { MONTHLY_ORDINALS, WEEK_DAYS } from '../src/routines/repeatSummary';
import { parseDate, toLocalDateString } from '../src/tasks/dates';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

const REPEAT_TYPES: { id: RepeatType; label: string }[] = [
  { id: 'DAILY', label: '매일' },
  { id: 'WEEKLY', label: '요일' },
  { id: 'MONTHLY', label: '날짜' },
  { id: 'MONTHLY_WEEKDAY', label: '주차' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function toggleNumber(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** 루틴 추가·편집 풀스크린 — 폼이 커서 바텀시트 대신 전용 화면 (웹 RoutinePage 폼 패리티) */
export default function RoutineEditScreen() {
  const { colors } = useTheme();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const routines = useRoutines();

  const editing = useMemo(
    () => routines.data?.find((r) => r.routineId === routineId) ?? null,
    [routines.data, routineId],
  );

  // 편집 진입인데 대상이 아직 없으면 폼을 만들지 않는다 —
  // 빈 폼으로 저장하면 PATCH 전체 payload가 기존 루틴을 덮어버린다 (리뷰 M5)
  if (routineId && !editing) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.bg }]}>
        {routines.isLoading || routines.isFetching ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Text style={[styles.notFound, { color: colors.sub, fontFamily: fonts.body }]}>
              루틴을 찾지 못했어요.
            </Text>
            <RetroButton label="돌아가기" size="sm" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  // key 리마운트 — editing이 뒤늦게 도착해도 폼(uncontrolled 포함)이 확실히 초기화된다
  return <RoutineEditForm key={editing?.routineId ?? 'new'} editing={editing} />;
}

function RoutineEditForm({ editing }: { editing: RoutineResponse | null }) {
  const { colors } = useTheme();
  const toast = useToast();
  const save = useSaveRoutine();
  const remove = useDeleteRoutine();

  const [form, setForm] = useState<RoutineFormState>(() =>
    editing ? formFromRoutine(editing) : emptyRoutineForm(toLocalDateString(new Date())),
  );
  const patch = (p: Partial<RoutineFormState>) => setForm((f) => ({ ...f, ...p }));

  const [datePicker, setDatePicker] = useState<'none' | 'start' | 'end'>('none');
  const onPickDate = (event: DateTimePickerEvent, picked?: Date) => {
    const target = datePicker;
    setDatePicker('none');
    if (event.type !== 'set' || !picked || target === 'none') return;
    patch(target === 'start' ? { startDate: toLocalDateString(picked) } : { endDate: toLocalDateString(picked) });
  };

  const onSave = () => {
    const error = validateRoutineForm(form);
    if (error) {
      toast.show(error);
      return;
    }
    save.mutate(
      { payload: buildRoutinePayload(form), routineId: editing?.routineId },
      {
        onSuccess: () => router.back(),
        onError: (e) => toast.show(getApiErrorMessage(e, '루틴을 저장하지 못했어요.')),
      },
    );
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('루틴 삭제', '이미 생성된 태스크는 남아 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          remove.mutate(editing.routineId, {
            onSuccess: () => router.back(),
            onError: (e) => toast.show(getApiErrorMessage(e, '루틴을 삭제하지 못했어요.')),
          }),
      },
    ]);
  };

  const sectionTitle = (text: string) => (
    <Text style={[styles.sectionTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>{text}</Text>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="뒤로">
          <Text style={[styles.back, { color: colors.fg, fontFamily: fonts.chrome }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          {editing ? '루틴 수정' : '새 루틴'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <RetroCard style={styles.card}>
          {sectionTitle('이름 *')}
          {/* 한글 IME 조합 보호 — uncontrolled */}
          <TextInput
            defaultValue={form.name}
            onChangeText={(v) => patch({ name: v })}
            maxLength={200}
            placeholder="예: 아침 스트레칭"
            placeholderTextColor={colors.sub}
            style={[styles.input, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
          />
          {sectionTitle('메모 (선택)')}
          <TextInput
            defaultValue={form.description}
            onChangeText={(v) => patch({ description: v })}
            maxLength={1000}
            multiline
            numberOfLines={2}
            placeholder="루틴 설명"
            placeholderTextColor={colors.sub}
            style={[styles.input, styles.multiline, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
          />
        </RetroCard>

        <RetroCard style={styles.card}>
          {sectionTitle('반복')}
          <View style={styles.chipRow}>
            {REPEAT_TYPES.map((t) => (
              <Chip key={t.id} label={t.label} selected={form.repeatType === t.id} onPress={() => patch({ repeatType: t.id })} />
            ))}
          </View>

          {form.repeatType === 'WEEKLY' && (
            <View style={styles.chipRow}>
              {WEEK_DAYS.map((d) => (
                <Chip
                  key={d.value}
                  label={d.label}
                  selected={form.daysOfWeek.includes(d.value)}
                  onPress={() => patch({ daysOfWeek: toggleNumber(form.daysOfWeek, d.value) })}
                />
              ))}
            </View>
          )}

          {form.repeatType === 'MONTHLY' && (
            <>
              <View style={styles.dayGrid}>
                {MONTH_DAYS.map((day) => {
                  const selected = form.daysOfMonth.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => patch({ daysOfMonth: toggleNumber(form.daysOfMonth, day) })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.dayCell,
                        selected
                          ? { backgroundColor: colors.accent2, borderColor: colors.edge }
                          : { backgroundColor: colors.chip, borderColor: colors.line },
                      ]}
                    >
                      <Text style={[styles.dayText, { color: selected ? colors.onAccent : colors.sub, fontFamily: fonts.chrome }]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.fg, fontFamily: fonts.body }]}>
                  없는 날짜는 말일에 실행 (예: 31일 → 2월 28일)
                </Text>
                <Switch
                  value={form.runOnLastDayIfMissing}
                  onValueChange={(v) => patch({ runOnLastDayIfMissing: v })}
                  trackColor={{ false: colors.line, true: colors.accent2 }}
                  thumbColor={colors.card}
                />
              </View>
            </>
          )}

          {form.repeatType === 'MONTHLY_WEEKDAY' && (
            <>
              <View style={styles.chipRow}>
                {MONTHLY_ORDINALS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={form.monthlyWeekOrdinal === o.value}
                    onPress={() => patch({ monthlyWeekOrdinal: o.value })} />
                ))}
              </View>
              <View style={styles.chipRow}>
                {WEEK_DAYS.map((d) => (
                  <Chip key={d.value} label={d.label} selected={form.monthlyWeekDay === d.value}
                    onPress={() => patch({ monthlyWeekDay: d.value })} />
                ))}
              </View>
            </>
          )}
        </RetroCard>

        <RetroCard style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.fg, fontFamily: fonts.body }]}>시작 시각 지정</Text>
            <Switch value={form.hasStartTime} onValueChange={(v) => patch({ hasStartTime: v })}
              trackColor={{ false: colors.line, true: colors.accent2 }} thumbColor={colors.card} />
          </View>
          {form.hasStartTime && (
            <>
              <TimeField value={form.startTime} onChange={(v) => patch({ startTime: v })} accessibilityLabel="시작 시각" />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.fg, fontFamily: fonts.body }]}>종료(마감) 시각 지정</Text>
                <Switch value={form.hasEndTime} onValueChange={(v) => patch({ hasEndTime: v })}
                  trackColor={{ false: colors.line, true: colors.accent2 }} thumbColor={colors.card} />
              </View>
              {form.hasEndTime && (
                <TimeField value={form.endTime} onChange={(v) => patch({ endTime: v })} accessibilityLabel="종료 시각" />
              )}
            </>
          )}
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            {form.hasStartTime
              ? form.hasEndTime
                ? '시작~종료로 잠긴 일정이 만들어져요.'
                : '시작 시각으로 생성되고 마감은 일과 끝나는 시각이에요.'
              : '오늘 안에 완료 · 일과 끝나는 시각 마감으로 만들어져요.'}
          </Text>
        </RetroCard>

        <RetroCard style={styles.card}>
          {sectionTitle('기간')}
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDatePicker('start')}
              accessibilityRole="button"
              accessibilityLabel={`시작일 ${form.startDate}`}
              style={[styles.dateBtn, { borderColor: colors.line, backgroundColor: colors.chip }]}
            >
              <Text style={[styles.dateText, { color: colors.fg, fontFamily: fonts.chrome }]}>📅 {form.startDate}</Text>
            </Pressable>
            <Text style={[styles.tilde, { color: colors.sub, fontFamily: fonts.chrome }]}>~</Text>
            <Pressable
              onPress={() => setDatePicker('end')}
              accessibilityRole="button"
              accessibilityLabel={`종료일 ${form.endDate || '없음'}`}
              style={[styles.dateBtn, { borderColor: colors.line, backgroundColor: colors.chip }]}
            >
              <Text style={[styles.dateText, { color: form.endDate ? colors.fg : colors.sub, fontFamily: fonts.chrome }]}>
                {form.endDate || '끝없이'}
              </Text>
            </Pressable>
            {!!form.endDate && (
              <Pressable onPress={() => patch({ endDate: '' })} hitSlop={8} accessibilityLabel="종료일 지우기">
                <Text style={[styles.dateText, { color: colors.sub, fontFamily: fonts.chrome }]}>✕</Text>
              </Pressable>
            )}
          </View>
        </RetroCard>

        <RetroButton label={editing ? '저장' : '루틴 만들기'} onPress={onSave} busy={save.isPending} />
        {editing && (
          <RetroButton label="삭제" variant="danger" size="sm" onPress={onDelete} busy={remove.isPending} />
        )}
      </ScrollView>

      {datePicker !== 'none' && (
        <DateTimePicker
          value={parseDate(`${(datePicker === 'start' ? form.startDate : form.endDate) || form.startDate}T00:00`) ?? new Date()}
          mode="date"
          onChange={onPickDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  notFound: { fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  back: { fontSize: 22 },
  title: { fontSize: 18, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 22 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { gap: 10 },
  sectionTitle: { fontSize: 11 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: { width: 40, height: 36, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchLabel: { fontSize: 13, flexShrink: 1 },
  hint: { fontSize: 11, lineHeight: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  dateText: { fontSize: 12 },
  tilde: { fontSize: 14 },
});
