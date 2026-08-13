import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchUnreadNotices, markNoticeRead } from '../../api/notices';
import type { NoticeResponse } from '../../api/types';
import { retroShadow } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { MarkdownView } from '../common/MarkdownView';
import { RetroButton } from '../retro/RetroButton';
import { PixelIcon } from '../common/PixelIcon';

/** 미읽음 popup 공지 순차 모달 (웹 NoticeModal 패리티) — 닫으면 read 처리 */
export function NoticePopup() {
  const { colors } = useTheme();
  const [queue, setQueue] = useState<NoticeResponse[]>([]);

  useEffect(() => {
    fetchUnreadNotices().then(setQueue).catch(() => {});
  }, []);

  const current = queue[0];
  if (!current) return null;

  const dismiss = () => {
    markNoticeRead(current.noticeId).catch(() => {});
    setQueue((prev) => prev.slice(1));
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.edge },
            retroShadow(5, colors.shadowHero),
          ]}
        >
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            <PixelIcon name="megaphone" size={14} /> {current.title}
          </Text>
          <ScrollView style={styles.content}>
            <MarkdownView>{current.content}</MarkdownView>
          </ScrollView>
          <RetroButton label="확인했어요!" onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderWidth: 2, borderRadius: 12, padding: 18, gap: 12, maxHeight: '75%' },
  title: { fontSize: 16 },
  content: { flexGrow: 0 },
});
