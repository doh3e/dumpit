import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSheetFocus } from '../../a11y/useSheetFocus';
import type { TaskResponse, TaskStatus } from '../../api/types';
import { useContentFrame } from '../../layout/useContentFrame';
import { usePlanning } from '../../query/hooks';
import { useTheme } from '../../theme/useTheme';
import { PixelIcon } from '../common/PixelIcon';

export type PickedTask = { taskId: string; title: string; status: TaskStatus };

type Props = {
  onPick: (task: PickedTask | null) => void;
};

/** 집중할 태스크 선택 — 서버 실효 우선순위 내림차순 상위 30개 (웹 activeTasks 대응) */
export const TaskPickerSheet = forwardRef<BottomSheetModal, Props>(
  function TaskPickerSheet({ onPick }, ref) {
    const { colors, fonts } = useTheme();
    const insets = useSafeAreaInsets();
    const frame = useContentFrame(20);
    const { height: windowHeight } = useWindowDimensions();
    const topInset = insets.top + 12;
    const maxContentHeight = Math.max(0, windowHeight - topInset - insets.bottom - 12);
    const planning = usePlanning();
    const { headingRef, onChange } = useSheetFocus();

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
        topInset={topInset}
        maxDynamicContentSize={Math.min(Math.round(windowHeight * 0.62), maxContentHeight)}
        onChange={onChange}
        backgroundStyle={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        {/* 일반 ScrollView는 시트 팬 제스처에 먹혀 스크롤 불가 — 시트 전용 스크롤러.
            하단 인셋 — 고정 paddingBottom만 두면 edge-to-edge에서 마지막 행이 OS 내비 바에 가려진다 */}
        <BottomSheetScrollView
          accessibilityViewIsModal
          contentContainerStyle={StyleSheet.flatten([styles.body, frame, { paddingBottom: insets.bottom + 24 }])}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingRow}>
            <Text ref={headingRef} accessibilityRole="header" style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>무엇에 집중할까요?</Text>
            <Pressable onPress={() => (ref as React.RefObject<BottomSheetModal | null>)?.current?.dismiss()} accessibilityRole="button" accessibilityLabel="태스크 선택 닫기" style={({ pressed }) => [styles.close, { backgroundColor: pressed ? colors.chip : 'transparent' }]}>
              <Text style={{ color: colors.fg, fontFamily: fonts.chrome }}>✕</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => onPick(null)}
            accessibilityRole="button" accessibilityLabel="태스크 없이 집중"
            style={({ pressed }) => [styles.row, { borderColor: pressed ? colors.fg : colors.line, backgroundColor: pressed ? colors.chip : colors.card }]}
          >
            <Text style={[styles.rowText, { color: colors.sub, fontFamily: fonts.body }]}>
              <PixelIcon name="ban" size={12} /> 태스크 없이 집중
            </Text>
          </Pressable>
          {candidates.map((t) => (
            <Pressable
              key={t.taskId}
              onPress={() => onPick({ taskId: t.taskId, title: t.title, status: t.status })}
              accessibilityRole="button" accessibilityLabel={`${t.title} 선택`}
              style={({ pressed }) => [styles.row, { borderColor: pressed ? colors.fg : colors.line, backgroundColor: pressed ? colors.chip : colors.card }]}
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
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16 },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48,
  },
  rowText: { fontSize: 14, flex: 1 },
  score: { fontSize: 11 },
});
