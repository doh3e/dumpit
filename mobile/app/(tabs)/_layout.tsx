import { Redirect, Tabs } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { RetroTabBar } from '../../src/components/shell/RetroTabBar';
import { SpeedDial } from '../../src/components/shell/SpeedDial';

export default function TabsLayout() {
  const { me } = useAuth();
  const [dialOpen, setDialOpen] = useState(false);

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
            onPress: () => { setDialOpen(false); /* Task 14: AddTaskSheet.present() 연결 */ },
          },
          {
            emoji: '💭',
            label: '브레인 덤프',
            onPress: () => { setDialOpen(false); /* Task 17: router.push('/brain-dump') 연결 */ },
          },
        ]}
      />
    </View>
  );
}
