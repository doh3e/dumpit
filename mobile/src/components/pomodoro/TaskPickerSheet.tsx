import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
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
        maxDynamicContentSize={Math.round(windowHeight * 0.62)}
        backgroundStyle={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        {/* 일반 ScrollView는 시트 팬 제스처에 먹혀 스크롤 불가 — 시트 전용 스크롤러.
            하단 인셋 — 고정 paddingBottom만 두면 edge-to-edge에서 마지막 행이 OS 내비 바에 가려진다 */}
        <BottomSheetScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>무엇에 집중할까요?</Text>
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
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  body: { padding: 20 },
  title: { fontSize: 16, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderBottomWidth: 1, paddingVertical: 13, minHeight: 46,
  },
  rowText: { fontSize: 14, flex: 1 },
  score: { fontSize: 11 },
});
