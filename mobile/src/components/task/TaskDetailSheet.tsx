import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { deleteTask, patchTask, reanalyzeTask, setSticker } from '../../api/tasks';
import type { Category, TaskResponse } from '../../api/types';
import { invalidateAfterAi, useAiUsage } from '../../query/hooks';
import { keys } from '../../query/keys';
import { AI_COSTS, TASK_CATEGORIES } from '../../tasks/constants';
import { parseDate } from '../../tasks/dates';
import { buildDeadlinePayload, type DeadlineMode } from '../../tasks/deadlineMode';
import { updateTaskInPlanning } from '../../tasks/planningCache';
import type { PlanningResponse } from '../../api/types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';
import { RetroButton } from '../retro/RetroButton';
import { useToast } from '../retro/ToastProvider';
import { DateTimeField } from './DateTimeField';
import { StickerPicker } from './StickerPicker';
import { SubtaskProposalSheet, type SubtaskProposalSheetHandle } from './SubtaskProposalSheet';

export type TaskDetailSheetHandle = { present(task: TaskResponse): void };

// 웹 EditTaskModal 패리티 — 수정에서는 AI 재추론 모드 없음 (PATCH가 마감 재추론을 보장하지 않음)
const DEADLINE_MODES: { id: DeadlineMode; label: string; emoji?: string }[] = [
  { id: 'TODAY', label: '오늘까지' },
  { id: 'NONE', label: '언젠가', emoji: '🌙' },
  { id: 'CUSTOM', label: '직접', emoji: '📅' },
];

