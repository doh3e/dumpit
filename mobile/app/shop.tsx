import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../src/api/client';
import { equipItem, fetchCatalog, purchaseItem, unequipSlot } from '../src/api/shop';
import type { CatalogItem } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { celebrationFor } from '../src/celebration/registry';
import { CoinIcon } from '../src/components/common/CoinIcon';
import { CelebrationOverlay } from '../src/components/fx/CelebrationOverlay';
import { Chip } from '../src/components/retro/Chip';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { PixelSprite } from '../src/components/shop/PixelSprite';
import { keys } from '../src/query/keys';
import { PLANET_SPRITES, STATION_SPRITES } from '../src/shop/spriteRegistry';
import { STICKER_SPRITES } from '../src/tasks/stickers';
import { useSkinPreview } from '../src/theme/ThemeProvider';
import { BG_SKINS, CHROME_SKINS, POMO_SKINS, skinKey } from '../src/theme/skins';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

// 웹 SHOP_TABS 순서 대응 — 탭 키는 slot(스티커만 type)
const TABS = [
  { key: 'BACKGROUND', label: '배경' },
  { key: 'CHROME', label: '크롬' },
  { key: 'POMODORO', label: '뽀모도로' },
  { key: 'PLANET', label: '행성' },
  { key: 'STATION', label: '정거장' },
  { key: 'CELEBRATION', label: '축하' },
  { key: 'STICKER', label: '스티커' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** 테마 슬롯은 스프라이트가 없으므로 스킨 팔레트에서 대표 색을 뽑아 보여준다 */
function swatchesFor(item: CatalogItem, scheme: 'light' | 'dark'): string[] | null {
  const key = skinKey(item.code);
  if (!key) return null;
  if (item.slot === 'BACKGROUND') {
    const p = BG_SKINS[key][scheme];
    return [p.bg!, p.accent!, p.accent2!];
  }
  if (item.slot === 'CHROME') {
    const c = CHROME_SKINS[key][scheme];
    return [c.chromeBg, c.chromeLine];
  }
  if (item.slot === 'POMODORO') {
    const p = POMO_SKINS[key][scheme];
    return [p.focus, p.rest];
  }
  return null;
}

function ItemPreview({ item, scheme }: { item: CatalogItem; scheme: 'light' | 'dark' }) {
  if (item.slot === 'PLANET' && PLANET_SPRITES[item.code]) {
    return <PixelSprite sprite={PLANET_SPRITES[item.code]} size={44} />;
  }
  if (item.slot === 'STATION' && STATION_SPRITES[item.code]) {
    return <PixelSprite sprite={STATION_SPRITES[item.code]} size={44} />;
  }
  if (item.type === 'STICKER' && STICKER_SPRITES[item.code]) {
    return <Image source={STICKER_SPRITES[item.code].img} style={{ width: 40, height: 40 }} resizeMode="contain" />;
  }
  if (item.slot === 'CELEBRATION') {
    return <Image source={celebrationFor(item.code).img} style={{ width: 40, height: 40 }} resizeMode="contain" />;
  }
  const swatches = swatchesFor(item, scheme);
  if (swatches) {
    return (
      <View style={styles.swatchWrap}>
        {swatches.map((c, i) => (
          <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
        ))}
      </View>
    );
  }
  return <Text style={{ fontSize: 26 }}>🎨</Text>;
}

/** 테마 미리보기를 지원하는 슬롯 — 화면 전체가 즉시 바뀐다 */
const PREVIEWABLE = new Set(['BACKGROUND', 'CHROME', 'POMODORO']);

export default function ShopScreen() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { me, refresh } = useAuth();
  const { preview, setPreview } = useSkinPreview();
  const catalog = useQuery({ queryKey: keys.catalog, queryFn: fetchCatalog });

  const [tab, setTab] = useState<TabKey>('BACKGROUND');
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  // 화면을 벗어나면 실제 장착으로 되돌린다 (웹 applySkinsTransient와 같은 취지)
  useEffect(() => () => setPreview(null), [setPreview]);

  const items = useMemo(() => {
    const all = catalog.data?.items ?? [];
    const filtered = tab === 'STICKER'
      ? all.filter((i) => i.type === 'STICKER')
      : all.filter((i) => i.slot === tab);
    // 웹 정렬: 보유(장착 우선) → 미보유(가격→이름)
    return [...filtered].sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
      if (a.price !== b.price) return a.price - b.price;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [catalog.data, tab]);

  const coin = catalog.data?.coinBalance ?? 0;
  const afterChange = () => {
    qc.invalidateQueries({ queryKey: keys.catalog });
    refresh();   // 코인·equipments 전 앱 반영
  };

  const confirmPurchase = (item: CatalogItem) => {
    Alert.alert('구매', `"${item.name}"을(를) ${item.price}코인에 구매할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '구매',
        onPress: async () => {
          setBusyCode(item.code);
          try {
            await purchaseItem(item.code);
            toast.show(`구매 완료! ${item.type === 'THEME' ? '바로 장착했어요.' : ''}`);
            afterChange();
          } catch (e) {
            toast.show(getApiErrorMessage(e, '구매에 실패했어요.'));
          } finally {
            setBusyCode(null);
          }
        },
      },
    ]);
  };

  const toggleEquip = async (item: CatalogItem) => {
    setBusyCode(item.code);
    try {
      if (item.equipped) await unequipSlot(item.slot!);
      else await equipItem(item.code);
      afterChange();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '장착을 바꾸지 못했어요.'));
    } finally {
      setBusyCode(null);
    }
  };

  /** 카드를 누르면 미리보기 — 테마는 화면 전체에 임시 적용, 축하는 연출 재생 */
  const onPreview = (item: CatalogItem) => {
    if (item.slot === 'CELEBRATION') {
      setPlaying(item.code);
      return;
    }
    if (!item.slot || !PREVIEWABLE.has(item.slot)) return;
    const base = me?.equipments ?? {};
    const already = preview?.[item.slot] === item.code;
    setPreview(already ? null : { ...base, ...preview, [item.slot]: item.code });
  };

  const previewing = !!preview;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="🛒 상점"
        right={
          <View style={styles.coinRow}>
            <CoinIcon size={13} />
            <Text style={[styles.coin, { color: colors.fg, fontFamily: fonts.chrome }]}>{coin}</Text>
          </View>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {(PREVIEWABLE.has(tab) || tab === 'CELEBRATION') && (
          <Text style={[styles.notice, { color: colors.sub, fontFamily: fonts.body }]}>
            {tab === 'CELEBRATION' ? '카드를 누르면 연출을 미리 볼 수 있어요' : '카드를 누르면 화면에 미리 입혀봐요'}
          </Text>
        )}
        {items.map((item) => {
          const isPreviewed = !!item.slot && preview?.[item.slot] === item.code;
          return (
          <RetroCard key={item.code} style={[styles.itemCard, isPreviewed && { borderColor: colors.accent2 }] as never}>
            <Pressable
              onPress={() => onPreview(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} 미리보기`}
              style={({ pressed }) => [
                styles.previewBox,
                { backgroundColor: colors.chip, borderColor: isPreviewed ? colors.accent2 : colors.line, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ItemPreview item={item} scheme={scheme} />
            </Pressable>
            <View style={styles.itemText}>
              <View style={styles.itemTitleRow}>
                <Text numberOfLines={1} style={[styles.itemName, { color: colors.fg, fontFamily: fonts.display }]}>
                  {item.name}
                </Text>
                {item.tier === 'CONCEPT' && <RetroBadge text="컨셉" tone="sub" />}
                {item.equipped && <RetroBadge text="장착중" tone="accent" />}
                {isPreviewed && <RetroBadge text="미리보기" tone="sub" />}
              </View>
              <Text numberOfLines={2} style={[styles.itemDesc, { color: colors.sub, fontFamily: fonts.body }]}>
                {item.description}
              </Text>
            </View>
            <View style={styles.itemAction}>
              {!item.owned ? (
                <RetroButton
                  label={String(item.price)}
                  icon={<CoinIcon size={12} />}
                  size="sm"
                  onPress={() => confirmPurchase(item)}
                  busy={busyCode === item.code}
                  disabled={coin < item.price}
                />
              ) : item.type === 'THEME' ? (
                <RetroButton
                  label={item.equipped ? '해제' : '장착'}
                  size="sm"
                  variant={item.equipped ? 'ghost' : 'focus'}
                  onPress={() => toggleEquip(item)}
                  busy={busyCode === item.code}
                />
              ) : (
                <Text style={[styles.ownedText, { color: colors.accent2, fontFamily: fonts.chrome }]}>보유중</Text>
              )}
            </View>
          </RetroCard>
          );
        })}
        {items.length === 0 && !catalog.isLoading && (
          <Text style={[styles.notice, { color: colors.sub, fontFamily: fonts.body }]}>이 슬롯엔 아이템이 없어요.</Text>
        )}
      </ScrollView>

      {previewing && (
        <View style={[styles.previewBar, { backgroundColor: colors.card, borderColor: colors.edge, paddingBottom: insets.bottom + 10 }]}>
          <Text style={[styles.previewBarText, { color: colors.fg, fontFamily: fonts.body }]}>
            👀 미리보기 중 — 아직 장착되지 않았어요
          </Text>
          <RetroButton label="원래대로" size="sm" variant="ghost" onPress={() => setPreview(null)} />
        </View>
      )}

      {playing && <CelebrationOverlay codeOverride={playing} onDone={() => setPlaying(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coin: { fontSize: 13 },
  tabBar: { flexGrow: 0 },
  tabRow: { paddingHorizontal: 16, gap: 6, paddingVertical: 6 },
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  notice: { fontSize: 11, textAlign: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  previewBox: { width: 56, height: 56, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 3 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemName: { fontSize: 14, flexShrink: 1 },
  itemDesc: { fontSize: 11, lineHeight: 15 },
  itemAction: { alignItems: 'flex-end' },
  ownedText: { fontSize: 11 },
  swatchWrap: { flexDirection: 'row', gap: 3 },
  swatch: { width: 11, height: 30, borderRadius: 2 },
  previewBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    borderTopWidth: 2, paddingHorizontal: 16, paddingTop: 10,
  },
  previewBarText: { fontSize: 12, flex: 1 },
});
