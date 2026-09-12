import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { PixelIcon, type PixelIconName } from '../common/PixelIcon';
import { TiledImage } from '../common/TiledImage';

const TAB_META: Record<string, { icon: PixelIconName; label: string }> = {
  index: { icon: 'home', label: '홈' },
  routine: { icon: 'loop', label: '루틴' },
  ideas: { icon: 'bulb', label: '아이디어' },
  my: { icon: 'user', label: 'MY' },
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
  const { colors, fonts, chromeDeco } = useTheme();
  const insets = useSafeAreaInsets();

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
        style={({ pressed }) => [styles.tab, { backgroundColor: pressed ? colors.chip : 'transparent' }]}
      >
        <PixelIcon name={meta.icon} size={20} style={{ opacity: focused ? 1 : 0.55 }} />
        <Text style={[styles.label, { fontFamily: fonts.chrome, color: focused ? colors.accentText : colors.sub }]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.chromeBg, borderTopColor: colors.chromeLine, paddingBottom: insets.bottom },
      ]}
    >
      {/* CHROME 스킨 장식 타일 — 웹 .app-sidebar background-image 대응 */}
      {chromeDeco && <TiledImage source={chromeDeco} />}
      {renderTab('index')}
      {renderTab('routine')}
      <Pressable
        onPress={onFabPress}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? '닫기' : '추가'}
        accessibilityState={{ expanded: fabOpen }}
        style={({ pressed }) => [
          styles.tab,
          styles.addTab,
          { backgroundColor: pressed ? colors.card : colors.chip, borderColor: colors.accent2Text },
        ]}
      >
        <PixelIcon name="sparkle" size={20} style={{ opacity: 1 }} />
        <Text style={[styles.label, { color: colors.accent2Text, fontFamily: fonts.chrome }]}>추가</Text>
      </Pressable>
      {renderTab('ideas')}
      {renderTab('my')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, minHeight: 48 },
  label: { fontSize: 10 },
  addTab: { borderWidth: 1, borderRadius: 8 },
});
