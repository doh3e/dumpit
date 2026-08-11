import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../../src/api/client';
import { fetchOverdueTasks, fetchProfile, fetchStats, patchProfile } from '../../src/api/profile';
import { patchTask } from '../../src/api/tasks';
import { useAuth } from '../../src/auth/AuthContext';
import { CoinIcon } from '../../src/components/common/CoinIcon';
import { PixelIcon, type PixelIconName } from '../../src/components/common/PixelIcon';
import { RetroButton } from '../../src/components/retro/RetroButton';
import { RetroCard } from '../../src/components/retro/RetroCard';
import { useToast } from '../../src/components/retro/ToastProvider';
import { PixelSprite } from '../../src/components/shop/PixelSprite';
import { categoryBars, formatFocusTotal, heatLevel, heatmapWeeks } from '../../src/my/stats';
import { keys } from '../../src/query/keys';
import { STATION_SPRITES, spriteFor } from '../../src/shop/spriteRegistry';
import { PRIVACY_URL, TERMS_URL } from '../../src/legal/links';
import { getCategory } from '../../src/tasks/constants';
import { formatDeadline, toLocalDateString } from '../../src/tasks/dates';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

// url을 가진 항목은 웹 문서를 브라우저로 연다 — 약관·방침은 웹에 하나만 두고
// 앱은 그것을 참조해야 개정이 스토어 재심사 없이 반영된다(src/legal/links.ts).
const MENU: { icon: PixelIconName; label: string; href?: Href; url?: string }[] = [
  { icon: 'cart', label: '상점', href: '/shop' as Href },
  { icon: 'gear', label: '설정', href: '/settings' as Href },
  { icon: 'megaphone', label: '공지사항', href: '/notices' as Href },
  { icon: 'question', label: '도움말', href: '/help' as Href },
  { icon: 'envelope', label: '문의하기', href: '/inquiry' as Href },
  { icon: 'document', label: '이용약관', url: TERMS_URL },
  { icon: 'lock', label: '개인정보처리방침', url: PRIVACY_URL },
];

// 히트맵 4단계 — starlight 계열 (웹 star-log-0~3 대응)
const HEAT_ALPHA = [0.12, 0.4, 0.7, 1] as const;

