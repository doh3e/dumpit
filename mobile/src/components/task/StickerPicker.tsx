import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchOwnedStickers } from '../../api/shop';
import { keys } from '../../query/keys';
import { STICKER_SPRITES } from '../../tasks/stickers';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';

type Props = {
  current: string | null;
  onSelect: (code: string | null) => void;
  disabled?: boolean;
};

/** 보유 스티커 그리드 — GET /shop/catalog에서 owned STICKER만 (웹 StickerPicker 이식) */
export function StickerPicker({ current, onSelect, disabled }: Props) {
  const { colors } = useTheme();
  const owned = useQuery({ queryKey: keys.catalog, queryFn: fetchOwnedStickers, staleTime: 5 * 60_000 });
  const codes = (owned.data ?? []).filter((c) => STICKER_SPRITES[c]);

  if (owned.isLoading) return null;
  if (codes.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.sub, fontFamily: fonts.body }]}>
        코인샵(웹)에서 스티커를 구해보세요
      </Text>
    );
  }

  return (
    <View style={styles.grid}>
      {codes.map((code) => {
        const sprite = STICKER_SPRITES[code];
        const selected = current === code;
        return (
          <Pressable
            key={code}
            onPress={() => onSelect(code)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`스티커 ${sprite.name}`}
            accessibilityState={{ selected, disabled: !!disabled }}
            style={({ pressed }) => [
              styles.cell,
              { borderColor: selected ? colors.accent2 : colors.line, backgroundColor: selected ? colors.chip : colors.card },
              { opacity: pressed || disabled ? 0.6 : 1 },
            ]}
          >
            <Image source={sprite.img} style={styles.img} resizeMode="contain" />
            <Text style={[styles.name, { color: colors.sub, fontFamily: fonts.chrome }]}>{sprite.name}</Text>
          </Pressable>
        );
      })}
      {current && <Chip label="떼기 ✕" onPress={() => onSelect(null)} disabled={disabled} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  cell: {
    borderWidth: 1.5, borderRadius: 8, padding: 8, alignItems: 'center', gap: 3,
    minWidth: 58, minHeight: 52,
  },
  img: { width: 20, height: 20 },
  name: { fontSize: 9 },
  empty: { fontSize: 12 },
});
