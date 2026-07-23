import { BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { createTask } from '../../api/tasks';
import { invalidateAfterAi, useAiUsage } from '../../query/hooks';
import { keys } from '../../query/keys';
import { AI_COSTS, TASK_CATEGORIES } from '../../tasks/constants';
import { parseDate, toLocalDateTimeString } from '../../tasks/dates';
import { buildDeadlinePayload, type DeadlineMode } from '../../tasks/deadlineMode';
import type { Category } from '../../api/types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';
import { RetroButton } from '../retro/RetroButton';
import { useToast } from '../retro/ToastProvider';
import { DateTimeField } from './DateTimeField';

const DEADLINE_MODES: { id: DeadlineMode; label: string; emoji?: string }[] = [
  { id: 'AI', label: 'AI가 알아서', emoji: '✨' },
  { id: 'TODAY', label: '오늘까지' },
  { id: 'NONE', label: '언젠가', emoji: '🌙' },
  { id: 'CUSTOM', label: '직접', emoji: '📅' },
];

/** 다음 30분 정각 */
function next30(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 30) * 30);
  return toLocalDateTimeString(d);
}

/** ＋ → 태스크 추가 바텀시트 (웹 AddTaskModal 패리티). ref.present()로 연다 */
export const AddTaskSheet = forwardRef<BottomSheetModal>(function AddTaskSheet(_props, ref) {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>('AI');
  const [customDeadline, setCustomDeadline] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [estimate, setEstimate] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const remaining = aiUsage.data?.remaining ?? Infinity;

  const { deadline, noDeadline } = useMemo(
    () => buildDeadlinePayload(deadlineMode, customDeadline),
    [deadlineMode, customDeadline],
  );

  const startAfterDeadline = useMemo(() => {
    const s = parseDate(startTime);
    const d = parseDate(deadline);
    return !!(s && d && s > d);
  }, [startTime, deadline]);

  const blocked =
    !title.trim() || saving || remaining < AI_COSTS.TASK_CREATE ||
    (deadlineMode === 'CUSTOM' && !customDeadline) || startAfterDeadline;

  const reset = useCallback(() => {
    setTitle(''); setDescription(''); setDeadlineMode('AI'); setCustomDeadline(null);
    setMoreOpen(false); setStartTime(null); setEstimate(''); setCategory(null);
  }, []);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        deadline, noDeadline,
        startTime: startTime ?? null,
        estimatedMinutes: estimate ? parseInt(estimate, 10) : null,
        category: category ?? null,   // null = 서버 AI 자동 분류
      });
      qc.invalidateQueries({ queryKey: keys.planning });
      invalidateAfterAi(qc);
      toast.show('덤프 완료! 할 일에 추가했어요.');
      reset();
      (ref as React.RefObject<BottomSheetModal | null>)?.current?.dismiss();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '추가에 실패했어요.'));
    } finally {
      setSaving(false);
    }
  }, [title, description, deadline, noDeadline, startTime, estimate, category, qc, toast, reset, ref]);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backgroundStyle={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.edge }}
      handleIndicatorStyle={{ backgroundColor: colors.line, width: 44 }}
    >
      <BottomSheetView style={styles.body}>
        <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>태스크 추가</Text>

        <BottomSheetTextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          autoFocus
          placeholder="할 일을 입력하세요"
          placeholderTextColor={colors.sub}
          style={[styles.input, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, backgroundColor: colors.bg }]}
          accessibilityLabel="할 일 제목"
        />
        <BottomSheetTextInput
          value={description}
          onChangeText={setDescription}
          maxLength={1000}
          multiline
          numberOfLines={2}
          placeholder="메모 (선택)"
          placeholderTextColor={colors.sub}
          style={[styles.input, styles.memo, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, backgroundColor: colors.bg }]}
          accessibilityLabel="메모"
        />

        <View style={styles.chipRow}>
          {DEADLINE_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              emoji={m.emoji}
              selected={deadlineMode === m.id}
              onPress={() => setDeadlineMode(m.id)}
            />
          ))}
        </View>
        {deadlineMode === 'CUSTOM' && (
          <DateTimeField value={customDeadline} onChange={setCustomDeadline} minimumDate={new Date()} placeholder="마감 일시 선택" />
        )}

        <Chip
          label={moreOpen ? '옵션 접기 ▲' : '옵션 더보기 ▼'}
          onPress={() => setMoreOpen((v) => !v)}
        />
        {moreOpen && (
          <View style={styles.more}>
            <View style={styles.optionRow}>
              <Chip
                label="시작 시간"
                selected={startTime != null}
                onPress={() => setStartTime(startTime == null ? next30() : null)}
              />
              {startTime != null && (
                <View style={styles.optionField}>
                  <DateTimeField value={startTime} onChange={setStartTime} />
                </View>
              )}
            </View>
            <View style={styles.optionRow}>
              <Chip
                label="예상 시간(분)"
                selected={estimate !== ''}
                onPress={() => setEstimate(estimate === '' ? '30' : '')}
              />
              {estimate !== '' && (
                <BottomSheetTextInput
                  value={estimate}
                  onChangeText={(v) => setEstimate(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={[styles.input, styles.estimate, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.chrome, backgroundColor: colors.bg }]}
                  accessibilityLabel="예상 시간(분)"
                />
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label="AI 자동" emoji="✨" selected={category === null} onPress={() => setCategory(null)} />
              {TASK_CATEGORIES.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  emoji={c.emoji}
                  selected={category === c.value}
                  onPress={() => setCategory(c.value)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {startAfterDeadline && (
          <Text style={[styles.warnText, { color: colors.warn, fontFamily: fonts.body }]}>
            시작 시간이 마감보다 늦어요.
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={[styles.cost, { color: remaining < AI_COSTS.TASK_CREATE ? colors.accent : colors.sub, fontFamily: fonts.chrome }]}>
            {remaining < AI_COSTS.TASK_CREATE ? '오늘 AI를 다 썼어요' : `✨ ${AI_COSTS.TASK_CREATE}점 사용`}
          </Text>
          <RetroButton label="추가" onPress={submit} busy={saving} disabled={blocked} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28, gap: 10 },
  heading: { fontSize: 16, marginBottom: 2 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  memo: { minHeight: 56, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  more: { gap: 10 },
  optionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  optionField: { flex: 1 },
  estimate: { width: 90, textAlign: 'center' },
  warnText: { fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cost: { fontSize: 11 },
});
