import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../src/api/client';
import type { TaskResponse, TaskStatus } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { HomeAppBar } from '../../src/components/home/HomeAppBar';
import { MiniCalendar } from '../../src/components/home/MiniCalendar';
import { NowHeroCard } from '../../src/components/home/NowHeroCard';
import { TaskListCard } from '../../src/components/home/TaskListCard';
import type { TogglePos } from '../../src/components/home/TaskRow';
import { TaskDetailSheet, type TaskDetailSheetHandle } from '../../src/components/task/TaskDetailSheet';
import { CoinToast } from '../../src/components/fx/CoinToast';
import { PixelBurst } from '../../src/components/fx/PixelBurst';
import { RocketLaunch } from '../../src/components/fx/RocketLaunch';
import { calcCompletionCoins } from '../../src/tasks/rewards';
import { RetroButton } from '../../src/components/retro/RetroButton';
import { RetroCard } from '../../src/components/retro/RetroCard';
import { useToast } from '../../src/components/retro/ToastProvider';
import { useAiUsage, usePlanning, useToggleTask } from '../../src/query/hooks';
import { isToday } from '../../src/tasks/dates';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { me } = useAuth();
  const toast = useToast();
  const planning = usePlanning();
  const aiUsage = useAiUsage();
  const toggle = useToggleTask();

  // 완료 연출 상태
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [coinToast, setCoinToast] = useState<{ id: number; coins: number; taskTitle: string } | null>(null);
  const [showRocket, setShowRocket] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // 오늘 진행률 (웹 DashboardPage 파생 로직 이식)
  const { todayDone, todayTotal, allDone } = useMemo(() => {
    const todayTasks = (planning.data?.tasks ?? []).filter(
      (t) => isToday(t.deadline) && t.status !== 'CANCELLED',
    );
    const done = todayTasks.filter((t) => t.status === 'DONE').length;
    return { todayDone: done, todayTotal: todayTasks.length, allDone: todayTasks.length > 0 && done === todayTasks.length };
  }, [planning.data]);

  const toggleTask = useCallback(
    (task: TaskResponse, next: TaskStatus, pos?: TogglePos) => {
      if (next === 'DONE' && pos && !reduceMotion) {
        setBursts((prev) =>
          prev.length >= 3 ? prev : [...prev, { id: Date.now() + Math.random(), x: pos.x, y: pos.y }],
        );
      }
      toggle.mutate(
        { taskId: task.taskId, status: next },
        {
          onError: (e) => toast.show(getApiErrorMessage(e, '상태 변경에 실패했어요.')),
          onSuccess: (data) => {
            if (next !== 'DONE') return;
            // 서버 실지급액 신뢰 — 점감으로 0이면 토스트 생략 (|| 폴백 금지)
            const coins = data.coinsGranted ?? calcCompletionCoins(task);
            if (coins > 0) setCoinToast({ id: Date.now(), coins, taskTitle: task.title });
          },
        },
      );
    },
    [toggle, toast, reduceMotion],
  );

  // 오늘 전부 완료 → 로켓 (false→true 전환에만, 초기 로드는 기록만)
  const prevAllDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (planning.isLoading || !planning.data) return;
    if (prevAllDone.current !== null && !prevAllDone.current && allDone && !reduceMotion) {
      setShowRocket(true);
    }
    prevAllDone.current = allDone;
  }, [allDone, planning.isLoading, planning.data, reduceMotion]);

  const completeTask = useCallback(
    (task: TaskResponse) => toggleTask(task, 'DONE'),
    [toggleTask],
  );

  const detailRef = useRef<TaskDetailSheetHandle>(null);
  const editTask = useCallback((task: TaskResponse) => {
    detailRef.current?.present(task);
  }, []);

  // 탭 재진입 시 리페치 (staleTime 30s 안이면 캐시 즉시 표시 후 조용히 갱신)
  const { refetch: refetchPlanning } = planning;
  useFocusEffect(
    useCallback(() => {
      refetchPlanning();
    }, [refetchPlanning]),
  );

  // 풀투리프레시 스피너는 수동 제스처 전용 — invalidate로 도는 백그라운드 리페치에 반응하지 않게
  const [pulling, setPulling] = useState(false);
  const { refetch: refetchAiUsage } = aiUsage;
  const onRefresh = useCallback(() => {
    setPulling(true);
    Promise.all([refetchPlanning(), refetchAiUsage()]).finally(() => setPulling(false));
  }, [refetchPlanning, refetchAiUsage]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <HomeAppBar me={me} aiUsage={aiUsage.data} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16, paddingBottom: 28 }}
      >
        {planning.isLoading && (
          <View style={{ paddingVertical: 48 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
        {planning.isError && (
          <RetroCard style={{ alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.fg, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' }}>
              {getApiErrorMessage(planning.error, '할 일을 불러오지 못했어요.')}
            </Text>
            <RetroButton label="다시 시도" size="sm" onPress={() => planning.refetch()} />
          </RetroCard>
        )}
        {planning.data && (
          <>
            <NowHeroCard
              nowSuggestion={planning.data.nowSuggestion}
              queue={planning.data.focusRecommendations}
              todayDone={todayDone}
              todayTotal={todayTotal}
              allDone={allDone}
              onComplete={completeTask}
              onEdit={editTask}
            />
            <TaskListCard
              sections={planning.data.sections}
              onToggle={toggleTask}
              onPressTask={editTask}
              onPressBoard={() => router.push('/task-board' as Href)}
            />
            <MiniCalendar tasks={planning.data.tasks} onTaskAdded={() => planning.refetch()} />
          </>
        )}
      </ScrollView>

      {bursts.map((b) => (
        <PixelBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}
      {coinToast && (
        <CoinToast
          key={coinToast.id}
          coins={coinToast.coins}
          taskTitle={coinToast.taskTitle}
          onDone={() => setCoinToast(null)}
        />
      )}
      {showRocket && <RocketLaunch onDone={() => setShowRocket(false)} />}

      <TaskDetailSheet ref={detailRef} />
    </View>
  );
}
