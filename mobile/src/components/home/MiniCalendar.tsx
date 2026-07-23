import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchCalendarEvents, type CalendarEvent } from '../../api/calendar';
import { getApiErrorMessage } from '../../api/client';
import { createTask } from '../../api/tasks';
import type { TaskResponse } from '../../api/types';
import { keys } from '../../query/keys';
import { bucketByDay, buildMonthCells } from '../../tasks/calendarGrid';
import { formatTime, parseDate } from '../../tasks/dates';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const CALENDAR_PERMISSION_CODES = [
  'CALENDAR_PERMISSION_REQUIRED',
  'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
] as const;

type AxiosLikeError = {
  isAxiosError?: boolean;
  response?: { data?: { code?: unknown } };
};

function isCalendarPermissionError(error: unknown): boolean {
  if (
    typeof error !== 'object'
    || error === null
    || (error as AxiosLikeError).isAxiosError !== true
  ) {
    return false;
  }

  const code = (error as AxiosLikeError).response?.data?.code;
  return CALENDAR_PERMISSION_CODES.some((permissionCode) => permissionCode === code);
}

function getEstimatedMinutes(start: string | null, end: string | null): number | null {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return null;

  const diffMinutes = (endDate.getTime() - startDate.getTime()) / 60_000;
  return diffMinutes > 0 && diffMinutes < 1440 ? Math.round(diffMinutes) : null;
}

function formatEventTime(event: CalendarEvent): string {
  const start = formatTime(event.start);
  const end = formatTime(event.end);
  if (!start) return '';
  return end ? `${start} ~ ${end}` : start;
}

type Props = {
  tasks: TaskResponse[];
  onTaskAdded(): void;
};

