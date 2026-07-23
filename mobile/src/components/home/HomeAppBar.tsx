import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MeResponse } from '../../api/auth';
import type { AiUsage } from '../../api/types';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { AiBadge } from './AiBadge';
import { CoinBadge } from './CoinBadge';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 홈 상단 앱바 — 날짜·인사 + 코인/AI 배지 (웹 Header 대응) */
export function HomeAppBar({ me, aiUsage }: { me: MeResponse | null; aiUsage: AiUsage | undefined }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAY_NAMES[now.getDay()]}`;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10, backgroundColor: colors.bg }]}>
      <View style={styles.left}>
        <Text style={[styles.date, { color: colors.sub, fontFamily: fonts.chrome }]}>{dateLabel}</Text>
        <Text style={[styles.greeting, { color: colors.fg, fontFamily: fonts.displayBold }]} numberOfLines={1}>
          {me?.name ? `${me.name}의 덤프` : 'DUMPIT!'}
          <Text style={{ color: colors.starlight }}> ★</Text>
        </Text>
      </View>
      <View style={styles.right}>
        <CoinBadge coins={me?.coins ?? 0} />
        <AiBadge usage={aiUsage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  left: { gap: 2, flexShrink: 1 },
  date: { fontSize: 11 },
  greeting: { fontSize: 20 },
  right: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
