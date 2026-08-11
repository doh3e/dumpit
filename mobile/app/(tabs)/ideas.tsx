import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchIdeas } from '../../src/api/ideas';
import { PixelIcon } from '../../src/components/common/PixelIcon';
import { RetroBadge } from '../../src/components/retro/RetroBadge';
import { RetroButton } from '../../src/components/retro/RetroButton';
import { RetroCard } from '../../src/components/retro/RetroCard';
import { buildTreeRows } from '../../src/ideas/tree';
import { keys } from '../../src/query/keys';
import { getCategory } from '../../src/tasks/constants';
import { STICKER_SPRITES } from '../../src/tasks/stickers';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/useTheme';

export default function IdeasScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ideas = useQuery({ queryKey: keys.ideas, queryFn: fetchIdeas });

  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((ideaId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) next.delete(ideaId);
      else next.add(ideaId);
      return next;
    });
  }, []);

  const rows = useMemo(
    () => buildTreeRows(ideas.data ?? [], query, expandedIds),
    [ideas.data, query, expandedIds],
  );

  const [pulling, setPulling] = useState(false);
  const onRefresh = useCallback(() => {
    setPulling(true);
    ideas.refetch().finally(() => setPulling(false));
  }, [ideas]);

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={pulling} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.fg, fontFamily: fonts.displayBold }]}>아이디어</Text>
          <View style={styles.headerActions}>
            {/* 아이디어 계열 기호는 전구로 통일 — 말풍선은 브레인덤프 전용 (2026-08-11 결정) */}
            <RetroButton label="덤프하기" icon={<PixelIcon name="bulb" size={13} />} size="sm" variant="ghost" onPress={() => router.push('/idea-dump' as Href)} />
            <RetroButton label="＋ 새 아이디어" size="sm" onPress={() => router.push('/idea-edit' as Href)} />
          </View>
        </View>

        {/* 한글 IME 조합 보호 — uncontrolled */}
        <TextInput
          defaultValue=""
          onChangeText={setQuery}
          placeholder="🔍 제목·내용 검색"
          placeholderTextColor={colors.sub}
          style={[styles.search, { borderColor: colors.line, backgroundColor: colors.card, color: colors.fg, fontFamily: fonts.body }]}
          accessibilityLabel="아이디어 검색"
        />

        <RetroCard style={styles.listCard}>
          {rows.length === 0 && (
            <Text style={[styles.empty, { color: colors.sub, fontFamily: fonts.body }]}>
              {query ? '검색 결과가 없어요.' : '떠오른 생각을 아이디어로 붙잡아두세요.\n덤프하기로 쏟아내면 AI가 정리해줘요.'}
            </Text>
          )}
          {rows.map(({ idea, depth, childCount, isExpanded }) => {
            const sticker = idea.stickerCode ? STICKER_SPRITES[idea.stickerCode] : null;
            const category = idea.category ? getCategory(idea.category) : null;
            return (
              <View key={idea.ideaId} style={[styles.row, { borderTopColor: colors.line, paddingLeft: depth * 14 }]}>
                {childCount > 0 ? (
                  <Pressable
                    onPress={() => toggleExpand(idea.ideaId)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={isExpanded ? '하위 접기' : `하위 ${childCount}개 펼치기`}
                    style={({ pressed }) => [
                      styles.caretBtn,
                      { borderColor: colors.accent2, backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.caretText, { color: colors.accent2, fontFamily: fonts.chrome }]}>
                      {isExpanded ? '▾' : '▸'} {childCount}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.caretSpacer} />
                )}
                <Pressable
                  style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => router.push({ pathname: '/idea-view', params: { ideaId: idea.ideaId } } as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`${idea.title} 열기`}
                >
                  {sticker && <Image source={sticker.img} style={styles.sticker} resizeMode="contain" />}
                  <Text numberOfLines={1} style={[styles.title, { color: colors.fg, fontFamily: fonts.display }]}>
                    {idea.pinned ? '📌 ' : ''}{idea.title}
                  </Text>
                  {category && (
                    <Text style={[styles.category, { color: colors.sub, fontFamily: fonts.chrome }]}>
                      {category.emoji}
                    </Text>
                  )}
                  {idea.convertedTaskId && <RetroBadge text="✔︎ 태스크" tone="sub" />}
                </Pressable>
              </View>
            );
          })}
        </RetroCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  heading: { fontSize: 22 },
  headerActions: { flexDirection: 'row', gap: 6 },
  search: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  listCard: { gap: 0 },
  empty: { fontSize: 13, lineHeight: 20, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingVertical: 11, minHeight: 44 },
  caretBtn: {
    minWidth: 38, height: 27, borderWidth: 1.5, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  caretText: { fontSize: 12 },
  caretSpacer: { minWidth: 38 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sticker: { width: 20, height: 20 },
  title: { fontSize: 14, flexShrink: 1 },
  category: { fontSize: 12 },
});