export function MiniCalendar({ tasks, onTaskAdded }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const [{ year, month }, setVisibleMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addingEventId, setAddingEventId] = useState<string | null>(null);

  const firstDayOfMonthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const lastDayOfMonthDate = useMemo(
    () => new Date(year, month + 1, 0, 23, 59, 59, 999),
    [year, month],
  );
  const calendarQuery = useQuery({
    queryKey: keys.calendar(year, month),
    queryFn: () => fetchCalendarEvents(firstDayOfMonthDate, lastDayOfMonthDate),
    retry: false,
  });

  const googleEvents = calendarQuery.isError ? [] : (calendarQuery.data ?? []);
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const tasksByDay = useMemo(
    () => bucketByDay(tasks, (task) => task.deadline, year, month),
    [tasks, year, month],
  );
  const googleByDay = useMemo(
    () => bucketByDay(googleEvents, (event) => event.start, year, month),
    [googleEvents, year, month],
  );
  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : null;
  const selectedTasks = selectedDay === null ? [] : (tasksByDay.get(selectedDay) ?? []);
  const selectedEvents = selectedDay === null ? [] : (googleByDay.get(selectedDay) ?? []);
  const showCalendarHint =
    calendarQuery.isError && isCalendarPermissionError(calendarQuery.error);

  const moveMonth = (offset: number) => {
    setSelectedDay(null);
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.month + offset, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const toggleDay = (day: number, hasAny: boolean) => {
    if (!hasAny) return;
    setSelectedDay((current) => (current === day ? null : day));
  };

  const importEvent = async (event: CalendarEvent) => {
    setAddingEventId(event.id);
    try {
      await createTask({
        title: event.summary ?? '(제목 없음)',   // 제목 없는 이벤트도 서버 @NotBlank에 안 걸리게
        description: '구글 캘린더에서 가져옴',
        deadline: event.end ?? event.start ?? null,
        startTime: event.start ?? null,
        endTime: event.end ?? null,
        estimatedMinutes: getEstimatedMinutes(event.start, event.end),
        isLocked: true,
      });
      toast.show('태스크로 가져왔어요!');
      onTaskAdded();
    } catch (error) {
      toast.show(getApiErrorMessage(error));
    } finally {
      setAddingEventId(null);
    }
  };

  return (
    <RetroCard>
      <View style={styles.header}>
        <Pressable
          onPress={() => moveMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          hitSlop={4}
          style={({ pressed }) => [
            styles.monthButton,
            { borderColor: colors.line, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.monthButtonText, { color: colors.sub, fontFamily: fonts.chrome }]}>◀</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.fg, fontFamily: fonts.chrome }]}>
          {year}년 {month + 1}월
        </Text>
        <Pressable
          onPress={() => moveMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          hitSlop={4}
          style={({ pressed }) => [
            styles.monthButton,
            { borderColor: colors.line, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.monthButtonText, { color: colors.sub, fontFamily: fonts.chrome }]}>▶</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text
            key={weekday}
            style={[
              styles.weekday,
              { color: index === 0 ? colors.accent : colors.sub, fontFamily: fonts.chrome },
            ]}
          >
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.cellSlot} />;
          }

          const hasTasks = (tasksByDay.get(day)?.length ?? 0) > 0;
          const hasGoogleEvents = (googleByDay.get(day)?.length ?? 0) > 0;
          const hasAny = hasTasks || hasGoogleEvents;
          const isToday = todayDay === day;

          return (
            <View key={day} style={styles.cellSlot}>
              <Pressable
                onPress={() => toggleDay(day, hasAny)}
                disabled={!hasAny}
                accessibilityRole="button"
                accessibilityLabel={`${month + 1}월 ${day}일`}
                accessibilityState={{ disabled: !hasAny, selected: selectedDay === day }}
                style={({ pressed }) => [
                  styles.dayCell,
                  isToday && { backgroundColor: colors.accent },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isToday ? colors.onAccent : colors.fg, fontFamily: fonts.chrome },
                  ]}
                >
                  {day}
                </Text>
                <View style={styles.dots}>
                  {hasTasks && <View style={[styles.dot, { backgroundColor: colors.accent2 }]} />}
                  {hasGoogleEvents && (
                    <View style={[styles.dot, { backgroundColor: colors.starlight }]} />
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {showCalendarHint && (
        <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
          구글 캘린더는 웹에서 연결하면 보여요
        </Text>
      )}

      {selectedDay !== null && (
        <View style={[styles.panel, { borderTopColor: colors.line }]}>
          <Text style={[styles.panelTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>
            {month + 1}월 {selectedDay}일
          </Text>

          {selectedTasks.map((task) => (
            <View key={task.taskId} style={styles.itemRow}>
              <View style={[styles.itemDot, { backgroundColor: colors.accent2 }]} />
              <View style={styles.itemContent}>
                <Text
                  style={[styles.itemTitle, { color: colors.fg, fontFamily: fonts.bodyBold }]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                {task.deadline && (
                  <Text style={[styles.itemTime, { color: colors.sub, fontFamily: fonts.body }]}>
                    마감 {formatTime(task.deadline)}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {selectedEvents.map((event) => (
            <View key={event.id} style={styles.itemRow}>
              <View style={[styles.itemDot, { backgroundColor: colors.starlight }]} />
              <View style={styles.itemContent}>
                <Text
                  style={[styles.itemTitle, { color: colors.fg, fontFamily: fonts.bodyBold }]}
                  numberOfLines={1}
                >
                  {event.summary}
                </Text>
                {!!formatEventTime(event) && (
                  <Text style={[styles.itemTime, { color: colors.sub, fontFamily: fonts.body }]}>
                    {formatEventTime(event)}
                  </Text>
                )}
              </View>
              <RetroButton
                label="태스크로 가져오기"
                size="sm"
                variant="ghost"
                busy={addingEventId === event.id}
                disabled={addingEventId !== null}
                onPress={() => importEvent(event)}
              />
            </View>
          ))}
        </View>
      )}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: { fontSize: 13 },
  monthLabel: { fontSize: 14 },
  weekdayRow: { flexDirection: 'row', marginBottom: 2 },
  weekday: { width: '14.285714%', textAlign: 'center', fontSize: 11, paddingVertical: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellSlot: { width: '14.285714%', padding: 2 },
  dayCell: {
    minHeight: 44,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayNumber: { fontSize: 12 },
  dots: { minHeight: 5, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  dot: { width: 5, height: 5 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  panel: { borderTopWidth: 1.5, marginTop: 12, paddingTop: 10, gap: 8 },
  panelTitle: { fontSize: 11, marginBottom: 2 },
  itemRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: { width: 6, height: 6 },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13 },
  itemTime: { fontSize: 11, marginTop: 2 },
});
