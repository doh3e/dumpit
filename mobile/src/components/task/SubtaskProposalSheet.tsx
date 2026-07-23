import { BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { confirmSplit, proposeSplit } from '../../api/tasks';
import type { TaskResponse } from '../../api/types';
import { invalidateAfterAi } from '../../query/hooks';
import { keys } from '../../query/keys';
import { AI_COSTS } from '../../tasks/constants';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';
import { useToast } from '../retro/ToastProvider';

export type SubtaskProposalSheetHandle = { present(task: TaskResponse): void };

type Item = { include: boolean; title: string; description: string | null; estimate: string };

type Props = { onCreated: () => void };

/** AI 서브태스크 분해 — 제안(3점) 받아 편집·선택 후 확정 생성 (웹 SubtaskProposalModal 이식) */
export const SubtaskProposalSheet = forwardRef<SubtaskProposalSheetHandle, Props>(
  function SubtaskProposalSheet({ onCreated }, ref) {
    const { colors } = useTheme();
    const toast = useToast();
    const qc = useQueryClient();
    const sheetRef = useRef<BottomSheetModal>(null);
    const presentedIdRef = useRef<string | null>(null);

    const [task, setTask] = useState<TaskResponse | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (target: TaskResponse) => {
      const id = target.taskId;
      setLoading(true);
      setItems([]);
      try {
        const res = await proposeSplit(id);
        invalidateAfterAi(qc);
        if (presentedIdRef.current !== id) return;   // 늦은 응답 — 다른 태스크로 재열림
        setItems(res.subtasks.map((s) => ({
          include: true,
          title: s.title,
          description: s.description ?? null,
          estimate: s.estimatedMinutes != null ? String(s.estimatedMinutes) : '',
        })));
      } catch (e) {
        if (presentedIdRef.current !== id) return;
        toast.show(getApiErrorMessage(e, 'AI 제안을 받지 못했어요.'));
        sheetRef.current?.dismiss();
      } finally {
        if (presentedIdRef.current === id) setLoading(false);
      }
    }, [qc, toast]);

    useImperativeHandle(ref, () => ({
      present(target: TaskResponse) {
        presentedIdRef.current = target.taskId;
        setSaving(false);
        setTask(target);
        sheetRef.current?.present();
        load(target);
      },
    }), [load]);

    const selected = items.filter((i) => i.include && i.title.trim());

    const create = useCallback(async () => {
      if (!task || selected.length === 0) return;
      setSaving(true);
      try {
        await confirmSplit(task.taskId, selected.map((s) => ({
          title: s.title.trim(),
          description: s.description?.trim() || null,
          estimatedMinutes: s.estimate ? parseInt(s.estimate, 10) : null,
        })));
        qc.invalidateQueries({ queryKey: keys.planning });
        toast.show(`${selected.length}개 서브태스크를 만들었어요!`);
        sheetRef.current?.dismiss();
        onCreated();
      } catch (e) {
        toast.show(getApiErrorMessage(e, '서브태스크 생성에 실패했어요.'));
      } finally {
        setSaving(false);
      }
    }, [task, selected, qc, toast, onCreated]);

    const patchItem = (idx: number, patch: Partial<Item>) =>
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['65%']}
        backgroundStyle={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line, width: 44 }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            🧩 AI로 쪼개기 <Text style={{ color: colors.sub, fontSize: 11, fontFamily: fonts.chrome }}>✨ {AI_COSTS.SUBTASK_PROPOSAL}점</Text>
          </Text>
          {task && (
            <Text style={[styles.parent, { color: colors.sub, fontFamily: fonts.body }]} numberOfLines={1}>
              {task.title}
            </Text>
          )}

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.sub, fontFamily: fonts.body }]}>
                AI가 잘게 쪼개는 중…
              </Text>
            </View>
          )}

          {items.map((item, idx) => (
            <View key={idx} style={[styles.item, { borderColor: colors.line }]}>
              <Pressable
                onPress={() => patchItem(idx, { include: !item.include })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.include }}
                accessibilityLabel={`${item.title} 포함`}
                hitSlop={8}
                style={[
                  styles.checkbox,
                  { borderColor: colors.edge, backgroundColor: item.include ? colors.accent2 : colors.card },
                ]}
              >
                {item.include && <Text style={{ color: colors.onAccent, fontSize: 11, fontFamily: fonts.chrome }}>✓</Text>}
              </Pressable>
              <View style={styles.itemBody}>
                <BottomSheetTextInput
                  key={`st-${task?.taskId ?? 'none'}-${idx}`}
                  defaultValue={item.title}
                  onChangeText={(v) => patchItem(idx, { title: v })}
                  maxLength={200}
                  style={[styles.itemInput, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.body, backgroundColor: colors.bg }]}
                  accessibilityLabel="서브태스크 제목"
                />
                {item.description ? (
                  <Text style={[styles.itemDesc, { color: colors.sub, fontFamily: fonts.body }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <BottomSheetTextInput
                value={item.estimate}
                onChangeText={(v) => patchItem(idx, { estimate: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="분"
                placeholderTextColor={colors.sub}
                style={[styles.itemInput, styles.estimate, { borderColor: colors.line, color: colors.fg, fontFamily: fonts.chrome, backgroundColor: colors.bg }]}
                accessibilityLabel="예상 분"
              />
            </View>
          ))}

          {!loading && items.length > 0 && (
            <RetroButton
              label={`${selected.length}개 만들기`}
              onPress={create}
              busy={saving}
              disabled={selected.length === 0 || saving}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 32, gap: 10 },
  heading: { fontSize: 16 },
  parent: { fontSize: 12 },
  loading: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  loadingText: { fontSize: 13 },
  item: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1.5, borderRadius: 8, padding: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  itemBody: { flex: 1, gap: 4 },
  itemInput: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  itemDesc: { fontSize: 11 },
  estimate: { width: 56, textAlign: 'center' },
});
