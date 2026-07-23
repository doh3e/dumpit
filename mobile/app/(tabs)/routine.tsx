import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActiveHoursCard } from '../../src/components/routine/ActiveHoursCard';
import { RoutineListCard } from '../../src/components/routine/RoutineListCard';
import { useRoutines, useUserSettings } from '../../src/query/routineHooks';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

export default function RoutineScreen() {
  const { colors } = useTheme();
  const routines = useRoutines();
  const settings = useUserSettings();

  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    Promise.all([routines.refetch(), settings.refetch()]).finally(() => setPulling(false));
  }, [routines, settings]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.body}
      >
        <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>루틴</Text>
        <ActiveHoursCard />
        <RoutineListCard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, paddingTop: 60, gap: 16, paddingBottom: 28 },
  heading: { fontSize: 22 },
});
