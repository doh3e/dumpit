import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSheetFocus } from '../../a11y/useSheetFocus';
import { getApiErrorMessage } from '../../api/client';
import { useSaveSettings, useUserSettings } from '../../query/routineHooks';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';
import { PixelIcon } from '../common/PixelIcon';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** 활동시간(일과) 카드 — 서버 /me/settings 소비, AI 시각 배치·추천 개인화에 쓰인다 */
export function ActiveHoursCard() {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const settings = useUserSettings();
  const save = useSaveSettings();
  const sheet = useRef<BottomSheetModal>(null);
  const { headingRef, onChange } = useSheetFocus();

  const serverBaseline = settings.data
    ? { start: settings.data.routineStartHour, end: settings.data.routineEndHour }
    : null;
  const serverVersion = serverBaseline ? `${serverBaseline.start}:${serverBaseline.end}` : null;
  const [editor, setEditor] = useState(() => ({
    baseline: serverBaseline,
    draft: serverBaseline ?? { start: 9, end: 22 },
    observedServerVersion: serverVersion,
  }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  if (serverBaseline && editor.observedServerVersion !== serverVersion) {
    const wasDirty = editor.baseline !== null && (
      editor.draft.start !== editor.baseline.start || editor.draft.end !== editor.baseline.end
    );
    setEditor({
      baseline: serverBaseline,
      draft: wasDirty ? editor.draft : serverBaseline,
      observedServerVersion: serverVersion,
    });
  }
  const { baseline, draft } = editor;
  const draftStart = draft.start;
  const draftEnd = draft.end;
  const start = baseline?.start ?? 9;
  const end = baseline?.end ?? 22;
  const dirty = baseline !== null && (draftStart !== baseline.start || draftEnd !== baseline.end);
  const wraps = draftStart > draftEnd;

  const resetDraft = () => {
    if (!editor.baseline) return;
    setEditor((current) => ({ ...current, draft: current.baseline ?? current.draft }));
    setSaveError(null);
  };

  const openEditor = () => {
    if (!editor.baseline) return;
    resetDraft();
    sheet.current?.present();
  };

  const onSave = () => {
    if (savingRef.current || !editor.baseline || !dirty || draftStart === draftEnd) return;
    savingRef.current = true;
    setSaveError(null);
    save.mutate(
      { routineStartHour: draftStart, routineEndHour: draftEnd },
      {
        onSuccess: (saved) => {
          const next = { start: saved.routineStartHour, end: saved.routineEndHour };
          setEditor({
            baseline: next,
            draft: next,
            observedServerVersion: `${next.start}:${next.end}`,
          });
          toast.show('일과 시간을 저장했어요.');
        },
        onError: (e) => {
          const message = getApiErrorMessage(e, '저장하지 못했어요.');
          setSaveError(message);
          toast.error(message);
        },
        onSettled: () => { savingRef.current = false; },
      },
    );
  };

  const onCancel = () => {
    if (savingRef.current) return;
    resetDraft();
    sheet.current?.dismiss();
  };

  return (
    <RetroCard appearance="refined" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            <PixelIcon name="clock" size={13} /> 활동 시간
          </Text>
          <Text style={[styles.value, { color: colors.sub, fontFamily: fonts.chrome }]}>
            {hh(start)} ~ {start > end ? `다음날 ${hh(end)}` : hh(end)}
          </Text>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            AI가 이 시간 안에서 일정·추천을 배치해요
          </Text>
        </View>
        <RetroButton appearance="refined" label="변경" size="sm" variant="ghost" onPress={openEditor} disabled={!baseline} />
      </View>

      <BottomSheetModal
        ref={sheet}
        enableDynamicSizing
        enablePanDownToClose={!save.isPending}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onChange={onChange}
        onDismiss={resetDraft}
        backgroundStyle={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        <BottomSheetScrollView
          accessibilityViewIsModal
          contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text ref={headingRef} accessibilityRole="header" style={[styles.sheetTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>하루 시작 시각</Text>
          <View style={styles.grid}>
            {/* 24칸 격자가 둘이라 "09:00"만으로는 시작·끝을 가릴 수 없다 */}
            {HOURS.map((h) => (
              <Chip
                appearance="refined"
                key={`s${h}`}
                label={hh(h)}
                accessibilityLabel={`시작 ${h}시`}
                selected={h === draftStart}
                disabled={save.isPending}
                onPress={() => {
                  setEditor((current) => ({ ...current, draft: { ...current.draft, start: h } }));
                }}
              />
            ))}
          </View>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>하루 끝 시각</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => (
              <Chip
                appearance="refined"
                key={`e${h}`}
                label={hh(h)}
                accessibilityLabel={`끝 ${h}시`}
                selected={h === draftEnd}
                disabled={save.isPending}
                onPress={() => {
                  setEditor((current) => ({ ...current, draft: { ...current.draft, end: h } }));
                }}
              />
            ))}
          </View>
          {wraps && (
            <Text style={[styles.wrapNote, { color: colors.warnText, fontFamily: fonts.body }]}>
              <PixelIcon name="moon" size={12} /> 자정을 넘겨 다음날 새벽 {hh(draftEnd)}까지 이어지는 야행성 일과예요.
            </Text>
          )}
          {draftStart === draftEnd && (
            <Text style={[styles.wrapNote, { color: colors.warnText, fontFamily: fonts.body }]}>
              시작과 끝이 같을 수는 없어요.
            </Text>
          )}
          {saveError && (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: colors.dangerText, fontFamily: fonts.body }]}>
              {saveError}
            </Text>
          )}
          <View style={styles.actions}>
            <RetroButton
              appearance="refined"
              label="활동 시간 취소"
              variant="ghost"
              onPress={onCancel}
              disabled={save.isPending}
              style={styles.actionBtn}
            />
            <RetroButton
              appearance="refined"
              label="활동 시간 저장"
              onPress={onSave}
              busy={save.isPending}
              disabled={!dirty || draftStart === draftEnd}
              style={styles.actionBtn}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textCol: { flex: 1, gap: 4 },
  title: { fontSize: 15 },
  value: { fontSize: 14 },
  hint: { fontSize: 11 },
  sheetBody: { padding: 20, gap: 10 },
  sheetTitle: { fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wrapNote: { fontSize: 12, lineHeight: 18 },
  error: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1 },
});
