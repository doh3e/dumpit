import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  confirmBrainDump,
  submitBrainDump,
  type DumpConfirmTask,
} from '../src/api/brainDump';
import { getApiErrorMessage } from '../src/api/client';
import type { DumpResponse, DumpTaskItem } from '../src/api/types';
import { announce } from '../src/a11y/announce';
import { Chip } from '../src/components/retro/Chip';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { invalidateAfterAi, useAiUsage } from '../src/query/hooks';
import { keys } from '../src/query/keys';
import { AI_COSTS, getCategory } from '../src/tasks/constants';
import { formatDeadline } from '../src/tasks/dates';
import { useTheme } from '../src/theme/useTheme';

const MAX_LENGTH = 3000;
const PLACEHOLDER = `예) 내일까지 기획서 초안 써야 하고, 이번 주 금요일 팀 발표 준비도 해야 해. 오늘 점심 약속 있고 오후엔 헬스장도 가야 함. 아, 이메일 답장도 밀려있어...`;
const EMPTY_TASKS: DumpTaskItem[] = [];

type Stage = 'input' | 'loading' | 'select';
type PriorityTone = 'accent' | 'warn' | 'sub';

function getPriority(score: number | null): { label: string; tone: PriorityTone } {
  if ((score ?? 0) >= 0.7) return { label: '높음', tone: 'accent' };
  if ((score ?? 0) >= 0.4) return { label: '중간', tone: 'warn' };
  return { label: '낮음', tone: 'sub' };
}

function AnalysisProgress() {
  const { colors } = useTheme();

  return (
    <RetroCard appearance="refined" style={styles.loadingCard}>
      <View
        style={styles.progressContent}
        accessibilityRole="progressbar"
        accessibilityLabel="브레인 덤프 분석 중"
        accessibilityValue={{ text: '분석 중' }}
      >
        <View
          testID="brain-dump-loading-token"
          style={[styles.loadingToken, { backgroundColor: colors.card, borderColor: colors.sub }]}
        >
          <PixelIcon name="token" size={32} />
        </View>
        <ActivityIndicator
          testID="brain-dump-progress-indicator"
          color={colors.accent2Text}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
    </RetroCard>
  );
}

