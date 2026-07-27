import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { TiledImage } from '../common/TiledImage';

/**
 * 스택 화면 공용 상단 헤더 — 뒤로가기 + 가운데 제목 + 선택 우측 슬롯.
 *
 * CHROME 스킨이 칠해지는 면 중 하나다(탭바·홈 앱바와 한 묶음). 앱에서 항상 보이는 크롬이
 * 탭바뿐이면 상점에서 크롬을 미리 볼 데가 없어, 스택 화면 헤더까지 크롬으로 둔다
 * (2026-07-27 사용자 결정).
 */
export function ScreenHeader({
  title,
  right,
  onBack,
}: {
  title: string;
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
      <Text numberOfLines={1} style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
        {title}
      </Text>
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
  title: { fontSize: 18, flex: 1, textAlign: 'center' },
  right: { minWidth: 22, alignItems: 'flex-end' },
});
