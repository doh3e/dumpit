import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { RoutineResponse } from '../../api/types';
import { getApiErrorMessage } from '../../api/client';
import { useRoutines, useToggleRoutine } from '../../query/routineHooks';
import { parseDate } from '../../tasks/dates';
import { repeatSummary, timeSummary } from '../../routines/repeatSummary';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';

function nextRunLabel(nextRunAt: string | null): string | null {
  const d = parseDate(nextRunAt);
  if (!d) return null;
  return `다음 실행 ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 루틴 목록 — 활성 우선 정렬(웹 sortedRoutines), 행 탭 = 편집, 스위치 = 활성 토글 */
export function RoutineListCard() {
  const { colors } = useTheme();
  const toast = useToast();
  const routines = useRoutines();
  const toggle = useToggleRoutine();

  const sorted = useMemo(
    () => [...(routines.data ?? [])].sort((a, b) => Number(b.enabled) - Number(a.enabled)),
    [routines.data],
  );

  const onToggle = (r: RoutineResponse) => {
    toggle.mutate(
      { routineId: r.routineId, enabled: !r.enabled },
      { onError: (e) => toast.show(getApiErrorMessage(e, '루틴 상태를 바꾸지 못했어요.')) },
    );
  };

  return (
    <RetroCard style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          🔁 루틴 {sorted.length > 0 ? `(${sorted.filter((r) => r.enabled).length}/${sorted.length} 활성)` : ''}
        </Text>
        <RetroButton label="＋ 새 루틴" size="sm" onPress={() => router.push('/routine-edit' as Href)} />
      </View>

      {sorted.length === 0 && (
        <Text style={[styles.empty, { color: colors.sub, fontFamily: fonts.body }]}>
          반복되는 일을 루틴으로 만들어보세요.{'\n'}정한 날짜·요일에 태스크가 자동으로 생겨요.
        </Text>
      )}

      {sorted.map((r) => {
        const next = nextRunLabel(r.nextRunAt);
        return (
          <Pressable
            key={r.routineId}
            onPress={() => router.push({ pathname: '/routine-edit', params: { routineId: r.routineId } } as never)}
            accessibilityRole="button"
            accessibilityLabel={`${r.name} 편집`}
            style={({ pressed }) => [styles.row, { borderTopColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.rowText}>
              <Text
                numberOfLines={1}
                style={[styles.name, { color: r.enabled ? colors.fg : colors.sub, fontFamily: fonts.display }]}
              >
                {r.name}
              </Text>
              <Text style={[styles.meta, { color: colors.sub, fontFamily: fonts.chrome }]}>
                {repeatSummary(r)} · {timeSummary(r)}
              </Text>
              {next && (
                <Text style={[styles.meta, { color: colors.accent2, fontFamily: fonts.chrome }]}>{next}</Text>
              )}
            </View>
            <Switch
              value={r.enabled}
              onValueChange={() => onToggle(r)}
              trackColor={{ false: colors.line, true: colors.accent2 }}
              thumbColor={colors.card}
              accessibilityLabel={`${r.name} 활성 스위치`}
            />
          </Pressable>
        );
      })}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, flexShrink: 1 },
  empty: { fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderTopWidth: 1, paddingTop: 12, paddingBottom: 4, minHeight: 56,
  },
  rowText: { flex: 1, gap: 3 },
  name: { fontSize: 15 },
  meta: { fontSize: 11 },
});
