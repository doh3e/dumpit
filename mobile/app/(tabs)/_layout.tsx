import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Redirect, Tabs, router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { AddTaskSheet } from '../../src/components/task/AddTaskSheet';
import { RetroTabBar } from '../../src/components/shell/RetroTabBar';
import { SpeedDial } from '../../src/components/shell/SpeedDial';
import { AppState } from 'react-native';
import { initPomodoro, reconcile } from '../../src/pomodoro/store';

export default function TabsLayout() {
  const { me } = useAuth();
  const [dialOpen, setDialOpen] = useState(false);
  const addSheetRef = useRef<BottomSheetModal>(null);

  // 앱 시작 1회 — 저장된 뽀모도로 세션 복원 + 밀린 정산 (결과 표시는 홈의 보류 소비가 담당)
  useEffect(() => {
    initPomodoro();
  }, []);

  // 백그라운드 → 포그라운드 복귀는 내비게이션 focus가 아니라서 별도 정산 필요 (리뷰 M2)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => sub.remove();
  }, []);

  if (!me) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <RetroTabBar
            {...props}
            fabOpen={dialOpen}
            onFabPress={() => setDialOpen((v) => !v)}
          />
        )}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="routine" />
        <Tabs.Screen name="ideas" />
        <Tabs.Screen name="my" />
      </Tabs>
      <SpeedDial
        open={dialOpen}
        onClose={() => setDialOpen(false)}
        actions={[
          {
            emoji: '📝',
            label: '태스크 추가',
            onPress: () => { setDialOpen(false); addSheetRef.current?.present(); },
          },
          {
            emoji: '💭',
            label: '브레인 덤프',
            onPress: () => { setDialOpen(false); router.push('/brain-dump' as Href); },
          },
        ]}
      />
      <AddTaskSheet ref={addSheetRef} />
    </View>
  );
}
