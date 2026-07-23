import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { useSaveSettings, useUserSettings } from '../../query/routineHooks';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** 활동시간(일과) 카드 — 서버 /me/settings 소비, AI 시각 배치·추천 개인화에 쓰인다 */
export function ActiveHoursCard() {
  const { colors } = useTheme();
  const toast = useToast();
  const settings = useUserSettings();
  const save = useSaveSettings();
  const sheet = useRef<BottomSheetModal>(null);

  const start = settings.data?.routineStartHour ?? 9;
  const end = settings.data?.routineEndHour ?? 22;
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const wraps = draftStart > draftEnd;

  const openEditor = () => {
    setDraftStart(start);
    setDraftEnd(end);
    sheet.current?.present();
  };

  const onSave = () => {
    save.mutate(
      { routineStartHour: draftStart, routineEndHour: draftEnd },
      {
        onSuccess: () => {
          toast.show('일과 시간을 저장했어요.');
          sheet.current?.dismiss();
        },
        onError: (e) => toast.show(getApiErrorMessage(e, '저장하지 못했어요.')),
      },
    );
  };

  return (
    <RetroCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>🕘 활동 시간</Text>
          <Text style={[styles.value, { color: colors.sub, fontFamily: fonts.chrome }]}>
            {hh(start)} ~ {start > end ? `다음날 ${hh(end)}` : hh(end)}
          </Text>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            AI가 이 시간 안에서 일정·추천을 배치해요
          </Text>
        </View>
        <RetroButton label="변경" size="sm" variant="ghost" onPress={openEditor} />
      </View>

      <BottomSheetModal
        ref={sheet}
        enableDynamicSizing
        backgroundStyle={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        <BottomSheetView style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>하루 시작 시각</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => (
              <Chip key={`s${h}`} label={hh(h)} selected={h === draftStart} onPress={() => setDraftStart(h)} />
            ))}
          </View>
          <Text style={[styles.sheetTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>하루 끝 시각</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => (
              <Chip key={`e${h}`} label={hh(h)} selected={h === draftEnd} onPress={() => setDraftEnd(h)} />
            ))}
          </View>
          {wraps && (
            <Text style={[styles.wrapNote, { color: colors.warn, fontFamily: fonts.body }]}>
              🌙 자정을 넘겨 다음날 새벽 {hh(draftEnd)}까지 이어지는 야행성 일과예요.
            </Text>
          )}
          {draftStart === draftEnd && (
            <Text style={[styles.wrapNote, { color: colors.warn, fontFamily: fonts.body }]}>
              시작과 끝이 같을 수는 없어요.
            </Text>
          )}
          <RetroButton
            label="저장"
            onPress={onSave}
            busy={save.isPending}
            disabled={draftStart === draftEnd}
            style={styles.saveBtn}
          />
        </BottomSheetView>
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
  sheetBody: { padding: 20, paddingBottom: 32, gap: 10 },
  sheetTitle: { fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wrapNote: { fontSize: 12, lineHeight: 18 },
  saveBtn: { marginTop: 8 },
});
