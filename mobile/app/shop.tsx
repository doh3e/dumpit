import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../src/api/client';
import { equipItem, fetchCatalog, purchaseItem, unequipSlot } from '../src/api/shop';
import type { CatalogItem } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { Chip } from '../src/components/retro/Chip';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { PixelSprite } from '../src/components/shop/PixelSprite';
import { keys } from '../src/query/keys';
import { PLANET_SPRITES, STATION_SPRITES } from '../src/shop/spriteRegistry';
import { STICKER_SPRITES } from '../src/tasks/stickers';
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

function ItemPreview({ item }: { item: CatalogItem }) {
  if (item.slot === 'PLANET' && PLANET_SPRITES[item.code]) {
    return <PixelSprite sprite={PLANET_SPRITES[item.code]} size={44} />;
  }
  if (item.slot === 'STATION' && STATION_SPRITES[item.code]) {
    return <PixelSprite sprite={STATION_SPRITES[item.code]} size={44} />;
  }
  if (item.type === 'STICKER' && STICKER_SPRITES[item.code]) {
    return <Image source={STICKER_SPRITES[item.code].img} style={{ width: 40, height: 40 }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: 26 }}>🎨</Text>;
}

export default function ShopScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { refresh } = useAuth();
  const catalog = useQuery({ queryKey: keys.catalog, queryFn: fetchCatalog });

  const [tab, setTab] = useState<TabKey>('BACKGROUND');
  const [busyCode, setBusyCode] = useState<string | null>(null);

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
    Alert.alert('구매', `"${item.name}"을(를) ${item.price}🪙에 구매할까요?`, [
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

  const themeNotApplied = tab === 'BACKGROUND' || tab === 'CHROME' || tab === 'POMODORO' || tab === 'CELEBRATION';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="뒤로">
          <Text style={[styles.back, { color: colors.fg, fontFamily: fonts.chrome }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>🛒 상점</Text>
        <Text style={[styles.coin, { color: colors.fg, fontFamily: fonts.chrome }]}>🪙 {coin}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        {themeNotApplied && (
          <Text style={[styles.notice, { color: colors.sub, fontFamily: fonts.body }]}>
            이 슬롯은 웹에 즉시 적용돼요 · 앱 화면 적용은 곧 지원됩니다
          </Text>
        )}
        {items.map((item) => (
          <RetroCard key={item.code} style={styles.itemCard}>
            <View style={[styles.previewBox, { backgroundColor: colors.chip, borderColor: colors.line }]}>
              <ItemPreview item={item} />
            </View>
            <View style={styles.itemText}>
              <View style={styles.itemTitleRow}>
                <Text numberOfLines={1} style={[styles.itemName, { color: colors.fg, fontFamily: fonts.display }]}>
                  {item.name}
                </Text>
                {item.tier === 'CONCEPT' && <RetroBadge text="컨셉" tone="sub" />}
                {item.equipped && <RetroBadge text="장착중" tone="accent" />}
              </View>
              <Text numberOfLines={2} style={[styles.itemDesc, { color: colors.sub, fontFamily: fonts.body }]}>
                {item.description}
              </Text>
            </View>
            <View style={styles.itemAction}>
              {!item.owned ? (
                <RetroButton
                  label={`${item.price}🪙`}
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
        ))}
        {items.length === 0 && !catalog.isLoading && (
          <Text style={[styles.notice, { color: colors.sub, fontFamily: fonts.body }]}>이 슬롯엔 아이템이 없어요.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8, gap: 8 },
  back: { fontSize: 22 },
  title: { fontSize: 18, flex: 1, textAlign: 'center' },
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
});
