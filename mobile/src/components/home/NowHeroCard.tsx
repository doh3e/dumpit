import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NowSuggestion, TaskRecommendation, TaskResponse } from '../../api/types';
import { formatDeadline, formatTime, isToday } from '../../tasks/dates';
import { QUEUE_BUCKET_LABEL } from '../../tasks/constants';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroBadge } from '../retro/RetroBadge';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { OrbitProgress } from './OrbitProgress';

type Props = {
  nowSuggestion: NowSuggestion;
  queue: TaskRecommendation[];
  todayDone: number;
  todayTotal: number;
  allDone: boolean;
  onComplete: (task: TaskResponse) => void;
  onEdit: (task: TaskResponse) => void;
};

/** "지금 할 일" 히어로 — 웹 NowHeroCard 3상태(전부 완료/제안/빈 시간) 이식 */
export function NowHeroCard({ nowSuggestion, queue, todayDone, todayTotal, allDone, onComplete, onEdit }: Props) {
  const { colors } = useTheme();
  const task = allDone ? null : nowSuggestion?.task ?? null;
  const heroTime = task?.deadline
    ? (isToday(task.deadline) ? `${formatTime(task.deadline)} 마감` : `${formatDeadline(task.deadline)} 마감`)
    : null;

  return (
    <RetroCard hero>
      <View style={styles.top}>
        <View style={styles.main}>
          <Text style={[styles.eyebrow, { color: colors.accent2, fontFamily: fonts.chrome }]}>지금 할 일</Text>
          {allDone ? (
            <>
              <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
                오늘 다 비웠어요 🚀
              </Text>
              <Text style={[styles.message, { color: colors.sub, fontFamily: fonts.body }]}>
                머릿속이 가벼워졌네요. 내일 또 만나요.
              </Text>
            </>
          ) : task ? (
            <>
              <Pressable onPress={() => onEdit(task)} accessibilityRole="button" accessibilityLabel={`${task.title} 수정`}>
                <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]} numberOfLines={2}>
                  {task.title}
                </Text>
              </Pressable>
              {heroTime && (
                <Text style={[styles.time, { color: colors.warn, fontFamily: fonts.chrome }]}>{heroTime}</Text>
              )}
              <Text style={[styles.message, { color: colors.sub, fontFamily: fonts.body }]} numberOfLines={2}>
                {nowSuggestion.message}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]} numberOfLines={2}>
                {nowSuggestion?.title ?? '지금은 비어 있는 시간이에요.'}
              </Text>
              <Text style={[styles.message, { color: colors.sub, fontFamily: fonts.body }]} numberOfLines={2}>
                {nowSuggestion?.message ?? '가벼운 일부터 하나 시작해볼까요?'}
              </Text>
            </>
          )}
        </View>
        <OrbitProgress done={todayDone} total={todayTotal} />
      </View>

      {task && (
        <View style={styles.actions}>
          <RetroButton label="완료하기" size="sm" onPress={() => onComplete(task)} />
          <RetroButton label="수정" size="sm" variant="ghost" onPress={() => onEdit(task)} />
        </View>
      )}

      {!allDone && queue.length > 0 && (
        <View style={[styles.queue, { borderTopColor: colors.line }]}>
          <Text style={[styles.queueTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>다음에 할 일</Text>
          {queue.slice(0, 3).map((r) => (
            <Pressable
              key={r.task.taskId}
              onPress={() => onEdit(r.task)}
              accessibilityRole="button"
              accessibilityLabel={r.task.title}
              style={({ pressed }) => [styles.queueRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <RetroBadge text={QUEUE_BUCKET_LABEL[r.bucket] ?? '추천'} tone="sub" />
              <Text style={[styles.queueText, { color: colors.fg, fontFamily: fonts.body }]} numberOfLines={1}>
                {r.task.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  main: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 11 },
  title: { fontSize: 20, lineHeight: 27 },
  time: { fontSize: 11 },
  message: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  queue: { borderTopWidth: 1.5, marginTop: 14, paddingTop: 10, gap: 7 },
  queueTitle: { fontSize: 11 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  queueText: { fontSize: 13, flexShrink: 1 },
});
