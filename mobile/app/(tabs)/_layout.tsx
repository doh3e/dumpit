import { Redirect, Tabs } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { RetroTabBar } from '../../src/components/shell/RetroTabBar';

export default function TabsLayout() {
  const { me } = useAuth();
  const [dialOpen, setDialOpen] = useState(false);

  if (!me) return <Redirect href="/" />;

  return (
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
  );
}
