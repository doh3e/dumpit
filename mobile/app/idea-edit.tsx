import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../src/api/client';
import { convertIdeaToTask, createIdea, deleteIdea, fetchIdeas, patchIdea, setIdeaSticker } from '../src/api/ideas';
import type { IdeaResponse } from '../src/api/types';
import { MarkdownView } from '../src/components/common/MarkdownView';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { Chip } from '../src/components/retro/Chip';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { StickerPicker } from '../src/components/task/StickerPicker';
import { sortParentCandidates } from '../src/ideas/tree';
import { invalidateAfterAi, useAiUsage } from '../src/query/hooks';
import { keys } from '../src/query/keys';
import { AI_COSTS, TASK_CATEGORIES } from '../src/tasks/constants';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

/** 아이디어 추가·편집 풀스크린 — 마크다운·스티커·태스크 전환 (웹 IdeaDumpPage 폼 패리티) */
export default function IdeaEditScreen() {
  const { colors } = useTheme();
  const { ideaId, parentIdeaId } = useLocalSearchParams<{ ideaId?: string; parentIdeaId?: string }>();
  const ideas = useQuery({ queryKey: keys.ideas, queryFn: fetchIdeas });

  const editing = useMemo(
    () => ideas.data?.find((i) => i.ideaId === ideaId) ?? null,
    [ideas.data, ideaId],
  );

  // 편집 진입인데 대상 미로드 — 빈 폼 저장이 기존 아이디어를 덮지 않게 가드 (routine-edit 패턴)
  if (ideaId && !editing) {
    return (
      <View style={[styles.screen, styles.centered]}>
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

  return (
    <IdeaEditForm
      key={editing?.ideaId ?? 'new'}
      editing={editing}
      allIdeas={ideas.data ?? []}
      initialParentId={typeof parentIdeaId === 'string' ? parentIdeaId : null}
    />
  );
}

function descendantIds(all: IdeaResponse[], rootId: string): Set<string> {
  const byParent = new Map<string, IdeaResponse[]>();
  all.forEach((i) => {
    const key = i.parentIdeaId ?? 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(i);
  });
  const result = new Set<string>();
  const walk = (id: string) => {
    (byParent.get(id) ?? []).forEach((child) => {
      result.add(child.ideaId);
      walk(child.ideaId);
    });
  };
  walk(rootId);
  return result;
}

function IdeaEditForm({ editing, allIdeas, initialParentId }: {
  editing: IdeaResponse | null;
  allIdeas: IdeaResponse[];
  initialParentId: string | null;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();
  const remaining = aiUsage.data?.remaining ?? Infinity;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState(editing?.content ?? '');
  const [category, setCategory] = useState<string | null>(editing?.category ?? null);
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
  const [parentId, setParentId] = useState<string | null>(editing?.parentIdeaId ?? initialParentId);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stickerCode, setStickerCode] = useState<string | null>(editing?.stickerCode ?? null);
  const parentSheet = useRef<BottomSheetModal>(null);

  const childCount = editing ? allIdeas.filter((i) => i.parentIdeaId === editing.ideaId).length : 0;
  // 자기 자신·자기 후손은 상위로 지정 불가 (사이클 방지)
  const invalidParents = useMemo(() => {
    if (!editing) return new Set<string>();
    const set = descendantIds(allIdeas, editing.ideaId);
    set.add(editing.ideaId);
    return set;
  }, [allIdeas, editing]);
  const parentCandidates = useMemo(
    () => sortParentCandidates(allIdeas.filter((i) => !invalidParents.has(i.ideaId)), allIdeas),
    [allIdeas, invalidParents],
  );
  const parentTitle = parentId ? allIdeas.find((i) => i.ideaId === parentId)?.title ?? '(삭제됨)' : null;

  const save = async () => {
    if (!title.trim()) {
      toast.show('제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim() || null,
        pinned,
        category,
        parentIdeaId: parentId,
      };
      if (editing) await patchIdea(editing.ideaId, payload);
      else await createIdea(payload);
      qc.invalidateQueries({ queryKey: keys.ideas });
      router.back();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '아이디어를 저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
  };

  const applySticker = async (code: string | null) => {
    if (!editing) return;
    setBusy(true);
    try {
      const updated = await setIdeaSticker(editing.ideaId, code);
      setStickerCode(updated.stickerCode);
      qc.invalidateQueries({ queryKey: keys.ideas });
    } catch (e) {
      toast.show(getApiErrorMessage(e, '스티커를 바꾸지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmConvert = () => {
    if (!editing) return;
    Alert.alert('태스크로 전환', `AI ${AI_COSTS.IDEA_CONVERT}점을 사용해 태스크로 전환해요.\n아이디어는 남아 있어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '전환',
        onPress: async () => {
          setBusy(true);
          try {
            await convertIdeaToTask(editing.ideaId);
            invalidateAfterAi(qc);
            qc.invalidateQueries({ queryKey: keys.ideas });
            qc.invalidateQueries({ queryKey: keys.planning });
            toast.show('태스크로 전환했어요!');
          } catch (e) {
            toast.show(getApiErrorMessage(e, '전환에 실패했어요.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('아이디어 삭제', '이 아이디어를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteIdea(editing.ideaId);
            qc.invalidateQueries({ queryKey: keys.ideas });
            // 뒤로 가면 방금 지운 아이디어의 읽기 화면이라 목록으로 보낸다
            router.replace('/ideas' as Href);
          } catch (e) {
            toast.show(getApiErrorMessage(e, '삭제하지 못했어요.'));
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={editing ? '아이디어 수정' : '새 아이디어'} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <RetroCard style={styles.card}>
          {/* 한글 IME 조합 보호 — uncontrolled */}
          <TextInput
            defaultValue={editing?.title ?? ''}
            onChangeText={setTitle}
            maxLength={200}
            placeholder="아이디어 제목 *"
            placeholderTextColor={colors.sub}
            style={[styles.input, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
          />
          <View style={styles.previewRow}>
            <Chip label="작성" selected={!preview} onPress={() => setPreview(false)} />
            <Chip label="미리보기" selected={preview} onPress={() => setPreview(true)} />
          </View>
          {preview ? (
            <View style={[styles.previewBox, { borderColor: colors.line }]}>
              {content.trim() ? <MarkdownView>{content}</MarkdownView> : (
                <Text style={{ color: colors.sub, fontFamily: fonts.body, fontSize: 13 }}>내용이 비어 있어요.</Text>
              )}
            </View>
          ) : (
            <TextInput
              // 미리보기 토글로 리마운트될 때 서버값이 아닌 최신 입력을 복원해야 함 (uncontrolled라 마운트 시에만 읽힘)
              defaultValue={content}
              onChangeText={setContent}
              maxLength={5000}
              multiline
              placeholder="내용 (마크다운 지원, 선택)"
              placeholderTextColor={colors.sub}
              style={[styles.input, styles.contentInput, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
            />
          )}
        </RetroCard>

        <RetroCard style={styles.card}>
          <View style={styles.chipRow}>
            <Chip label="미지정" selected={category == null} onPress={() => setCategory(null)} />
            {TASK_CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} icon={<PixelIcon name={c.icon} size={12} />} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.body }]}>
              <PixelIcon name="pin" size={12} /> 상단 고정
            </Text>
            <Switch value={pinned} onValueChange={setPinned}
              trackColor={{ false: colors.line, true: colors.accent2 }} thumbColor={colors.card} />
          </View>
          <Pressable
            onPress={() => parentSheet.current?.present()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.parentBtn, { borderColor: colors.line, backgroundColor: colors.chip, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text numberOfLines={1} style={[styles.parentText, { color: parentTitle ? colors.fg : colors.sub, fontFamily: fonts.body }]}>
              <PixelIcon name="tree" size={12} /> 상위: {parentTitle ?? '없음 (최상위)'}
            </Text>
          </Pressable>
        </RetroCard>

        {editing && (
          <RetroCard style={styles.card}>
            <Text style={[styles.sectionLabel, { color: colors.sub, fontFamily: fonts.chrome }]}>스티커 (바로 저장돼요)</Text>
            <StickerPicker current={stickerCode} onSelect={applySticker} disabled={busy} />
          </RetroCard>
        )}

        <RetroButton label={editing ? '저장' : '아이디어 추가'} onPress={save} busy={saving} />
        {editing && (
          <>
            <RetroButton
              label={editing.convertedTaskId ? '✓ 이미 태스크로 전환됨' : `태스크로 전환 (${AI_COSTS.IDEA_CONVERT}점)`}
              icon={editing.convertedTaskId ? undefined : <PixelIcon name="scissors" size={14} />}
              variant="ghost"
              onPress={confirmConvert}
              disabled={!!editing.convertedTaskId || busy || remaining < AI_COSTS.IDEA_CONVERT}
            />
            <RetroButton
              label={childCount > 0 ? '하위 아이디어를 먼저 정리해주세요' : '삭제'}
              variant="danger"
              size="sm"
              onPress={confirmDelete}
              disabled={childCount > 0 || busy}
            />
          </>
        )}
      </ScrollView>

      <BottomSheetModal
        ref={parentSheet}
        enableDynamicSizing
        maxDynamicContentSize={Math.round(windowHeight * 0.62)}
        backgroundStyle={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        {/* 일반 ScrollView는 시트 팬 제스처에 먹혀 스크롤 불가 — 시트 전용 스크롤러 + OS 내비 바 인셋 필수 */}
        <BottomSheetScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.sheetTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>상위 아이디어 선택</Text>
          <Pressable
            onPress={() => { setParentId(null); parentSheet.current?.dismiss(); }}
            style={({ pressed }) => [styles.sheetRow, { borderBottomColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.sheetRowText, { color: colors.sub, fontFamily: fonts.body }]}>없음 (최상위)</Text>
          </Pressable>
          {parentCandidates.map((i) => (
            <Pressable
              key={i.ideaId}
              onPress={() => { setParentId(i.ideaId); parentSheet.current?.dismiss(); }}
              style={({ pressed }) => [styles.sheetRow, { borderBottomColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text numberOfLines={1} style={[styles.sheetRowText, { color: colors.fg, fontFamily: fonts.body }]}>{i.title}</Text>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  notFound: { fontSize: 14 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { gap: 10 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  contentInput: { minHeight: 140, textAlignVertical: 'top' },
  previewRow: { flexDirection: 'row', gap: 6 },
  previewBox: { borderWidth: 1.5, borderRadius: 8, padding: 12, minHeight: 140 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  sectionLabel: { fontSize: 11 },
  parentBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  parentText: { fontSize: 13 },
  sheetBody: { padding: 20 },
  sheetTitle: { fontSize: 16, marginBottom: 10 },
  sheetRow: { borderBottomWidth: 1, paddingVertical: 13, minHeight: 44, justifyContent: 'center' },
  sheetRowText: { fontSize: 14 },
});
