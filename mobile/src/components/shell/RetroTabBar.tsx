import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

const TAB_META: Record<string, { emoji: string; label: string }> = {
  index: { emoji: '🏠', label: '홈' },
  routine: { emoji: '🔁', label: '루틴' },
  ideas: { emoji: '💡', label: '아이디어' },
  my: { emoji: '👤', label: 'MY' },
};

/** @react-navigation/bottom-tabs BottomTabBarProps 중 사용하는 최소 형태 (타입 미호이스팅 대응) */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: true }): { defaultPrevented: boolean };
    navigate(name: string): void;
  };
};

type Props = TabBarProps & {
  onFabPress: () => void;
  fabOpen: boolean;
};

/** 4탭 + 중앙 FAB. 탭 순서: 홈 · 루틴 · ＋ · 아이디어 · MY (2:2 대칭) */
export function RetroTabBar({ state, navigation, onFabPress, fabOpen }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(fabOpen ? '45deg' : '0deg', { duration: 160 }) }],
  }));

  const renderTab = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return null;
    const meta = TAB_META[routeName];
    const focused = state.routes[state.index]?.name === routeName;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={routeName}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={meta.label}
        accessibilityState={{ selected: focused }}
        style={({ pressed }) => [styles.tab, { transform: [{ translateY: pressed ? 1 : 0 }] }]}
      >
        <Text style={[styles.emoji, { opacity: focused ? 1 : 0.55 }]}>{meta.emoji}</Text>
        <Text style={[styles.label, { fontFamily: fonts.chrome, color: focused ? colors.accent : colors.sub }]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.card, borderTopColor: colors.edge, paddingBottom: insets.bottom },
      ]}
    >
      {renderTab('index')}
      {renderTab('routine')}
      <View style={styles.fabSlot}>
        <Pressable
          onPress={onFabPress}
          accessibilityRole="button"
          accessibilityLabel={fabOpen ? '닫기' : '추가'}
          accessibilityState={{ expanded: fabOpen }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.accent, borderColor: colors.edge },
            pressed
              ? { transform: [{ translateY: -14 }], boxShadow: `0px 0px 0px ${colors.shadowSm}` }
              : [{ transform: [{ translateY: -18 }] }, retroShadow(3, colors.shadowSm)],
          ]}
        >
          <Animated.Text style={[styles.fabIcon, { color: colors.onAccent, fontFamily: fonts.displayBold }, fabIconStyle]}>
            ＋
          </Animated.Text>
        </Pressable>
      </View>
      {renderTab('ideas')}
      {renderTab('my')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 2, paddingTop: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, minHeight: 48 },
  emoji: { fontSize: 20 },
  label: { fontSize: 10 },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    width: 56, height: 56, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  fabIcon: { fontSize: 26, lineHeight: 30 },
});