/** 태스크 상세 — 수정·중요도·스티커·AI 재분석·쪼개기·삭제 (웹 EditTaskModal 이식) */
export const TaskDetailSheet = forwardRef<TaskDetailSheetHandle>(function TaskDetailSheet(_props, ref) {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();
  const sheetRef = useRef<BottomSheetModal>(null);
  const splitRef = useRef<SubtaskProposalSheetHandle>(null);
  // 지금 열려 있는 태스크 id — 늦게 도착한 응답이 다른 태스크 상태를 오염시키지 않게 가드
  const presentedIdRef = useRef<string | null>(null);

  const [task, setTask] = useState<TaskResponse | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>('NONE');
  const [customDeadline, setCustomDeadline] = useState<string | null>(null);
  const [useStart, setUseStart] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [initialStartTime, setInitialStartTime] = useState<string>('');
  const [estimate, setEstimate] = useState('');
  const [category, setCategory] = useState<Category>('OTHER');
  const [priorityScore, setPriorityScore] = useState(0.5);
  const [stickerBusy, setStickerBusy] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const remaining = aiUsage.data?.remaining ?? Infinity;

  useImperativeHandle(ref, () => ({
    present(target: TaskResponse) {
      presentedIdRef.current = target.taskId;
      setStickerBusy(false);
      setReanalyzing(false);
      setSaving(false);
      setTask(target);
      setTitle(target.title);
      setDescription(target.description ?? '');
      setDeadlineMode(target.deadline ? 'CUSTOM' : 'NONE');
      setCustomDeadline(target.deadline ? target.deadline.slice(0, 16) : null);
      const start = target.startTime ? target.startTime.slice(0, 16) : '';
      setUseStart(!!start);
      setStartTime(start || null);
      setInitialStartTime(start);
      setEstimate(target.estimatedMinutes != null ? String(target.estimatedMinutes) : '');
      setCategory(target.category === 'ROUTINE' ? 'OTHER' : target.category);
      setPriorityScore(target.userPriorityScore ?? target.aiPriorityScore ?? 0.5);
      sheetRef.current?.present();
    },
  }), []);

  const applySticker = useCallback(async (code: string | null) => {
    if (!task) return;
    const id = task.taskId;
    setStickerBusy(true);
    await qc.cancelQueries({ queryKey: keys.planning });
    const prevTask = qc.getQueryData<PlanningResponse>(keys.planning)?.tasks.find((t) => t.taskId === id) ?? null;
    qc.setQueryData<PlanningResponse>(keys.planning, (cur) =>
      cur ? updateTaskInPlanning(cur, id, { stickerCode: code }) : cur);
    try {
      const updated = await setSticker(id, code);
      qc.invalidateQueries({ queryKey: keys.planning });
      if (presentedIdRef.current !== id) return;   // 늦은 응답 — 다른 태스크가 열려 있음
      setTask(updated);
    } catch (e) {
      qc.setQueryData<PlanningResponse>(keys.planning, (cur) =>
        cur && prevTask ? updateTaskInPlanning(cur, id, { stickerCode: prevTask.stickerCode }) : cur);
      toast.show(getApiErrorMessage(e, '스티커를 바꾸지 못했어요.'));
    } finally {
      if (presentedIdRef.current === id) setStickerBusy(false);
    }
  }, [task, qc, toast]);

  const reanalyze = useCallback(async () => {
    if (!task) return;
    const id = task.taskId;
    setReanalyzing(true);
    try {
      const updated = await reanalyzeTask(id);
      invalidateAfterAi(qc);
      qc.invalidateQueries({ queryKey: keys.planning });
      if (presentedIdRef.current !== id) return;   // 늦은 응답 가드
      setTask(updated);
      setPriorityScore(updated.aiPriorityScore ?? 0.5);
      toast.show('AI가 중요도를 다시 매겼어요.');
    } catch (e) {
      toast.show(getApiErrorMessage(e, 'AI 재분석에 실패했어요.'));
    } finally {
      if (presentedIdRef.current === id) setReanalyzing(false);
    }
  }, [task, qc, toast]);

  const save = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    try {
      const { deadline, noDeadline } = buildDeadlinePayload(deadlineMode, customDeadline);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        deadline, noDeadline,
        estimatedMinutes: estimate ? parseInt(estimate, 10) : null,
        userPriorityScore: priorityScore,
        category,
        startTime: useStart ? (startTime || null) : null,
      };
      // 원래 고정이었거나 시작시간을 바꾼 경우만 잠금 (웹 EditTaskModal:83 이식)
      payload.isLocked = Boolean(useStart && startTime && (task.isLocked || startTime !== initialStartTime));
      await patchTask(task.taskId, payload);
      qc.invalidateQueries({ queryKey: keys.planning });
      toast.show('저장했어요.');
      sheetRef.current?.dismiss();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '저장에 실패했어요.'));
    } finally {
      setSaving(false);
    }
  }, [task, title, description, deadlineMode, customDeadline, estimate, priorityScore, category, useStart, startTime, initialStartTime, qc, toast]);

  const confirmDelete = useCallback(() => {
    if (!task) return;
    Alert.alert('삭제', '이 할 일을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(task.taskId);
            qc.invalidateQueries({ queryKey: keys.planning });
            toast.show('삭제했어요.');
            sheetRef.current?.dismiss();
          } catch (e) {
            toast.show(getApiErrorMessage(e, '삭제에 실패했어요.'));
          }
        },
      },
    ]);
  }, [task, qc, toast]);

  const startAfterDeadline = (() => {
    const s = parseDate(useStart ? startTime : null);
    const d = parseDate(deadlineMode === 'CUSTOM' ? customDeadline : null);
    return !!(s && d && s > d);
  })();

  const isUserOverridden = task?.userPriorityScore != null;

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['72%', '95%']}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundStyle={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line, width: 44 }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>태스크 상세</Text>

          {/* 한글 IME 조합 보호 — uncontrolled, 태스크 바뀌면 key로 리마운트 */}
          <BottomSheetTextInput
            key={`title-${task?.taskId ?? 'none'}`}
            defaultValue={task?.title ?? ''}
            onChangeText={setTitle}
            maxLength={200}
            style={[styles.input, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, backgroundColor: colors.bg }]}
            accessibilityLabel="제목"
          />
          <BottomSheetTextInput
            key={`memo-${task?.taskId ?? 'none'}`}
            defaultValue={task?.description ?? ''}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            placeholder="메모 (선택)"
            placeholderTextColor={colors.sub}
            style={[styles.input, styles.memo, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, backgroundColor: colors.bg }]}
            accessibilityLabel="메모"
          />

          <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.chrome }]}>마감</Text>
          <View style={styles.chipRow}>
            {DEADLINE_MODES.map((m) => (
              <Chip key={m.id} label={m.label} emoji={m.emoji} selected={deadlineMode === m.id} onPress={() => setDeadlineMode(m.id)} />
            ))}
          </View>
          {deadlineMode === 'CUSTOM' && (
            <DateTimeField value={customDeadline} onChange={setCustomDeadline} minimumDate={new Date()} placeholder="마감 일시 선택" />
          )}

          <View style={styles.optionRow}>
            <Chip
              label="시작 시간"
              selected={useStart}
              onPress={() => {
                const next = !useStart;
                setUseStart(next);
                if (next && !startTime) setStartTime(initialStartTime || null);
              }}
            />
            {useStart && (
              <View style={styles.optionField}>
                <DateTimeField value={startTime} onChange={setStartTime} placeholder="시작 일시 선택" />
              </View>
            )}
          </View>
          {startAfterDeadline && (
            <Text style={[styles.hint, { color: colors.warn, fontFamily: fonts.body }]}>시작 시간이 마감보다 늦어요.</Text>
          )}

          <View style={styles.optionRow}>
            <Chip label="예상(분)" selected={estimate !== ''} onPress={() => setEstimate(estimate === '' ? '30' : '')} />
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

          <View style={styles.chipRow}>
            {TASK_CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} emoji={c.emoji} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>

          <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.chrome }]}>
            중요도 ({Math.round(priorityScore * 100)}점)
          </Text>
          <Slider
            value={priorityScore}
            onValueChange={setPriorityScore}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            minimumTrackTintColor={colors.accent2}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.accent}
            accessibilityLabel="중요도 슬라이더"
          />
          <View style={styles.chipRow}>
            {isUserOverridden && (
              <Chip label="AI 점수로 초기화" onPress={() => setPriorityScore(task?.aiPriorityScore ?? 0.5)} />
            )}
            <Chip
              label={reanalyzing ? '재분석 중…' : `✨ AI 재분석 (${AI_COSTS.TASK_REANALYZE}점)`}
              onPress={reanalyze}
              disabled={reanalyzing || remaining < AI_COSTS.TASK_REANALYZE}
            />
          </View>

          <Text style={[styles.label, { color: colors.sub, fontFamily: fonts.chrome }]}>스티커</Text>
          <StickerPicker current={task?.stickerCode ?? null} onSelect={applySticker} disabled={stickerBusy} />

          {task && !task.parentTaskId && (
            <RetroButton
              label={`🧩 AI로 쪼개기 (${AI_COSTS.SUBTASK_PROPOSAL}점)`}
              variant="ghost"
              onPress={() => {
                if (remaining < AI_COSTS.SUBTASK_PROPOSAL) {
                  toast.show('오늘 AI 점수가 부족해요.');
                  return;
                }
                splitRef.current?.present(task);
              }}
            />
          )}

          <View style={styles.footer}>
            <RetroButton label="삭제" variant="danger" size="sm" onPress={confirmDelete} />
            <RetroButton
              label="저장"
              onPress={save}
              busy={saving}
              disabled={!title.trim() || saving || (deadlineMode === 'CUSTOM' && !customDeadline) || startAfterDeadline}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <SubtaskProposalSheet ref={splitRef} onCreated={() => sheetRef.current?.dismiss()} />
    </>
  );
});

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 36, gap: 10 },
  heading: { fontSize: 16 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  memo: { minHeight: 56, textAlignVertical: 'top' },
  label: { fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  hint: { fontSize: 12 },
  optionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  optionField: { flex: 1 },
  estimate: { width: 90, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
