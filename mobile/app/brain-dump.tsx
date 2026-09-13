import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import {
  AccessibilityInfo,
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
  findNodeHandle,
  type LayoutChangeEvent,
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
import { useAuth } from '../src/auth/AuthContext';
import { clearDraft, readDraft, writeDraft } from '../src/brainDump/draft';
import { BrainDumpTaskEditor } from '../src/components/brainDump/BrainDumpTaskEditor';
import { Chip } from '../src/components/retro/Chip';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { RetroBadge } from '../src/components/retro/RetroBadge';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { invalidateAfterAi, useAiUsage } from '../src/query/hooks';
import { keys } from '../src/query/keys';
import { useContentFrame } from '../src/layout/useContentFrame';
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
  editing,
  interactionLocked,
  editRef,
  onToggle,
  onEdit,
  onApply,
  onCancel,
}: {
  item: DumpTaskItem;
  selected: boolean;
  editing: boolean;
  interactionLocked: boolean;
  editRef: (node: ElementRef<typeof Pressable> | null) => void;
  onToggle: () => void;
  onEdit: () => void;
  onApply: (fields: Pick<DumpTaskItem, 'title' | 'deadline' | 'estimatedMinutes'>) => void;
  onCancel: () => void;
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
    <View style={styles.resultItem}>
      <View style={styles.resultItemRow}>
        <Pressable
          onPress={onToggle}
          disabled={interactionLocked}
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.title} 선택`}
          accessibilityState={{ checked: selected, ...(interactionLocked ? { disabled: true } : {}) }}
          style={({ pressed }) => [
            styles.resultPressable,
            { backgroundColor: pressed ? colors.chip : colors.card, opacity: interactionLocked ? 0.6 : 1 },
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
        <Pressable
          ref={editRef}
          onPress={onEdit}
          disabled={interactionLocked}
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 수정`}
          accessibilityState={{ expanded: editing, disabled: interactionLocked }}
          style={({ pressed }) => [
            styles.editButton,
            {
              borderColor: colors.sub,
              backgroundColor: pressed ? colors.chip : colors.card,
              opacity: interactionLocked && !editing ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.editText, { color: colors.fg, fontFamily: fonts.chrome }]}>수정</Text>
        </Pressable>
      </View>
      {editing ? (
        <BrainDumpTaskEditor task={item} onApply={onApply} onCancel={onCancel} />
      ) : null}
    </View>
  );
}

/** 머릿속 할 일을 AI로 구조화하고 골라 등록하는 3단계 풀스크린 플로우 */
export default function BrainDumpScreen() {
  const { me } = useAuth();
  const accountKey = me?.email ?? null;
  return <AccountBrainDumpScreen key={accountKey ?? 'anonymous'} accountKey={accountKey} />;
}

