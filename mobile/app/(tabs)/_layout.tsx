import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Tabs, router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { NoticePopup } from '../../src/components/notice/NoticePopup';
import { AddTaskSheet } from '../../src/components/task/AddTaskSheet';
import { RetroTabBar } from '../../src/components/shell/RetroTabBar';
import { SpeedDial } from '../../src/components/shell/SpeedDial';
import { AppState } from 'react-native';
import { initPomodoro, reconcile } from '../../src/pomodoro/store';

const HELP_SEEN_KEY = 'dumpit_help_seen';

export default function TabsLayout() {
  const { me } = useAuth();
  const [dialOpen, setDialOpen] = useState(false);
  const addSheetRef = useRef<BottomSheetModal>(null);

  // 앱 시작 1회 — 저장된 뽀모도로 세션 복원 + 밀린 정산 (결과 표시는 홈의 보류 소비가 담당)
  useEffect(() => {
    initPomodoro();
  }, []);

  // 백그라운드 → 포그라운드 복귀는 내비게이션 focus가 아니라서 별도 정산 필요
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => sub.remove();
  }, []);

  // 최초 실행 1회 도움말 자동 노출 (웹 HELP_SEEN 패리티)
  useEffect(() => {
    AsyncStorage.getItem(HELP_SEEN_KEY).then((seen) => {
      if (!seen) {
        AsyncStorage.setItem(HELP_SEEN_KEY, '1').catch(() => {});
        router.push('/help' as Href);
      }
    }).catch(() => {});
  }, []);

  // 렌더 중 Redirect를 반환하면 replace가 맨 위 화면만 갈아끼워 이 레이아웃이 살아남고,
  // 다시 렌더 → 또 replace로 무한 루프가 된다. 실제 이동은 루트의 AuthRouteGate가 맡는다.
  if (!me) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // 탭 씬은 내비게이션 기본 테마색으로 칠해진다 — 비워야 전역 배경(AppBackground)이 보인다.
          // Stack의 contentStyle과 짝이며, 한쪽만 빠지면 그 화면만 배경 스킨이 안 먹는다.
          sceneStyle: { backgroundColor: 'transparent' },
        }}
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
            icon: 'pencil',
            label: '태스크 추가',
            onPress: () => { setDialOpen(false); addSheetRef.current?.present(); },
          },
          {
            icon: 'bubble',
            label: '브레인 덤프',
            onPress: () => { setDialOpen(false); router.push('/brain-dump' as Href); },
          },
        ]}
      />
      <AddTaskSheet ref={addSheetRef} />
      <NoticePopup />
    </View>
  );
}
