import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../src/api/client';
import type { PlanningSections, TaskResponse, TaskStatus } from '../src/api/types';
import { TaskRow } from '../src/components/home/TaskRow';
import { Chip } from '../src/components/retro/Chip';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { useToast } from '../src/components/retro/ToastProvider';
import { TaskDetailSheet, type TaskDetailSheetHandle } from '../src/components/task/TaskDetailSheet';
import { usePlanning, useToggleTask } from '../src/query/hooks';
import { sortByDeadline, sortTasks } from '../src/tasks/grouping';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BOARD_SECTIONS: { key: keyof PlanningSections; title: string }[] = [
  { key: 'overdue', title: '마감 지남' },
  { key: 'today', title: '오늘' },
  { key: 'tomorrow', title: '내일' },
  { key: 'next7Days', title: '일주일 내' },
  { key: 'later', title: '그 외' },
  { key: 'someday', title: '언젠가' },
  { key: 'recentDone', title: '완료 (최근 3일)' },
];

type SortMode = 'priority' | 'deadline';

/** 태스크 전체 보드 — 7개 버킷 조망 (웹 TaskBoardModal 대응) */
export default function TaskBoardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const planning = usePlanning();
  const toggle = useToggleTask();
  const detailRef = useRef<TaskDetailSheetHandle>(null);
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  const sections = useMemo(() => {
    const s = planning.data?.sections;
    if (!s) return [];
    return BOARD_SECTIONS.map(({ key, title }) => ({
      key,
      title,
      // overdue는 항상 마감순 (웹 패리티)
      data: key === 'overdue' ? sortByDeadline(s[key]) : sortTasks(s[key], sortMode),
    }));
  }, [planning.data, sortMode]);

  const onToggle = useCallback(
    (task: TaskResponse, next: TaskStatus) => {
      toggle.mutate(
        { taskId: task.taskId, status: next },
        { onError: (e) => toast.show(getApiErrorMessage(e, '상태 변경에 실패했어요.')) },
      );
    },
    [toggle, toast],
  );

  const onPressTask = useCallback((task: TaskResponse) => detailRef.current?.present(task), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ animation: 'slide_from_right' }} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, styles.back]}
        >
          <Text style={[styles.backText, { color: colors.fg, fontFamily: fonts.displayBold }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>태스크 전체</Text>
        <View style={styles.sort}>
          <Chip label="중요도순" selected={sortMode === 'priority'} onPress={() => setSortMode('priority')} />
          <Chip label="마감순" selected={sortMode === 'deadline'} onPress={() => setSortMode('deadline')} />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(t) => t.taskId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
              {section.title}
            </Text>
            <RetroBadge text={String(section.data.length)} tone={section.data.length > 0 ? 'accent2' : 'sub'} />
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.line }]}>
              <Text style={[styles.emptyText, { color: colors.sub, fontFamily: fonts.body }]}>비어 있어요.</Text>
            </View>
          ) : null
        }
        renderItem={({ item, section }) => (
          <TaskRow
            task={item}
            overdue={section.key === 'overdue'}
            child={!!item.parentTaskId}
            onToggle={onToggle}
            onPress={onPressTask}
          />
        )}
      />

      <TaskDetailSheet ref={detailRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  back: { minWidth: 34, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20 },
  title: { fontSize: 17, flex: 1 },
  sort: { flexDirection: 'row', gap: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 4 },
  sectionTitle: { fontSize: 14 },
  emptyBox: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  emptyText: { fontSize: 12 },
});
