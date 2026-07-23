import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clampSettings, type PomodoroSettings } from '../../pomodoro/engine';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { RetroButton } from '../retro/RetroButton';

type Props = {
  initial: PomodoroSettings;
  onApply: (s: PomodoroSettings) => void;
};

type RowProps = {
  label: string;
  value: number;
  display?: string;
  onDelta: (d: number) => void;
};

function StepperRow({ label, value, display, onDelta }: RowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.fg, fontFamily: fonts.body }]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onDelta(-1)} hitSlop={8} accessibilityLabel={`${label} 줄이기`}
          style={[styles.stepBtn, { borderColor: colors.line, backgroundColor: colors.chip }]}>
          <Text style={[styles.stepText, { color: colors.fg, fontFamily: fonts.chrome }]}>−</Text>
        </Pressable>
        <Text style={[styles.value, { color: colors.fg, fontFamily: fonts.chrome }]}>{display ?? value}</Text>
        <Pressable onPress={() => onDelta(1)} hitSlop={8} accessibilityLabel={`${label} 늘리기`}
          style={[styles.stepBtn, { borderColor: colors.line, backgroundColor: colors.chip }]}>
          <Text style={[styles.stepText, { color: colors.fg, fontFamily: fonts.chrome }]}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 뽀모도로 설정 시트 — 실행 중에는 열지 않는다(설정 변경 = 리셋 후 재시작 정책) */
export const PomodoroSettingsSheet = forwardRef<BottomSheetModal, Props>(
  function PomodoroSettingsSheet({ initial, onApply }, ref) {
    const { colors } = useTheme();
    const [draft, setDraft] = useState(initial);

    const patch = (p: Partial<PomodoroSettings>) => setDraft((d) => clampSettings({ ...d, ...p }));

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        onDismiss={() => setDraft(initial)}
        backgroundStyle={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.edge }}
        handleIndicatorStyle={{ backgroundColor: colors.line }}
      >
        <BottomSheetView style={styles.body}>
          <Text style={[styles.title, { color: colors.fg, fontFamily: fonts.displayBold }]}>타이머 설정</Text>
          <StepperRow label="집중 (분)" value={draft.focusMin} onDelta={(d) => patch({ focusMin: draft.focusMin + d * 5 })} />
          <StepperRow label="휴식 (분)" value={draft.breakMin} onDelta={(d) => patch({ breakMin: draft.breakMin + d })} />
          <StepperRow label="세트 수" value={draft.setsTarget} display={draft.setsTarget === 0 ? '∞' : String(draft.setsTarget)}
            onDelta={(d) => patch({ setsTarget: draft.setsTarget + d })} />
          {draft.setsTarget !== 1 && (
            <>
              <StepperRow label="긴 휴식 (분)" value={draft.longBreakMin} onDelta={(d) => patch({ longBreakMin: draft.longBreakMin + d * 5 })} />
              <StepperRow label="긴 휴식 주기 (세트)" value={draft.longBreakEvery} onDelta={(d) => patch({ longBreakEvery: draft.longBreakEvery + d })} />
            </>
          )}
          <RetroButton label="적용" onPress={() => onApply(draft)} style={styles.apply} />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32, gap: 12 },
  title: { fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 34, height: 34, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 16 },
  value: { fontSize: 14, minWidth: 32, textAlign: 'center' },
  apply: { marginTop: 8 },
});
