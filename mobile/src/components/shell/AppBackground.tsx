import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

/**
 * 전역 배경 — 배경색 + BACKGROUND 스킨의 타일 무늬.
 * 웹은 body에 background-image를 깔지만 RN에는 CSS 배경이 없어 화면 전체에 한 장을 깐다.
 * 각 화면은 배경을 칠하지 않고 투명해야 이 레이어가 보인다 (app/_layout.tsx contentStyle 참고).
 */
export function AppBackground() {
  const { colors, bgPattern } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      {bgPattern && (
        <Image source={bgPattern} style={StyleSheet.absoluteFill} resizeMode="repeat" />
      )}
    </View>
  );
}