function AccountBrainDumpScreen({ accountKey }: { accountKey: string | null }) {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const frame = useContentFrame();
  const toast = useToast();
  const qc = useQueryClient();
  const aiUsage = useAiUsage();
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hydrated, setHydrated] = useState(accountKey === null);
  const [result, setResult] = useState<DumpResponse | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focusRestoreIndex, setFocusRestoreIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showDraftDetails, setShowDraftDetails] = useState(false);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [resultViewportHeight, setResultViewportHeight] = useState(0);
  const [confirmBarHeight, setConfirmBarHeight] = useState(0);
  const writeGenerationRef = useRef(0);
  const analyzePendingRef = useRef(false);
  const confirmPendingRef = useRef(false);
  const confirmGenerationRef = useRef(0);
  const clearPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const editButtonRefs = useRef(new Map<number, ElementRef<typeof Pressable>>());

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
  const draftStatusText = {
    idle: '원문 초안 · 입력하면 이 기기에 저장돼요',
    saving: '저장 중...',
    saved: '원문 초안 저장됨',
    error: '이 기기에 저장하지 못했어요',
  }[draftStatus];

  const requestExit = useCallback(() => router.back(), []);

  const handleResultViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setResultViewportHeight((current) => current === height ? current : height);
  }, []);

  const handleConfirmBarLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setConfirmBarHeight((current) => current === height ? current : height);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      confirmGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (editingIndex !== null || focusRestoreIndex === null) return;
    const target = editButtonRefs.current.get(focusRestoreIndex);
    target?.focus?.();
    const tag = target ? findNodeHandle(target) : null;
    if (typeof tag === 'number') AccessibilityInfo.setAccessibilityFocus(tag);
  }, [editingIndex, focusRestoreIndex]);

  useEffect(() => {
    if (!accountKey) return undefined;

    void readDraft(accountKey)
      .then((draft) => {
        if (!mountedRef.current) return;
        setText(draft?.rawText ?? '');
        setDraftStatus(draft ? 'saved' : 'idle');
      })
      .catch(() => {
        if (mountedRef.current) setDraftStatus('error');
      })
      .finally(() => {
        if (mountedRef.current) setHydrated(true);
      });
    return undefined;
  }, [accountKey]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => subscription.remove();
  }, [requestExit]);

  const handleTextChange = useCallback((nextText: string) => {
    if (!mountedRef.current || !accountKey || !hydrated || clearPendingRef.current || confirmPendingRef.current) return;
    const writeGeneration = ++writeGenerationRef.current;
    setText(nextText);
    setDraftStatus('saving');
    void writeDraft(accountKey, nextText)
      .then(() => {
        if (mountedRef.current && writeGenerationRef.current === writeGeneration) {
          setDraftStatus(nextText ? 'saved' : 'idle');
        }
      })
      .catch(() => {
        if (mountedRef.current && writeGenerationRef.current === writeGeneration) {
          setDraftStatus('error');
        }
      });
  }, [accountKey, hydrated]);

  const handleAnalyze = useCallback(async () => {
    const rawText = text.trim();
    if (!rawText || analysisDisabled || editingIndex !== null || analyzePendingRef.current || !hydrated) return;

    analyzePendingRef.current = true;
    const returnStage: Stage = result ? 'select' : 'input';
    setStage('loading');
    try {
      const response = await submitBrainDump(rawText);
      if (!mountedRef.current) return;
      setResult(response);
      announce(`분석이 끝났어요. 후보 ${response.tasks.length}개`);
      setSelectedIndexes(new Set(response.tasks.map((_task, index) => index)));
      setEditingIndex(null);
      setFocusRestoreIndex(null);
      invalidateAfterAi(qc);
      setStage('select');
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(getApiErrorMessage(error));
      setStage(returnStage);
    } finally {
      if (mountedRef.current) analyzePendingRef.current = false;
    }
  }, [analysisDisabled, editingIndex, hydrated, qc, result, text, toast]);

  const performClear = useCallback(async () => {
    if (!mountedRef.current || !accountKey || clearPendingRef.current || !hydrated) return;
    clearPendingRef.current = true;
    writeGenerationRef.current += 1;
    setIsClearing(true);
    try {
      await clearDraft(accountKey);
      if (!mountedRef.current) return;
      setText('');
      setResult(null);
      setSelectedIndexes(new Set());
      setEditingIndex(null);
      setFocusRestoreIndex(null);
      setDraftStatus('idle');
      setStage('input');
      setEditorGeneration((value) => value + 1);
    } catch {
      if (mountedRef.current) {
        setDraftStatus('error');
        toast.error('원문 초안을 지우지 못했어요. 다시 시도해주세요.');
      }
    } finally {
      if (mountedRef.current) {
        clearPendingRef.current = false;
        setIsClearing(false);
      }
    }
  }, [accountKey, hydrated, toast]);

  const requestClear = useCallback(() => {
    if (isClearing || editingIndex !== null) return;
    Alert.alert(
      '원문과 결과 지우기',
      '원문과 AI 분석 결과가 모두 사라져요. 지울까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '지우기', style: 'destructive', onPress: () => { void performClear(); } },
      ],
    );
  }, [editingIndex, isClearing, performClear]);

  const toggleItem = useCallback((index: number) => {
    if (editingIndex !== null) return;
    setSelectedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, [editingIndex]);

  const toggleAll = useCallback(() => {
    if (editingIndex !== null) return;
    setSelectedIndexes(
      allSelected
        ? new Set()
        : new Set(tasks.map((_task, index) => index)),
    );
  }, [allSelected, editingIndex, tasks]);

  const handleConfirm = useCallback(async () => {
    if (!result || selectedCount === 0 || editingIndex !== null || isSaving || confirmPendingRef.current || !accountKey) return;

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

    const confirmGeneration = ++confirmGenerationRef.current;
    const isCurrentConfirm = () => (
      mountedRef.current && confirmGenerationRef.current === confirmGeneration
    );
    confirmPendingRef.current = true;
    setIsSaving(true);
    try {
      await confirmBrainDump(result.dumpId, selected);
    } catch (error) {
      if (!isCurrentConfirm()) return;
      toast.error(getApiErrorMessage(error));
      confirmPendingRef.current = false;
      setIsSaving(false);
      return;
    }

    if (!isCurrentConfirm()) return;
    try {
      await clearDraft(accountKey);
    } catch {
      if (isCurrentConfirm()) {
        toast.error('할 일은 등록했지만 원문 초안을 지우지 못했어요.');
      }
    }
    if (!isCurrentConfirm()) return;
    writeGenerationRef.current += 1;
    try { await qc.invalidateQueries({ queryKey: keys.planning }); } catch { /* 다음 화면 조회로 복구 */ }
    if (!isCurrentConfirm()) return;
    toast.show(`${selected.length}개를 할 일에 등록했어요!`);
    router.back();
  }, [accountKey, editingIndex, isSaving, qc, result, selectedCount, selectedIndexes, toast]);

  const closeEditor = useCallback((index: number) => {
    setEditingIndex(null);
    setFocusRestoreIndex(index);
  }, []);

  const applyTaskEdit = useCallback((index: number, fields: Pick<DumpTaskItem, 'title' | 'deadline' | 'estimatedMinutes'>) => {
    setResult((current) => current ? {
      ...current,
      tasks: current.tasks.map((task, taskIndex) => (
        taskIndex === index ? { ...task, ...fields } : task
      )),
    } : current);
    closeEditor(index);
  }, [closeEditor]);

  const confirmBarInList = editingIndex !== null || (
    resultViewportHeight > 0
    && confirmBarHeight > 0
    && resultViewportHeight <= confirmBarHeight * 2
  );

  const renderConfirmBar = (inList: boolean) => (
    <View
      testID="brain-dump-confirm-bar"
      onLayout={handleConfirmBarLayout}
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
      <View style={[styles.confirmBarContent, inList ? styles.confirmBarContentInList : frame]}>
        <View style={styles.resultSecondaryActions}>
          <RetroButton
            appearance="refined"
            label="지우기"
            variant="ghost"
            onPress={requestClear}
            disabled={isSaving || isClearing || editingIndex !== null}
            style={styles.resultSecondaryAction}
          />
          <RetroButton
            appearance="refined"
            label="다시 분석"
            variant="ghost"
            onPress={handleAnalyze}
            disabled={isSaving || isClearing || editingIndex !== null || analysisDisabled}
            style={styles.resultSecondaryAction}
          />
        </View>
        <RetroButton
          appearance="refined"
          label={`선택한 ${selectedCount}개 등록`}
          onPress={handleConfirm}
          disabled={selectedCount === 0 || isClearing || editingIndex !== null}
          busy={isSaving}
        />
      </View>
    </View>
  );

  if (!hydrated) {
    return (
      <View style={[styles.screen, styles.loadingContent, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent2Text} accessibilityLabel="원문 초안 불러오는 중" />
        <Text style={[styles.guide, { color: colors.sub, fontFamily: fonts.bodyBold }]}>원문 초안을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />

      <View style={[styles.header, frame]}>
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[styles.inputContent, frame, { paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.guide, { color: colors.sub, fontFamily: fonts.bodyBold }]}>
              머릿속 할 일을 형식 없이 자유롭게 쏟아내세요.
            </Text>
            <RetroCard appearance="refined" style={styles.inputCard}>
              {/* 한글 IME 조합 보호 — uncontrolled, 분석 실패 복귀 시 defaultValue로 드래프트 복원 */}
              <TextInput
                key={editorGeneration}
                defaultValue={text}
                onChangeText={handleTextChange}
                editable={!isClearing}
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
            <View style={styles.inputActions}>
              <RetroButton
                appearance="refined"
                label="지우기"
                variant="ghost"
                onPress={requestClear}
                disabled={isClearing || text.length === 0}
                style={styles.inputAction}
              />
              <RetroButton
                appearance="refined"
                label="AI 분석"
                icon={<PixelIcon name="sparkle" size={14} />}
                onPress={handleAnalyze}
                disabled={analysisDisabled || isClearing}
                style={styles.inputAction}
              />
            </View>
            <View style={styles.draftInfo}>
              <Text accessibilityRole="text" style={[styles.draftStatus, { color: draftStatus === 'error' ? colors.warnText : colors.fg, fontFamily: fonts.bodyBold }]}>
                {draftStatusText}
              </Text>
              <Text style={[styles.draftHint, { color: colors.sub, fontFamily: fonts.body }]}>
                원문 초안은 같은 기기의 이 앱에서 계정별로 마지막 수정부터 7일간 복구돼요.
              </Text>
              <Pressable
                onPress={() => setShowDraftDetails((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showDraftDetails ? '초안 저장 범위 접기' : '초안 저장 범위 자세히'}
                accessibilityState={{ expanded: showDraftDetails }}
                style={({ pressed }) => [
                  styles.draftDisclosure,
                  { backgroundColor: pressed ? colors.chip : 'transparent' },
                ]}
              >
                <Text style={[styles.draftDisclosureText, { color: colors.subOnChip, fontFamily: fonts.chrome }]}>
                  {showDraftDetails ? '저장 범위 접기 ▲' : '저장 범위 자세히 ▼'}
                </Text>
              </Pressable>
              {showDraftDetails ? (
                <Text style={[styles.draftDetails, { color: colors.sub, fontFamily: fonts.body }]}>
                  웹·데스크톱·Android 사이에는 동기화되지 않아요. 화면 이동·앱 재시작·자동 세션 만료에는 남아 있어요. 지우기·등록 완료·직접 로그아웃·탈퇴 때 이 앱 초안이 삭제돼요.
                </Text>
              ) : null}
            </View>
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
        <KeyboardAvoidingView
          style={styles.stage}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          onLayout={handleResultViewportLayout}
        >
          <FlatList
            data={tasks}
            keyExtractor={(_item, index) => `${result?.dumpId ?? 'dump'}-${index}`}
            extraData={`${editingIndex ?? 'none'}:${selectedCount}`}
            contentContainerStyle={[styles.resultList, frame]}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            ListFooterComponent={confirmBarInList ? renderConfirmBar(true) : null}
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
                  disabled={editingIndex !== null}
                />
              </View>
            )}
            renderItem={({ item, index }) => (
              <ResultItem
                item={item}
                selected={selectedIndexes.has(index)}
                editing={editingIndex === index}
                interactionLocked={editingIndex !== null || isSaving || isClearing}
                editRef={(node) => {
                  if (node) editButtonRefs.current.set(index, node);
                  else editButtonRefs.current.delete(index);
                }}
                onToggle={() => toggleItem(index)}
                onEdit={() => setEditingIndex(index)}
                onApply={(fields) => applyTaskEdit(index, fields)}
                onCancel={() => closeEditor(index)}
              />
            )}
          />
          {confirmBarInList ? null : renderConfirmBar(false)}
        </KeyboardAvoidingView>
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
  inputActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  inputAction: { flex: 1, minHeight: 48 },
  draftInfo: { gap: 4, marginTop: 12 },
  draftStatus: { fontSize: 12, lineHeight: 18 },
  draftHint: { fontSize: 11, lineHeight: 17 },
  draftDisclosure: {
    minHeight: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  draftDisclosureText: { fontSize: 11 },
  draftDetails: { fontSize: 11, lineHeight: 17, paddingHorizontal: 8, paddingBottom: 4 },
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
  resultItem: { marginBottom: 11, gap: 8 },
  resultItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultPressable: { flex: 1, minHeight: 48, borderRadius: 12, overflow: 'hidden' },
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
  editButton: {
    minWidth: 48,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { fontSize: 12 },
  confirmBar: {
    borderTopWidth: 1.5,
  },
  confirmBarContent: { paddingHorizontal: 16, paddingTop: 12 },
  confirmBarContentInList: { paddingHorizontal: 0 },
  resultSecondaryActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  resultSecondaryAction: { flex: 1, minHeight: 48 },
});
