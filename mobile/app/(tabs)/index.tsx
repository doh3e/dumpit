import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../src/api/client';
import type { TaskResponse } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { HomeAppBar } from '../../src/components/home/HomeAppBar';
import { NowHeroCard } from '../../src/components/home/NowHeroCard';
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

  // 오늘 진행률 (웹 DashboardPage 파생 로직 이식)
  const { todayDone, todayTotal, allDone } = useMemo(() => {
    const todayTasks = (planning.data?.tasks ?? []).filter(
      (t) => isToday(t.deadline) && t.status !== 'CANCELLED',
    );
    const done = todayTasks.filter((t) => t.status === 'DONE').length;
    return { todayDone: done, todayTotal: todayTasks.length, allDone: todayTasks.length > 0 && done === todayTasks.length };
  }, [planning.data]);

  const completeTask = useCallback(
    (task: TaskResponse) => {
      toggle.mutate(
        { taskId: task.taskId, status: 'DONE' },
        { onError: (e) => toast.show(getApiErrorMessage(e, '완료 처리에 실패했어요.')) },
      );
    },
    [toggle, toast],
  );

  const editTask = useCallback((_task: TaskResponse) => {
    /* Task 15: TaskDetailSheet.present(task) 연결 */
  }, []);

  // 탭 재진입 시 리페치 (staleTime 30s 안이면 캐시 즉시 표시 후 조용히 갱신)
  const { refetch: refetchPlanning } = planning;
  useFocusEffect(
    useCallback(() => {
      refetchPlanning();
    }, [refetchPlanning]),
  );

  const onRefresh = useCallback(() => {
    planning.refetch();
    aiUsage.refetch();
  }, [planning, aiUsage]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <HomeAppBar me={me} aiUsage={aiUsage.data} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={planning.isRefetching}
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
            {/* Task 11: TaskListCard */}
            {/* Task 13: MiniCalendar */}
          </>
        )}
      </ScrollView>
    </View>
  );
}
