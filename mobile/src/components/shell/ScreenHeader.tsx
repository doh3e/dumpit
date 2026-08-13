import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { TiledImage } from '../common/TiledImage';

/**
 * 스택 화면 공용 상단 헤더 — 뒤로가기 + 가운데 제목 + 선택 우측 슬롯.
 * CHROME 스킨이 칠해지는 면 중 하나다(탭바·홈 앱바와 한 묶음) — 탭바만으로는 상점에서
 * 크롬을 미리 볼 데가 없어 헤더도 크롬으로 둔다.
 */
export function ScreenHeader({
  title,
  icon,
  right,
  onBack,
}: {
  title: string;
  /** 제목 앞 도트 아이콘 — 제목 문자열에 이모지를 박는 대신 사용 */
  icon?: ReactNode;
  right?: ReactNode;
  /** 기본은 router.back() */
  onBack?: () => void;
}) {
  const { colors, chromeDeco } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 12,
          backgroundColor: colors.chromeBg,
          borderBottomColor: colors.chromeLine,
        },
      ]}
    >
      {chromeDeco && <TiledImage source={chromeDeco} />}
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} accessibilityLabel="뒤로">
        <Text style={[styles.back, { color: colors.fg, fontFamily: fonts.chrome }]}>←</Text>
      </Pressable>
      <View style={styles.titleRow}>
        {icon}
        <Text numberOfLines={1} style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          {title}
        </Text>
      </View>
      {/* 좌우 대칭을 위해 우측 슬롯은 비어 있어도 자리를 잡는다 */}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
    borderBottomWidth: 1.5, gap: 8,
  },
  back: { fontSize: 22 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontSize: 18, textAlign: 'center', flexShrink: 1 },
  right: { minWidth: 22, alignItems: 'flex-end' },
});
