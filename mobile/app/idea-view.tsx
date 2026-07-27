import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchIdeas } from '../src/api/ideas';
import type { IdeaResponse } from '../src/api/types';
import { MarkdownView } from '../src/components/common/MarkdownView';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { keys } from '../src/query/keys';
import { getCategory } from '../src/tasks/constants';
import { STICKER_SPRITES } from '../src/tasks/stickers';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

/**
 * 아이디어 읽기 화면 — 좁은 화면에서 곧장 편집 폼이 열리는 게 부담스러워 읽기를 기본으로 둔다.
 * 웹은 좌우 분할이라 목록+상세를 동시에 보지만 앱은 한 번에 하나만 보이므로 읽기 → 편집 순서.
 */
export default function IdeaViewScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ideaId } = useLocalSearchParams<{ ideaId?: string }>();
  const ideas = useQuery({ queryKey: keys.ideas, queryFn: fetchIdeas });

  const idea = useMemo(
    () => ideas.data?.find((i) => i.ideaId === ideaId) ?? null,
    [ideas.data, ideaId],
  );
  const children: IdeaResponse[] = useMemo(
    () => (idea ? (ideas.data ?? []).filter((i) => i.parentIdeaId === idea.ideaId) : []),
    [ideas.data, idea],
  );
  const parent = useMemo(
    () => (idea?.parentIdeaId ? ideas.data?.find((i) => i.ideaId === idea.parentIdeaId) ?? null : null),
    [ideas.data, idea],
  );

  if (!idea) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.bg }]}>
        {ideas.isLoading || ideas.isFetching ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Text style={[styles.notFound, { color: colors.sub, fontFamily: fonts.body }]}>아이디어를 찾지 못했어요.</Text>
            <RetroButton label="돌아가기" size="sm" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const sticker = idea.stickerCode ? STICKER_SPRITES[idea.stickerCode] : null;
  const category = idea.category ? getCategory(idea.category) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="뒤로">
          <Text style={[styles.back, { color: colors.fg, fontFamily: fonts.chrome }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>아이디어</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/idea-edit', params: { ideaId: idea.ideaId } } as never)}
          hitSlop={12}
          accessibilityLabel="편집"
        >
          <Text style={[styles.edit, { color: colors.accent, fontFamily: fonts.chrome }]}>✏️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <RetroCard style={styles.card}>
          <View style={styles.titleRow}>
            {sticker && <Image source={sticker.img} style={styles.sticker} resizeMode="contain" />}
            <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
              {idea.pinned ? '📌 ' : ''}{idea.title}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {category && <RetroBadge text={`${category.emoji} ${category.label}`} tone="sub" />}
            {idea.convertedTaskId && <RetroBadge text="✔︎ 태스크로 전환됨" tone="accent" />}
          </View>
          {parent && (
            <Pressable
              onPress={() => router.push({ pathname: '/idea-view', params: { ideaId: parent.ideaId } } as never)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.parentLink, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text numberOfLines={1} style={[styles.parentText, { color: colors.sub, fontFamily: fonts.body }]}>
                🌳 상위: {parent.title}
              </Text>
            </Pressable>
          )}
        </RetroCard>

        <RetroCard style={styles.card}>
          {idea.content?.trim() ? (
            <MarkdownView>{idea.content}</MarkdownView>
          ) : (
            <Text style={[styles.emptyContent, { color: colors.sub, fontFamily: fonts.body }]}>
              아직 내용이 없어요. ✏️로 채워보세요.
            </Text>
          )}
        </RetroCard>

        <RetroCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            🌱 하위 아이디어 {children.length > 0 ? children.length : ''}
          </Text>
          {children.length === 0 ? (
            <Text style={[styles.emptyContent, { color: colors.sub, fontFamily: fonts.body }]}>
              아직 연결된 하위 아이디어가 없어요.
            </Text>
          ) : (
            children.map((child) => {
              const childCategory = child.category ? getCategory(child.category) : null;
              return (
                <Pressable
                  key={child.ideaId}
                  onPress={() => router.push({ pathname: '/idea-view', params: { ideaId: child.ideaId } } as never)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.childRow, { borderTopColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text numberOfLines={1} style={[styles.childTitle, { color: colors.fg, fontFamily: fonts.body }]}>
                    {child.pinned ? '📌 ' : ''}{child.title}
                  </Text>
                  {childCategory && (
                    <Text style={[styles.childCategory, { color: colors.sub, fontFamily: fonts.chrome }]}>
                      {childCategory.emoji}
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
          <RetroButton
            label="＋ 하위 아이디어 추가"
            variant="ghost"
            size="sm"
            onPress={() =>
              router.push({ pathname: '/idea-edit', params: { parentIdeaId: idea.ideaId } } as never)
            }
          />
        </RetroCard>

        <RetroButton
          label="✏️ 편집"
          onPress={() => router.push({ pathname: '/idea-edit', params: { ideaId: idea.ideaId } } as never)}
        />
        <RetroButton label="💡 아이디어 목록" variant="ghost" size="sm" onPress={() => router.replace('/ideas' as Href)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  notFound: { fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  back: { fontSize: 22 },
  headerTitle: { fontSize: 18, flex: 1, textAlign: 'center' },
  edit: { fontSize: 18 },
  body: { padding: 16, gap: 14 },
  card: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sticker: { width: 26, height: 26 },
  title: { fontSize: 18, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  parentLink: { minHeight: 32, justifyContent: 'center' },
  parentText: { fontSize: 12 },
  sectionTitle: { fontSize: 14 },
  emptyContent: { fontSize: 13, lineHeight: 19 },
  childRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, paddingVertical: 11, minHeight: 44,
  },
  childTitle: { fontSize: 14, flex: 1 },
  childCategory: { fontSize: 12 },
});
