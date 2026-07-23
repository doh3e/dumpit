import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { HomeAppBar } from '../../src/components/home/HomeAppBar';
import { RetroButton } from '../../src/components/retro/RetroButton';
import { RetroCard } from '../../src/components/retro/RetroCard';
import { useAiUsage, usePlanning } from '../../src/query/hooks';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { me } = useAuth();
  const planning = usePlanning();
  const aiUsage = useAiUsage();

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
            {/* Task 10: NowHeroCard */}
            {/* Task 11: TaskListCard */}
            {/* Task 13: MiniCalendar */}
            <RetroCard>
              <Text style={{ color: colors.sub, fontFamily: fonts.body, fontSize: 13 }}>
                할 일 {planning.data.tasks.length}개 로드됨 — 카드가 곧 채워져요
              </Text>
            </RetroCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}
