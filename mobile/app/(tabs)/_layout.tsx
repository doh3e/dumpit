import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Redirect, Tabs, router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { AddTaskSheet } from '../../src/components/task/AddTaskSheet';
import { RetroTabBar } from '../../src/components/shell/RetroTabBar';
import { SpeedDial } from '../../src/components/shell/SpeedDial';
import { initPomodoro } from '../../src/pomodoro/store';

export default function TabsLayout() {
  const { me } = useAuth();
  const [dialOpen, setDialOpen] = useState(false);
  const addSheetRef = useRef<BottomSheetModal>(null);

  // 앱 시작 1회 — 저장된 뽀모도로 세션 복원 + 밀린 정산 (코인 토스트는 홈 reconcile이 담당)
  useEffect(() => {
    initPomodoro();
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