function ResultItem({
  item,
  selected,
  onToggle,
}: {
  item: DumpTaskItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const { colors, fonts } = useTheme();
  const priority = getPriority(item.aiPriorityScore);
  const deadline = formatDeadline(item.deadline);
  const category = getCategory(item.category);
  const metadata = [
    deadline ? `마감 ${deadline}` : null,
    item.estimatedMinutes != null ? `${item.estimatedMinutes}분` : null,
    category.label,
  ].filter((value): value is string => value != null);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.title} 선택`}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.resultPressable,
        { backgroundColor: pressed ? colors.chip : colors.card, opacity: 1 },
      ]}
    >
      <RetroCard
        appearance="refined"
        style={[
          styles.resultCard,
          {
            backgroundColor: 'transparent',
            borderColor: selected ? colors.fg : colors.sub,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.accent2Fill : colors.card,
              borderColor: selected ? colors.fg : colors.sub,
            },
          ]}
        >
          {selected ? (
            <Text style={[styles.checkmark, { color: colors.onAccent, fontFamily: fonts.chrome }]}>✓</Text>
          ) : null}
        </View>
        <View style={styles.resultBody}>
          <View style={styles.resultTitleRow}>
            <Text style={[styles.resultTitle, { color: colors.fg, fontFamily: fonts.bodyBold }]}>
              {item.title}
            </Text>
            <RetroBadge text={priority.label} tone={priority.tone} />
          </View>
          <Text style={[styles.metadata, { color: colors.fg, fontFamily: fonts.body }]}>
            {metadata.join(' · ')}
          </Text>
        </View>
      </RetroCard>
    </Pressable>
  );
}

/** 머릿속 할 일을 AI로 구조화하고 골라 등록하는 3단계 풀스크린 플로우 */
export default function BrainDumpScreen() {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [result, setResult] = useState<DumpResponse | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const tasks = result?.tasks ?? EMPTY_TASKS;
  const selectedCount = tasks.reduce(
    (count, _task, index) => count + (selectedIndexes.has(index) ? 1 : 0),
    0,
  );
  const allSelected = tasks.length > 0 && selectedCount === tasks.length;
  const insufficient = aiUsage.data != null
    && aiUsage.data.remaining < AI_COSTS.BRAIN_DUMP;
  // usage 조회 실패 시엔 막지 않는다 — 한도는 서버(429)가 최종 판정
  const analysisDisabled = !text.trim() || insufficient;

  const requestExit = useCallback(() => {
    if (text.length === 0) {
      router.back();
      return;
    }

    Alert.alert(
      '나가기',
      '작성 중인 내용이 사라져요. 나갈까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => router.back() },
      ],
    );
  }, [text]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => subscription.remove();
  }, [requestExit]);

  const handleAnalyze = useCallback(async () => {
    const rawText = text.trim();
    if (!rawText || analysisDisabled) return;

    setStage('loading');
    try {
      const response = await submitBrainDump(rawText);
      setResult(response);
      announce(`분석이 끝났어요. 후보 ${response.tasks.length}개`);
      setSelectedIndexes(new Set(response.tasks.map((_task, index) => index)));
      invalidateAfterAi(qc);
      setStage('select');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setStage('input');
    }
  }, [analysisDisabled, qc, text, toast]);

  const toggleItem = useCallback((index: number) => {
    setSelectedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIndexes(
      allSelected
        ? new Set()
        : new Set(tasks.map((_task, index) => index)),
    );
  }, [allSelected, tasks]);

  const handleConfirm = useCallback(async () => {
    if (!result || selectedCount === 0 || isSaving) return;

    const selected: DumpConfirmTask[] = result.tasks
      .filter((_task, index) => selectedIndexes.has(index))
      .map((task) => ({
        title: task.title,
        description: task.description,
        priorityScore: task.aiPriorityScore,
        category: task.category,
        deadline: task.deadline,
        estimatedMinutes: task.estimatedMinutes,
      }));

    setIsSaving(true);
    try {
      await confirmBrainDump(result.dumpId, selected);
      await qc.invalidateQueries({ queryKey: keys.planning });
      toast.show(`${selected.length}개를 할 일에 등록했어요!`);
      router.back();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, qc, result, selectedCount, selectedIndexes, toast]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />

      <View style={styles.header}>
        <Pressable
          onPress={requestExit}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.backText, { color: colors.fg, fontFamily: fonts.displayBold }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          브레인 덤프
        </Text>
        <RetroBadge text={`${AI_COSTS.BRAIN_DUMP}점`} tone="starlight" icon={<PixelIcon name="token" size={10} />} />
      </View>

      {stage === 'input' ? (
        <KeyboardAvoidingView
          style={styles.stage}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.inputContent, { paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.guide, { color: colors.sub, fontFamily: fonts.bodyBold }]}>
              머릿속 할 일을 형식 없이 자유롭게 쏟아내세요.
            </Text>
            <RetroCard appearance="refined" style={styles.inputCard}>
              {/* 한글 IME 조합 보호 — uncontrolled, 분석 실패 복귀 시 defaultValue로 드래프트 복원 */}
              <TextInput
                defaultValue={text}
                onChangeText={setText}
                multiline
                maxLength={MAX_LENGTH}
                placeholder={PLACEHOLDER}
                placeholderTextColor={colors.subOnChip}
                selectionColor={colors.accent}
                textAlignVertical="top"
                autoFocus
                accessibilityLabel="브레인 덤프 내용"
                style={[
                  styles.textInput,
                  { color: colors.fg, fontFamily: fonts.body },
                ]}
              />
              <View style={[styles.counterRow, { borderTopColor: colors.line }]}>
                <Text style={[styles.counter, { color: colors.fg, fontFamily: fonts.chrome }]}>
                  {text.length} / {MAX_LENGTH}자
                </Text>
              </View>
            </RetroCard>
            <RetroButton
              appearance="refined"
              label="AI 분석"
              icon={<PixelIcon name="sparkle" size={14} />}
              onPress={handleAnalyze}
              disabled={analysisDisabled}
              style={styles.analyzeButton}
            />
            {insufficient ? (
              <Text
                accessibilityRole="alert"
                style={[styles.insufficient, { color: colors.warnText, fontFamily: fonts.bodyBold }]}
              >
                오늘 AI 점수가 부족해요
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      {stage === 'loading' ? (
        <View style={[styles.loadingContent, { paddingBottom: insets.bottom + 24 }]}>
          <AnalysisProgress />
          <Text style={[styles.loadingText, { color: colors.fg, fontFamily: fonts.bodyBold }]}>
            생각을 정리하는 중…
          </Text>
        </View>
      ) : null}

      {stage === 'select' ? (
        <View style={styles.stage}>
          <FlatList
            data={tasks}
            keyExtractor={(_item, index) => String(index)}
            contentContainerStyle={styles.resultList}
            ListHeaderComponent={(
              <View style={styles.selectHeader}>
                <View style={styles.selectHeading}>
                  <Text style={[styles.selectTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
                    AI 분석 결과
                  </Text>
                  <Text style={[styles.selectCount, { color: colors.sub, fontFamily: fonts.chrome }]}>
                    {selectedCount} / {tasks.length}
                  </Text>
                </View>
                <Chip
                  appearance="refined"
                  label={allSelected ? '전체 해제' : '전체 선택'}
                  selected={allSelected}
                  onPress={toggleAll}
                />
              </View>
            )}
            renderItem={({ item, index }) => (
              <ResultItem
                item={item}
                selected={selectedIndexes.has(index)}
                onToggle={() => toggleItem(index)}
              />
            )}
          />
          <View
            style={[
              styles.confirmBar,
              {
                // 목록 위에 뜨는 고정 바 — 배경 무늬가 비치면 안 되므로 불투명 카드색
                backgroundColor: colors.card,
                borderTopColor: colors.line,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <RetroButton
              appearance="refined"
              label={`선택한 ${selectedCount}개 등록`}
              onPress={handleConfirm}
              disabled={selectedCount === 0}
              busy={isSaving}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stage: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20 },
  title: { flex: 1, fontSize: 17 },
  inputContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8 },
  guide: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  inputCard: { flex: 1, minHeight: 280 },
  textInput: { flex: 1, padding: 0, fontSize: 15, lineHeight: 23 },
  counterRow: {
    borderTopWidth: 1.5,
    marginTop: 14,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  counter: { fontSize: 12 },
  analyzeButton: { marginTop: 16 },
  insufficient: { marginTop: 10, textAlign: 'center', fontSize: 12 },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  loadingCard: { width: '100%', maxWidth: 240, padding: 24 },
  progressContent: { alignItems: 'center', gap: 16 },
  loadingToken: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 18, textAlign: 'center' },
  resultList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18 },
  selectHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  selectHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 160,
  },
  selectTitle: { fontSize: 16 },
  selectCount: { fontSize: 11 },
  resultPressable: { minHeight: 48, marginBottom: 11, borderRadius: 12, overflow: 'hidden' },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: { fontSize: 12, lineHeight: 14 },
  resultBody: { flex: 1, minWidth: 0 },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  resultTitle: { flex: 1, fontSize: 14, lineHeight: 20 },
  metadata: { marginTop: 6, fontSize: 11, lineHeight: 16 },
  confirmBar: {
    borderTopWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
