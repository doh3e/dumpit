import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
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
  // 렌더 중 Date.now() 직접 읽기는 React Compiler가 캐시해 시간이 멈춰 보인다 — now를 상태로 관리
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(() => setNow(Date.now())), []);

  const session = getSession();
  const derived = session ? deriveState(session, now) : null;
  const running = !!session && session.pausedAt == null && derived?.phase !== 'DONE';

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
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

  // 실행 중엔 버튼이 상태를 입는다 — 라벨·색(틸)로 "지금 돌아가는 중"을 표시 (사용자 피드백 2026-07-24)
  const paused = session.pausedAt != null;
  const buttonLabel =
    derived.phase === 'DONE' ? '🎉 완료 · 정리하기'
    : paused ? '⏸ 일시정지 · 확인하기'
    : derived.phase === 'FOCUS' ? '🍅 집중 중 · 확인하기'
    : derived.long ? '☕ 긴 휴식 중 · 확인하기' : '☕ 휴식 중 · 확인하기';
  const statusLine =
    derived.phase === 'DONE'
      ? '모든 세트 완료!'
      : `${fmt(derived.remainingSec)} 남음${session.taskTitle ? ` · 🎯 ${session.taskTitle}` : ''}`;

  return (
    <Pressable onPress={goTimer} accessibilityRole="button" accessibilityLabel="뽀모도로 타이머 열기">
      {({ pressed }) => (
        <RetroCard style={[styles.idleCard, pressed && { opacity: 0.85 }]}>
          <View style={styles.idleText}>
            <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>🍅 뽀모도로</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: paused ? colors.sub : colors.fg, fontFamily: fonts.chrome }]}>
              {statusLine}
            </Text>
          </View>
          <RetroButton label={buttonLabel} size="sm" variant={derived.phase === 'DONE' ? 'primary' : 'focus'} onPress={goTimer} />
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
});
