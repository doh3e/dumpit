import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { TaskResponse, TaskStatus } from '../../api/types';
import { usePlanning } from '../../query/hooks';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type PickedTask = { taskId: string; title: string; status: TaskStatus };

type Props = {
  onPick: (task: PickedTask | null) => void;
};

/** 집중할 태스크 선택 — 서버 실효 우선순위 내림차순 상위 30개 (웹 activeTasks 대응) */
export const TaskPickerSheet = forwardRef<BottomSheetModal, Props>(
  function TaskPickerSheet({ onPick }, ref) {
    const { colors } = useTheme();
    const planning = usePlanning();

    const candidates = useMemo(() => {
      const tasks = planning.data?.tasks ?? [];
      return tasks
        .filter((t: TaskResponse) => t.status !== 'DONE' && t.status !== 'CANCELLED')
        .sort((a, b) => b.effectivePriority - a.effectivePriority)
        .slice(0, 30);
    }, [planning.data]);

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backgroundStyle={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        <BottomSheetView style={styles.body}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>무엇에 집중할까요?</Text>
          <ScrollView style={styles.list}>
            <Pressable
              onPress={() => onPick(null)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, { borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.rowText, { color: colors.sub, fontFamily: fonts.body }]}>🙅 태스크 없이 집중</Text>
            </Pressable>
            {candidates.map((t) => (
              <Pressable
                key={t.taskId}
                onPress={() => onPick({ taskId: t.taskId, title: t.title, status: t.status })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, { borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text numberOfLines={1} style={[styles.rowText, { color: colors.fg, fontFamily: fonts.body }]}>
                  {t.title}
                </Text>
                <Text style={[styles.score, { color: colors.sub, fontFamily: fonts.chrome }]}>
                  {Math.round(t.effectivePriority * 100)}점
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 16, marginBottom: 12 },
  list: { maxHeight: 420 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderBottomWidth: 1, paddingVertical: 13, minHeight: 46,
  },
  rowText: { fontSize: 14, flex: 1 },
  score: { fontSize: 11 },
});
