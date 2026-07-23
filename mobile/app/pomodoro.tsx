import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../src/api/client';
import { PomodoroSettingsSheet } from '../src/components/pomodoro/PomodoroSettingsSheet';
import { TaskPickerSheet, type PickedTask } from '../src/components/pomodoro/TaskPickerSheet';
import { TimerRing } from '../src/components/pomodoro/TimerRing';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { DEFAULT_SETTINGS, deriveState, type PomodoroSettings } from '../src/pomodoro/engine';
import {
  checkExactAlarm, openAlarmSettings, requestNotificationPermission,
} from '../src/pomodoro/notifications';
import { loadSettings, saveSettings } from '../src/pomodoro/persistence';
import {
  getSession, pauseSession, reconcile, resetSession, resumeSession, startSession, subscribe,
} from '../src/pomodoro/store';
import { keys } from '../src/query/keys';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

export default function PomodoroScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [, force] = useReducer((x: number) => x + 1, 0);

  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [picked, setPicked] = useState<PickedTask | null>(null);
  const [starting, setStarting] = useState(false);
  const settingsSheet = useRef<BottomSheetModal>(null);
  const pickerSheet = useRef<BottomSheetModal>(null);

  useEffect(() => subscribe(force), []);
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const session = getSession();
  const derived = session ? deriveState(session, Date.now()) : null;
  const running = !!session && session.pausedAt == null && derived?.phase !== 'DONE';

  // 화면에 보이는 동안만 1초 틱 — 시간 자체는 앵커 재계산이라 틱은 표시용
  useEffect(() => {
    if (!running) return;
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, [running]);

  // 정산 결과 표시는 홈의 보류 소비가 담당(전역 토스트) — 여기선 정산·알림 재계획만 트리거
  useFocusEffect(
    useCallback(() => {
      reconcile();
    }, []),
  );

  const doStart = useCallback(async () => {
    setStarting(true);
    try {
      await startSession(settings, picked);
      qc.invalidateQueries({ queryKey: keys.planning });
    } catch (e) {
      toast.show(getApiErrorMessage(e, '타이머를 시작하지 못했어요.'));
    } finally {
      setStarting(false);
    }
  }, [settings, picked, qc, toast]);

  const onStart = useCallback(async () => {
    const notifOk = await requestNotificationPermission();
    if (!notifOk) toast.show('알림 권한이 없어 타이머 알림이 오지 않아요.');
    const exact = await checkExactAlarm();
    if (!exact) {
      Alert.alert(
        '정확한 알람 권한',
        '허용하지 않으면 집중·휴식 전환 알림이 몇 분 늦을 수 있어요.\n설정의 "알람 및 리마인더"에서 허용할 수 있어요.',
        [
          { text: '설정 열기', onPress: () => openAlarmSettings() },
          { text: '그냥 시작', onPress: () => doStart() },
        ],
      );
      return;
    }
    await doStart();
  }, [doStart, toast]);

  const doReset = useCallback(async () => {
    const ok = await resetSession();
    if (!ok) toast.show('오프라인이라 완료 세트를 정산하지 못했어요. 연결 후 다시 리셋해주세요.');
  }, [toast]);

  const onReset = useCallback(() => {
    Alert.alert('타이머 리셋', '지금까지 완료한 세트는 정산돼요.', [
      { text: '취소', style: 'cancel' },
      { text: '리셋', style: 'destructive', onPress: () => { doReset(); } },
    ]);
  }, [doReset]);

  const applySettings = useCallback((s: PomodoroSettings) => {
    setSettings(s);
    saveSettings(s);
    settingsSheet.current?.dismiss();
  }, []);

  const pickTask = useCallback((t: PickedTask | null) => {
    setPicked(t);
    pickerSheet.current?.dismiss();
  }, []);

  const totalSec = derived
    ? (derived.phase === 'FOCUS' ? session!.settings.focusMin
      : derived.long ? session!.settings.longBreakMin : session!.settings.breakMin) * 60
    : settings.focusMin * 60;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="뒤로">
          <Text style={[styles.back, { color: colors.fg, fontFamily: fonts.chrome }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>🍅 뽀모도로</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {session && derived ? (
          <>
            <TimerRing remainingSec={derived.remainingSec} totalSec={totalSec} phase={derived.phase} long={derived.long} />
            {session.taskTitle && (
              <Text numberOfLines={1} style={[styles.taskLine, { color: colors.sub, fontFamily: fonts.body }]}>
                🎯 {session.taskTitle}
              </Text>
            )}
            <Text style={[styles.setLine, { color: colors.sub, fontFamily: fonts.chrome }]}>
              {session.settings.setsTarget === 0
                ? `완료한 세트 ${derived.completedFocusCount}`
                : `세트 ${Math.min(derived.completedFocusCount + (derived.phase === 'FOCUS' ? 1 : 0), Math.max(session.settings.setsTarget, 1))}/${session.settings.setsTarget || '∞'}`}
            </Text>

            {derived.phase === 'DONE' ? (
              <RetroCard style={styles.doneCard}>
                <Text style={[styles.doneText, { color: colors.fg, fontFamily: fonts.display }]}>
                  🎉 모든 세트 완료! 정산이 안 됐다면 네트워크 연결 후 다시 열어주세요.
                </Text>
                <RetroButton label="타이머 정리" onPress={() => { doReset(); }} />
              </RetroCard>
            ) : (
              <View style={styles.controls}>
                {session.pausedAt != null ? (
                  <RetroButton label="▶ 재개" onPress={() => resumeSession()} style={styles.controlBtn} />
                ) : (
                  <RetroButton label="⏸ 일시정지" variant="ghost" onPress={() => pauseSession()} style={styles.controlBtn} />
                )}
                <RetroButton label="리셋" variant="danger" size="sm" onPress={onReset} />
              </View>
            )}
          </>
        ) : (
          <>
            <TimerRing remainingSec={settings.focusMin * 60} totalSec={settings.focusMin * 60} phase="FOCUS" />
            <Pressable
              onPress={() => pickerSheet.current?.present()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.taskPickBtn, { borderColor: colors.line, backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text numberOfLines={1} style={[styles.taskPickText, { color: picked ? colors.fg : colors.sub, fontFamily: fonts.body }]}>
                {picked ? `🎯 ${picked.title}` : '🎯 집중할 태스크 고르기 (선택)'}
              </Text>
            </Pressable>
            <Text style={[styles.summary, { color: colors.sub, fontFamily: fonts.chrome }]}>
              집중 {settings.focusMin}분 · 휴식 {settings.breakMin}분 · {settings.setsTarget === 0 ? '∞' : settings.setsTarget}세트
            </Text>
            <RetroButton label="집중 시작" onPress={onStart} busy={starting} style={styles.startBtn} />
            <RetroButton label="타이머 설정" variant="ghost" size="sm" onPress={() => settingsSheet.current?.present()} />
          </>
        )}
      </ScrollView>

      <PomodoroSettingsSheet ref={settingsSheet} initial={settings} onApply={applySettings} />
      <TaskPickerSheet ref={pickerSheet} onPick={pickTask} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  back: { fontSize: 22 },
  title: { fontSize: 18, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 22 },
  body: { padding: 24, gap: 16, alignItems: 'stretch' },
  taskLine: { fontSize: 14, textAlign: 'center' },
  setLine: { fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 },
  controlBtn: { minWidth: 160 },
  doneCard: { gap: 12, marginTop: 8 },
  doneText: { fontSize: 14, lineHeight: 22 },
  taskPickBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 46 },
  taskPickText: { fontSize: 14 },
  summary: { fontSize: 12, textAlign: 'center' },
  startBtn: { marginTop: 4 },
});
