import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlanningSections, TaskResponse, TaskStatus } from '../../api/types';
import { formatTime, isToday } from '../../tasks/dates';
import { groupByParent, sortByDeadline } from '../../tasks/grouping';
import { calcCompletionCoins } from '../../tasks/rewards';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroBadge } from '../retro/RetroBadge';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { Chip } from '../retro/Chip';
import { TaskRow, type TogglePos } from './TaskRow';

const TABS = [
  { id: 'today', label: '오늘' },
  { id: 'tomorrow', label: '내일' },
  { id: 'week', label: '일주일' },
  { id: 'someday', label: '언젠가' },
  { id: 'all', label: '전부' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const ALL_TAB_SECTIONS: { key: keyof PlanningSections; title: string }[] = [
  { key: 'today', title: '오늘' },
  { key: 'tomorrow', title: '내일' },
  { key: 'next7Days', title: '일주일 내' },
  { key: 'later', title: '그 외' },
  { key: 'someday', title: '언젠가' },
];

type Props = {
  sections: PlanningSections;
  onToggle: (task: TaskResponse, next: TaskStatus, pos?: TogglePos) => void;
  onPressTask: (task: TaskResponse) => void;
  onPressBoard: () => void;
};

/** "해야 할 일" 리스트 — 탭 5종 + overdue 상단 고정 + 오늘 완료 접이식 (웹 TaskListCard 이식) */
export function TaskListCard({ sections, onToggle, onPressTask, onPressBoard }: Props) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabId>('today');
  const [doneOpen, setDoneOpen] = useState(false);

  const overdue = useMemo(() => groupByParent(sections.overdue), [sections.overdue]);

  const activeCount =
    sections.overdue.length + sections.today.length + sections.tomorrow.length +
    sections.next7Days.length + sections.later.length + sections.someday.length;

  const tabTasks = useMemo(() => {
    if (tab === 'today') return groupByParent(sections.today);
    if (tab === 'tomorrow') return groupByParent(sections.tomorrow);
    if (tab === 'someday') return groupByParent(sections.someday);
    if (tab === 'week') {
      return groupByParent(sortByDeadline([...sections.today, ...sections.tomorrow, ...sections.next7Days]));
    }
    return [];
  }, [tab, sections]);

  const todayDoneTasks = useMemo(
    () => sections.recentDone.filter((t) => t.status === 'DONE' && isToday(t.completedAt)),
    [sections.recentDone],
  );

  // 자식 판정은 렌더하는 리스트 기준 — '전부' 탭 섹션에서도 들여쓰기가 유지된다
  const renderRows = (list: TaskResponse[], isOverdue = false) => {
    const ids = new Set(list.map((t) => t.taskId));
    return list.map((t) => (
      <TaskRow
        key={t.taskId}
        task={t}
        overdue={isOverdue}
        child={!!t.parentTaskId && ids.has(t.parentTaskId)}
        onToggle={onToggle}
        onPress={onPressTask}
      />
    ));
  };

  return (
    <RetroCard style={{ paddingBottom: 10 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          해야 할 일 <Text style={{ color: colors.accent2 }}>({activeCount})</Text>
        </Text>
        <RetroButton label="전체 보드" size="sm" variant="ghost" onPress={onPressBoard} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </ScrollView>

      {overdue.length > 0 && <View style={styles.section}>{renderRows(overdue, true)}</View>}

      {tab !== 'all' ? (
        tabTasks.length > 0 ? (
          <View style={styles.section}>{renderRows(tabTasks)}</View>
        ) : (
          overdue.length === 0 && (
            <Text style={[styles.empty, { color: colors.sub, fontFamily: fonts.body }]}>
              이 탭은 비어 있어요. ＋로 하나 덤프해보세요.
            </Text>
          )
        )
      ) : (
        ALL_TAB_SECTIONS.map(({ key, title }) => {
          const list = groupByParent(sections[key]);
          if (list.length === 0) return null;
          return (
            <View key={key} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>{title}</Text>
              {renderRows(list)}
            </View>
          );
        })
      )}

      {todayDoneTasks.length > 0 && (
        <View style={[styles.doneWrap, { borderTopColor: colors.line }]}>
          <Pressable
            onPress={() => setDoneOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="오늘 완료한 일 접기 펼치기"
            accessibilityState={{ expanded: doneOpen }}
            style={({ pressed }) => [styles.doneHeader, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>
              오늘 완료한 일 ({todayDoneTasks.length}) {doneOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
          {doneOpen &&
            todayDoneTasks.map((t) => (
              <View key={t.taskId} style={styles.doneRow}>
                <Pressable
                  onPress={() => onToggle(t, 'TODO')}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${t.title} 완료 해제`}
                  accessibilityState={{ checked: true }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.doneCheckbox,
                    { borderColor: colors.edge, backgroundColor: colors.accent },
                    pressed && { transform: [{ scale: 0.9 }] },
                  ]}
                >
                  <Text style={{ color: colors.onAccent, fontSize: 11, fontFamily: fonts.chrome }}>✓</Text>
                </Pressable>
                <Text
                  style={[styles.doneTitle, { color: colors.sub, fontFamily: fonts.body }]}
                  numberOfLines={1}
                >
                  {t.title}
                </Text>
                <Text style={[styles.doneMeta, { color: colors.starlight, fontFamily: fonts.chrome }]}>
                  +{t.coinsGranted ?? calcCompletionCoins(t)}
                </Text>
                {t.completedAt && (
                  <Text style={[styles.doneMeta, { color: colors.sub, fontFamily: fonts.chrome }]}>
                    {formatTime(t.completedAt)} 완료
                  </Text>
                )}
              </View>
            ))}
        </View>
      )}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16 },
  tabs: { gap: 6, paddingBottom: 10 },
  section: { marginBottom: 4 },
  sectionTitle: { fontSize: 11, marginTop: 6, marginBottom: 2 },
  empty: { fontSize: 13, paddingVertical: 18, textAlign: 'center' },
  doneWrap: { borderTopWidth: 1.5, marginTop: 8, paddingTop: 8 },
  doneHeader: { minHeight: 32, justifyContent: 'center' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  doneCheckbox: {
    width: 20, height: 20, borderWidth: 2, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { flex: 1, fontSize: 13, textDecorationLine: 'line-through' },
  doneMeta: { fontSize: 10 },
});
