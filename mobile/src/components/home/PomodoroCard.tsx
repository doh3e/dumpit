import { router, type Href } from 'expo-router';
import { useEffect, useReducer } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { deriveState } from '../../pomodoro/engine';
import { getSession, subscribe } from '../../pomodoro/store';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 홈 뽀모도로 진입 카드 — 대기: 시작 버튼 / 실행 중: 남은 시간 미니 표시 (umbrella §3) */
export function PomodoroCard() {
  const { colors } = useTheme();
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(force), []);

  const session = getSession();
  const derived = session ? deriveState(session, Date.now()) : null;
  const running = !!session && session.pausedAt == null && derived?.phase !== 'DONE';

  useEffect(() => {
    if (!running) return;
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, [running]);

  const goTimer = () => router.push('/pomodoro' as Href);

  if (!session || !derived) {
    return (
      <RetroCard style={styles.idleCard}>
        <View style={styles.idleText}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>🍅 뽀모도로</Text>
          <Text style={[styles.sub, { color: colors.sub, fontFamily: fonts.body }]}>몰입의 시간을 시작해봐요</Text>
        </View>
        <RetroButton label="집중 시작하기" size="sm" onPress={goTimer} />
      </RetroCard>
    );
  }

  const phaseEmoji = derived.phase === 'FOCUS' ? '🍅' : derived.phase === 'BREAK' ? '☕' : '🎉';
  const phaseLabel =
    derived.phase === 'DONE' ? '모든 세트 완료!'
    : session.pausedAt != null ? '일시정지됨'
    : derived.phase === 'FOCUS' ? '집중 중' : derived.long ? '긴 휴식 중' : '휴식 중';

  return (
    <Pressable onPress={goTimer} accessibilityRole="button" accessibilityLabel="뽀모도로 타이머 열기">
      {({ pressed }) => (
        <RetroCard style={[styles.runCard, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.runTime, { color: colors.fg, fontFamily: fonts.display }]}>
            {phaseEmoji} {derived.phase === 'DONE' ? '완료' : fmt(derived.remainingSec)}
          </Text>
          <View style={styles.runText}>
            <Text style={[styles.runLabel, { color: colors.sub, fontFamily: fonts.chrome }]}>
              {session.pausedAt != null ? '⏸️ ' : ''}{phaseLabel}
            </Text>
            {session.taskTitle && (
              <Text numberOfLines={1} style={[styles.sub, { color: colors.fg, fontFamily: fonts.body }]}>
                🎯 {session.taskTitle}
              </Text>
            )}
          </View>
        </RetroCard>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  idleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  idleText: { flex: 1, gap: 3 },
  title: { fontSize: 15 },
  sub: { fontSize: 12 },
  runCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  runTime: { fontSize: 26 },
  runText: { flex: 1, gap: 3 },
  runLabel: { fontSize: 11 },
});
