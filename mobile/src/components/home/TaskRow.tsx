import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import type { TaskResponse, TaskStatus } from '../../api/types';
import { getCategory } from '../../tasks/constants';
import { STICKER_SPRITES } from '../../tasks/stickers';
import { formatDeadline } from '../../tasks/dates';
import { calcCompletionCoins } from '../../tasks/rewards';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroBadge } from '../retro/RetroBadge';

export type TogglePos = { x: number; y: number };

type Props = {
  task: TaskResponse;
  overdue?: boolean;
  child?: boolean;
  onToggle: (task: TaskResponse, next: TaskStatus, pos?: TogglePos) => void;
  onPress: (task: TaskResponse) => void;
};

/** 리스트 공용 태스크 행 — 체크박스(완료 토글) + 본문(상세 진입) + 메타 */
export const TaskRow = memo(function TaskRow({ task, overdue = false, child = false, onToggle, onPress }: Props) {
  const { colors } = useTheme();
  const done = task.status === 'DONE';
  const category = getCategory(task.category);
  const coins = calcCompletionCoins(task);
  const deadlineLabel = formatDeadline(task.deadline);

  const handleToggle = (e: GestureResponderEvent) => {
    onToggle(task, done ? 'TODO' : 'DONE', { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
  };

  return (
    <View
      style={[
        styles.row,
        child && { marginLeft: 22, borderLeftWidth: 3, borderLeftColor: colors.accent2, paddingLeft: 9 },
      ]}
    >
      <Pressable
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.title} ${done ? '완료 해제' : '완료'}`}
        accessibilityState={{ checked: done }}
        hitSlop={10}
        style={({ pressed }) => [
          styles.checkbox,
          { borderColor: colors.edge, backgroundColor: done ? colors.accent : colors.card },
          pressed && { transform: [{ scale: 0.9 }] },
        ]}
      >
        {done && <Text style={[styles.check, { color: colors.onAccent, fontFamily: fonts.chrome }]}>✓</Text>}
      </Pressable>

      <Pressable
        onPress={() => onPress(task)}
        accessibilityRole="button"
        accessibilityLabel={`${task.title} 상세`}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.titleRow}>
          {child && <RetroBadge text="↳ 서브" tone="accent2" />}
          {overdue && <RetroBadge text="마감 지남" tone="accent" />}
          {task.status === 'IN_PROGRESS' && <RetroBadge text="진행 중" tone="accent2" />}
          {task.stickerCode && STICKER_SPRITES[task.stickerCode] && (
            <Image
              source={STICKER_SPRITES[task.stickerCode].img}
              style={styles.sticker}
              resizeMode="contain"
              accessibilityLabel={`스티커 ${STICKER_SPRITES[task.stickerCode].name}`}
            />
          )}
        </View>
        <Text
          style={[
            styles.title,
            { color: done ? colors.sub : colors.fg, fontFamily: fonts.display },
            done && styles.done,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          {deadlineLabel && (
            <Text style={[styles.metaText, { color: overdue ? colors.warn : colors.sub, fontFamily: fonts.chrome }]}>
              {deadlineLabel}
            </Text>
          )}
          {task.estimatedMinutes != null && (
            <Text style={[styles.metaText, { color: colors.sub, fontFamily: fonts.chrome }]}>
              {task.estimatedMinutes}분
            </Text>
          )}
          <Text style={[styles.metaText, { color: colors.sub, fontFamily: fonts.chrome }]}>
            P {Math.round((task.effectivePriority ?? 0) * 100)}
          </Text>
          {coins > 0 && !done && (
            <Text style={[styles.metaText, { color: colors.starlight, fontFamily: fonts.chrome }]}>+{coins}</Text>
          )}
          <Text style={[styles.metaText, { color: colors.sub, fontFamily: fonts.body }]}>
            {category.emoji} {category.label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'flex-start' },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderRadius: 4, marginTop: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { fontSize: 13, lineHeight: 15 },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', alignItems: 'center' },
  sticker: { width: 16, height: 16 },
  title: { fontSize: 15, lineHeight: 21 },
  done: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  metaText: { fontSize: 10 },
});
