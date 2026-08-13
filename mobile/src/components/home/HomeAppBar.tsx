import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MeResponse } from '../../api/auth';
import type { AiUsage } from '../../api/types';
import { PLANET_SPRITES, spriteFor } from '../../shop/spriteRegistry';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { TiledImage } from '../common/TiledImage';
import { PixelSprite } from '../shop/PixelSprite';
import { AiBadge } from './AiBadge';
import { CoinBadge } from './CoinBadge';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 홈 상단 앱바 — 날짜·인사 + 코인/AI 배지 (웹 Header 대응) */
export function HomeAppBar({ me, aiUsage }: { me: MeResponse | null; aiUsage: AiUsage | undefined }) {
  const { colors, chromeDeco } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAY_NAMES[now.getDay()]}`;

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + 10, backgroundColor: colors.chromeBg, borderBottomColor: colors.chromeLine },
      ]}
    >
      {/* CHROME 스킨 장식 타일 — 웹 .app-header background-image 대응 */}
      {chromeDeco && <TiledImage source={chromeDeco} />}
      <View style={styles.left}>
        {/* 장착 행성 — 웹 대시보드 행성 패리티, 상점에서 바꾸면 refresh()로 반영 */}
        <PixelSprite sprite={spriteFor(PLANET_SPRITES, me?.equipments?.PLANET)} size={34} />
        <View style={styles.leftText}>
          <Text style={[styles.date, { color: colors.sub, fontFamily: fonts.chrome }]}>{dateLabel}</Text>
          <Text style={[styles.greeting, { color: colors.fg, fontFamily: fonts.displayBold }]} numberOfLines={1}>
            {me?.name ? `${me.name}의 덤프` : 'DUMPIT!'}
            <Text style={{ color: colors.starlight }}> ★</Text>
          </Text>
        </View>
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
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1.5,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  leftText: { gap: 2, flexShrink: 1 },
  date: { fontSize: 11 },
  greeting: { fontSize: 20 },
  right: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