export default function MyScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { me, refresh } = useAuth();

  const insets = useSafeAreaInsets();
  const heatScroll = useRef<ScrollView>(null);

  const profile = useQuery({ queryKey: keys.profile, queryFn: fetchProfile });
  const stats = useQuery({ queryKey: keys.stats, queryFn: fetchStats });
  const overdue = useQuery({ queryKey: keys.overdue, queryFn: fetchOverdueTasks });

  useFocusEffect(
    useCallback(() => {
      stats.refetch();
      overdue.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    Promise.all([profile.refetch(), stats.refetch(), overdue.refetch()]).finally(() => setPulling(false));
  }, [profile, stats, overdue]);

  // bio 인라인 편집 (uncontrolled)
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const saveBio = async () => {
    setSavingBio(true);
    try {
      await patchProfile({ bio: bioDraft.trim() || null });
      qc.invalidateQueries({ queryKey: keys.profile });
      setEditingBio(false);
    } catch (e) {
      toast.show(getApiErrorMessage(e, '소개를 저장하지 못했어요.'));
    } finally {
      setSavingBio(false);
    }
  };

  const completeOverdue = async (taskId: string, title: string) => {
    try {
      const updated = await patchTask(taskId, { status: 'DONE' });
      qc.invalidateQueries({ queryKey: keys.overdue });
      qc.invalidateQueries({ queryKey: keys.stats });
      qc.invalidateQueries({ queryKey: keys.planning });
      refresh();
      const coins = updated.coinsGranted ?? 0;
      toast.show(coins > 0 ? `"${title}" 완료! +${coins} 코인` : `"${title}" 완료!`);
    } catch (e) {
      toast.show(getApiErrorMessage(e, '완료 처리에 실패했어요.'));
    }
  };

  const s = stats.data;
  const p = profile.data;
  const todayKey = toLocalDateString(new Date());
  const weeks = s ? heatmapWeeks(s.heatmap, todayKey) : [];
  const bars = s ? categoryBars(s.categoryBreakdown) : [];

  const tiles: { label: string; value: string; sub?: string; coin?: boolean }[] = s
    ? [
        { label: '완료한 태스크', value: String(s.totalDone) },
        { label: '뽀모도로 집중', value: `${s.pomodoroTotalSessions}회`, sub: `누적 ${formatFocusTotal(s.pomodoroTotalMinutes)}` },
        { label: '연속 완료', value: `${s.streak}일`, sub: '오늘 기준' },
        { label: '보유 코인', value: String(s.coinBalance), coin: true },
        { label: '브레인 덤프', value: String(s.brainDumpCount) },
        { label: '저장한 아이디어', value: String(s.ideaCount) },
      ]
    : [];

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stationRow}>
          <PixelSprite sprite={spriteFor(STATION_SPRITES, me?.equipments?.STATION)} size={96} />
        </View>

        <RetroCard style={styles.card}>
          <View style={styles.profileRow}>
            {p?.picture ? (
              <Image source={{ uri: p.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.chip, borderColor: colors.line }]}>
                <Text style={{ fontSize: 22 }}>🧑‍🚀</Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={[styles.nickname, { color: colors.fg, fontFamily: fonts.displayBold }]}>
                {p?.nickname ?? me?.name ?? ''}
              </Text>
              <Text numberOfLines={1} style={[styles.email, { color: colors.sub, fontFamily: fonts.chrome }]}>
                {p?.email ?? me?.email ?? ''}
              </Text>
            </View>
          </View>
          {editingBio ? (
            <>
              <TextInput
                defaultValue={p?.bio ?? ''}
                onChangeText={setBioDraft}
                maxLength={500}
                multiline
                placeholder="한 줄 소개"
                placeholderTextColor={colors.sub}
                style={[styles.bioInput, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
              />
              <View style={styles.bioActions}>
                <RetroButton label="취소" variant="ghost" size="sm" onPress={() => setEditingBio(false)} />
                <RetroButton label="저장" size="sm" onPress={saveBio} busy={savingBio} />
              </View>
            </>
          ) : (
            <Pressable onPress={() => { setBioDraft(p?.bio ?? ''); setEditingBio(true); }} accessibilityRole="button" accessibilityLabel="소개 편집">
              <Text style={[styles.bio, { color: p?.bio ? colors.fg : colors.sub, fontFamily: fonts.body }]}>
                {p?.bio ?? '한 줄 소개를 남겨보세요'}
              </Text>
            </Pressable>
          )}
        </RetroCard>

        {s && (
          <>
            <View style={styles.tileGrid}>
              {tiles.map((t) => (
                <RetroCard key={t.label} style={styles.tile}>
                  <Text style={[styles.tileLabel, { color: colors.sub, fontFamily: fonts.chrome }]}>{t.label}</Text>
                  <View style={styles.tileValueRow}>
                    {t.coin && <CoinIcon size={18} />}
                    <Text style={[styles.tileValue, { color: colors.fg, fontFamily: fonts.display }]}>{t.value}</Text>
                  </View>
                  {t.sub && <Text style={[styles.tileSub, { color: colors.sub, fontFamily: fonts.body }]}>{t.sub}</Text>}
                </RetroCard>
              ))}
            </View>

            <RetroCard style={styles.card}>
              <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>🌟 완료 히트맵</Text>
              {/* 최신(오늘)이 오른쪽 끝 — 처음부터 오늘이 보이도록 끝으로 붙여둔다 */}
              <ScrollView
                ref={heatScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
                onContentSizeChange={() => heatScroll.current?.scrollToEnd({ animated: false })}
              >
                <View style={styles.heatRow}>
                  {weeks.map((week, wi) => (
                    <View key={wi} style={styles.heatCol}>
                      {week.map((cell) => (
                        <View
                          key={cell.date}
                          style={[
                            styles.heatCell,
                            {
                              backgroundColor: colors.starlight,
                              opacity: HEAT_ALPHA[heatLevel(cell.count)],
                              borderWidth: cell.isToday ? 2 : 0,
                              borderColor: colors.edge,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.heatLegend}>
                <Text style={[styles.legendText, { color: colors.sub, fontFamily: fonts.chrome }]}>
                  {weeks[0]?.[0]?.date.slice(5) ?? ''}
                </Text>
                <Text style={[styles.legendText, { color: colors.sub, fontFamily: fonts.chrome }]}>오늘</Text>
              </View>
            </RetroCard>

            {bars.length > 0 && (
              <RetroCard style={styles.card}>
                <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>📊 완료 카테고리</Text>
                <View style={[styles.barTrack, { borderColor: colors.line }]}>
                  {bars.map((b) => (
                    <View key={b.category} style={{ flex: b.ratio, backgroundColor: b.color }} />
                  ))}
                </View>
                <View style={styles.legendWrap}>
                  {bars.map((b) => {
                    const cat = getCategory(b.category);
                    return (
                      <Text key={b.category} style={[styles.legendText, { color: colors.sub, fontFamily: fonts.chrome }]}>
                        <Text style={{ color: b.color }}>■</Text> {cat.emoji}{cat.label} {b.count}
                      </Text>
                    );
                  })}
                </View>
              </RetroCard>
            )}
          </>
        )}

        {(overdue.data?.length ?? 0) > 0 && (
          <RetroCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.warn, fontFamily: fonts.displayBold }]}>
              ⏰ 기한 지난 태스크 {overdue.data!.length}
            </Text>
            {overdue.data!.map((t) => (
              <View key={t.taskId} style={[styles.overdueRow, { borderTopColor: colors.line }]}>
                <View style={styles.overdueText}>
                  <Text numberOfLines={1} style={[styles.overdueTitle, { color: colors.fg, fontFamily: fonts.body }]}>
                    {getCategory(t.category).emoji} {t.title}
                  </Text>
                  <Text style={[styles.overdueDeadline, { color: colors.warn, fontFamily: fonts.chrome }]}>
                    {formatDeadline(t.deadline)} 마감
                  </Text>
                </View>
                <RetroButton label="완료" size="sm" onPress={() => completeOverdue(t.taskId, t.title)} />
              </View>
            ))}
          </RetroCard>
        )}

        <RetroCard style={styles.menuCard}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => (m.url ? Linking.openURL(m.url) : router.push(m.href!))}
              accessibilityRole="button"
              accessibilityLabel={m.label}
              style={({ pressed }) => [
                styles.menuRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.menuLeft}>
                <PixelIcon name={m.icon} size={16} />
                <Text style={[styles.menuLabel, { color: colors.fg, fontFamily: fonts.display }]}>{m.label}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.sub, fontFamily: fonts.chrome }]}>›</Text>
            </Pressable>
          ))}
        </RetroCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 14 },
  stationRow: { alignItems: 'center' },
  card: { gap: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 10 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  profileText: { flex: 1, gap: 3 },
  nickname: { fontSize: 17 },
  email: { fontSize: 11 },
  bio: { fontSize: 13, lineHeight: 19 },
  bioInput: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
  bioActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 4, paddingVertical: 12 },
  tileLabel: { fontSize: 10 },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileValue: { fontSize: 20 },
  tileSub: { fontSize: 10 },
  sectionTitle: { fontSize: 14 },
  heatRow: { flexDirection: 'row', gap: 3 },
  heatCol: { gap: 3 },
  heatCell: { width: 11, height: 11, borderRadius: 2 },
  heatLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  legendText: { fontSize: 10 },
  barTrack: { flexDirection: 'row', height: 16, borderRadius: 6, overflow: 'hidden', borderWidth: 1.5 },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10, paddingBottom: 2, minHeight: 48 },
  overdueText: { flex: 1, gap: 2 },
  overdueTitle: { fontSize: 13 },
  overdueDeadline: { fontSize: 11 },
  menuCard: { gap: 0, paddingVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, minHeight: 48 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  menuLabel: { fontSize: 15 },
  chevron: { fontSize: 18 },
});
