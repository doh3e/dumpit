import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNotices } from '../src/api/notices';
import type { NoticeResponse } from '../src/api/types';
import { MarkdownView } from '../src/components/common/MarkdownView';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { parseDate } from '../src/tasks/dates';
import { keys } from '../src/query/keys';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

function dateLabel(notice: NoticeResponse): string {
  const d = parseDate(notice.publishAt ?? notice.createdAt);
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : '';
}

export default function NoticesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const current = useQuery({ queryKey: keys.notices(page), queryFn: () => fetchNotices(page) });

  const [loaded, setLoaded] = useState<NoticeResponse[]>([]);
  const [loadedPage, setLoadedPage] = useState(-1);
  if (current.data && loadedPage !== current.data.page) {
    setLoaded((prev) => (current.data!.page === 0 ? current.data!.notices : [...prev, ...current.data!.notices]));
    setLoadedPage(current.data.page);
  }

  const pinned = current.data?.pinned ?? [];
  const hasMore = current.data ? current.data.page + 1 < current.data.totalPages : false;

  const [openId, setOpenId] = useState<string | null>(null);
  const allRows = useMemo(() => [...pinned, ...loaded], [pinned, loaded]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="공지사항" icon={<PixelIcon name="megaphone" size={16} />} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <RetroCard style={styles.listCard}>
          {allRows.length === 0 && !current.isLoading && (
            <Text style={[styles.empty, { color: colors.sub, fontFamily: fonts.body }]}>아직 공지가 없어요.</Text>
          )}
          {allRows.map((n) => {
            const open = openId === n.noticeId;
            return (
              <View key={n.noticeId} style={[styles.row, { borderTopColor: colors.line }]}>
                <Pressable
                  onPress={() => setOpenId(open ? null : n.noticeId)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={({ pressed }) => [styles.rowHead, { opacity: pressed ? 0.7 : 1 }]}
                >
                  {n.pinned && <RetroBadge text="고정" tone="sub" icon={<PixelIcon name="pin" size={10} />} />}
                  <Text numberOfLines={open ? undefined : 1} style={[styles.rowTitle, { color: colors.fg, fontFamily: fonts.display }]}>
                    {n.title}
                  </Text>
                  <Text style={[styles.rowDate, { color: colors.sub, fontFamily: fonts.chrome }]}>{dateLabel(n)}</Text>
                </Pressable>
                {open && (
                  <View style={[styles.content, { borderColor: colors.line, backgroundColor: colors.chip }]}>
                    <MarkdownView>{n.content}</MarkdownView>
                  </View>
                )}
              </View>
            );
          })}
        </RetroCard>
        {hasMore && (
          <RetroButton label="더 보기" variant="ghost" size="sm" onPress={() => setPage((p) => p + 1)} busy={current.isFetching} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  listCard: { gap: 0 },
  empty: { fontSize: 13, paddingVertical: 8 },
  row: { borderTopWidth: 1, paddingVertical: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, minHeight: 44 },
  rowTitle: { fontSize: 14, flex: 1 },
  rowDate: { fontSize: 11 },
  content: { borderWidth: 1.5, borderRadius: 8, padding: 12, marginBottom: 8 },
});
