import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoutineListCard } from '../../src/components/routine/RoutineListCard';
import { useRoutines } from '../../src/query/routineHooks';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

export default function RoutineScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const routines = useRoutines();

  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    routines.refetch().finally(() => setPulling(false));
  }, [routines]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>루틴</Text>
        <RoutineListCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 16 },
  heading: { fontSize: 22 },
});
