import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../src/api/client';
import { confirmExtract, extractIdeas } from '../src/api/ideas';
import type { IdeaNode } from '../src/api/types';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { invalidateAfterAi, useAiUsage } from '../src/query/hooks';
import { keys } from '../src/query/keys';
import { AI_COSTS, getCategory } from '../src/tasks/constants';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

const SCRATCH_KEY = 'dumpit_idea_scratch';
const MAX_SCRATCH = 2000;

function NodePreview({ node, depth, colors }: { node: IdeaNode; depth: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  const category = node.category ? getCategory(node.category) : null;
  return (
    <View style={{ paddingLeft: depth * 14 }}>
      <View style={[previewStyles.node, { borderColor: colors.line, backgroundColor: colors.chip }]}>
        <Text numberOfLines={1} style={{ color: colors.fg, fontFamily: fonts.display, fontSize: 13, flexShrink: 1 }}>
          {category && <><PixelIcon name={category.icon} size={11} /> </>}{node.title}
        </Text>
        {!!node.content && (
          <Text numberOfLines={2} style={{ color: colors.sub, fontFamily: fonts.body, fontSize: 11 }}>
            {node.content}
          </Text>
        )}
      </View>
      {node.children?.map((child, i) => (
        <NodePreview key={i} node={child} depth={depth + 1} colors={colors} />
      ))}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  node: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 6, gap: 2 },
});

/** 아이디어 덤프 — 쏟아내기 → AI 계층 정리(5점) → 선택 확정 (웹 IdeaDumpPage 덤프 모드 패리티) */
export default function IdeaDumpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();
  const remaining = aiUsage.data?.remaining ?? Infinity;

  const [stage, setStage] = useState<'input' | 'preview'>('input');
  const [text, setText] = useState('');
  const [initialText, setInitialText] = useState<string | null>(null);
  const [nodes, setNodes] = useState<IdeaNode[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  // 원문은 기기에만 임시 보관 (웹 localStorage 패리티) — 마운트 시 복원
  useEffect(() => {
    AsyncStorage.getItem(SCRATCH_KEY).then((saved) => {
      setInitialText(saved ?? '');
      if (saved) setText(saved);
    });
  }, []);

  const onChangeText = (v: string) => {
    setText(v);
    AsyncStorage.setItem(SCRATCH_KEY, v).catch(() => {});
  };

  const runExtract = async () => {
    setBusy(true);
    try {
      const res = await extractIdeas(text.trim());
      invalidateAfterAi(qc);
      setNodes(res.ideas ?? []);
      setExcluded(new Set());
      setStage('preview');
    } catch (e) {
      toast.show(getApiErrorMessage(e, 'AI 정리에 실패했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleRoot = (index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const saveSelected = async () => {
    const selected = nodes.filter((_, i) => !excluded.has(i));
    if (selected.length === 0) {
      toast.show('저장할 아이디어를 선택해주세요.');
      return;
    }
    setBusy(true);
    try {
      await confirmExtract(selected);
      await AsyncStorage.removeItem(SCRATCH_KEY);
      qc.invalidateQueries({ queryKey: keys.ideas });
      toast.show(`아이디어 ${selected.length}개를 저장했어요!`);
      router.back();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '저장에 실패했어요.'));
      setBusy(false);
    }
  };

  if (initialText === null) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="아이디어 덤프" icon={<PixelIcon name="bulb" size={16} />} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        {stage === 'input' ? (
          <>
            <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
              머릿속 생각을 그대로 쏟아내면 AI가 계층 구조의 아이디어로 정리해줘요.
            </Text>
            {/* 한글 IME 조합 보호 — uncontrolled */}
            <TextInput
              defaultValue={initialText}
              onChangeText={onChangeText}
              maxLength={MAX_SCRATCH}
              multiline
              placeholder="예) 사이드 프로젝트 아이디어… 픽셀 게임, 레트로 UI 키트, 굿즈…"
              placeholderTextColor={colors.sub}
              style={[styles.input, { borderColor: colors.line, backgroundColor: colors.card, color: colors.fg, fontFamily: fonts.body }]}
            />
            <Text style={[styles.counter, { color: colors.sub, fontFamily: fonts.chrome }]}>
              {/* AI 포인트 화폐 기호 — 웹 token 도트와 통일 (Text 내 인라인 이미지) */}
              {text.length}/{MAX_SCRATCH} · <PixelIcon name="token" size={11} /> 남은 AI {Number.isFinite(remaining) ? remaining : '-'}점
            </Text>
            <RetroButton
              label={`AI로 정리 (${AI_COSTS.IDEA_EXTRACT}점)`}
              icon={<PixelIcon name="sparkle" size={14} />}
              onPress={runExtract}
              busy={busy}
              disabled={!text.trim() || remaining < AI_COSTS.IDEA_EXTRACT}
            />
            {remaining < AI_COSTS.IDEA_EXTRACT && (
              <Text style={[styles.hint, { color: colors.warn, fontFamily: fonts.body }]}>
                오늘의 AI 사용량이 부족해요. 내일 자정(KST)에 초기화돼요.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
              저장할 묶음을 선택하세요. 탭하면 제외/포함이 바뀌어요.
            </Text>
            {nodes.map((node, i) => {
              const off = excluded.has(i);
              return (
                <Pressable key={i} onPress={() => toggleRoot(i)} accessibilityRole="button"
                  accessibilityState={{ selected: !off }}>
                  <RetroCard style={StyleSheet.flatten([styles.rootCard, off && styles.rootOff])}>
                    <Text style={[styles.rootMark, { color: off ? colors.sub : colors.accent2, fontFamily: fonts.chrome }]}>
                      <PixelIcon name={off ? 'checkboxOff' : 'checkboxOn'} size={12} /> {off ? '제외됨' : '저장'}
                    </Text>
                    <NodePreview node={node} depth={0} colors={colors} />
                  </RetroCard>
                </Pressable>
              );
            })}
            <RetroButton label={`저장하기 (${nodes.length - excluded.size}개 묶음)`} onPress={saveSelected} busy={busy} />
            <RetroButton label="다시 쓰기" variant="ghost" size="sm" onPress={() => setStage('input')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  back: { fontSize: 22 },
  title: { fontSize: 18, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 22 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1.5, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 220, textAlignVertical: 'top' },
  counter: { fontSize: 11, textAlign: 'right' },
  rootCard: { gap: 4 },
  rootOff: { opacity: 0.45 },
  rootMark: { fontSize: 11 },
});
