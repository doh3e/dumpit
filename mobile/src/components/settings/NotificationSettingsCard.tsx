import { useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { useSaveSettings, useUserSettings } from '../../query/routineHooks';
import { useTheme } from '../../theme/useTheme';
import { Chip } from '../retro/Chip';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';
import { NOTIFICATION_THRESHOLDS, toggleThreshold } from './notificationOptions';
import { PixelIcon } from '../common/PixelIcon';

/** 알림 설정 카드 — 서버 /me/settings 소비, 마감 임계값·아침 브리핑 즉시 저장 */
export function NotificationSettingsCard() {
  const { colors, fonts } = useTheme();
  const { data: settings } = useUserSettings();
  const save = useSaveSettings();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  if (!settings) return null;

  const patch = (p: Parameters<typeof save.mutate>[0]) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    save.mutate(p, {
      onSuccess: () => setFeedback({ kind: 'success', message: '계정에 저장했어요.' }),
      onError: (e) => {
        const message = getApiErrorMessage(e, '저장하지 못했어요.');
        setFeedback({ kind: 'error', message });
        toast.error(message);
      },
      onSettled: () => {
        pendingRef.current = false;
        setPending(false);
      },
    });
  };

  return (
    <RetroCard appearance="refined" style={styles.card}>
      <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
        <PixelIcon name="bell" size={13} /> 알림
      </Text>
      <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
        바꾸면 바로 계정에 저장돼요.
      </Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.body }]}>알림 받기</Text>
        <Switch
          value={settings.notificationsEnabled}
          disabled={pending}
          onValueChange={(v) => patch({ notificationsEnabled: v })}
          trackColor={{ false: colors.line, true: colors.accent2 }}
          thumbColor={colors.card}
          accessibilityLabel="알림 받기 스위치"
        />
      </View>
      {settings.notificationsEnabled && (
        <>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            처음 감지 시는 항상 알려드려요. 추가로 받을 시점을 선택하세요.
          </Text>
          <View style={styles.chipRow}>
            {NOTIFICATION_THRESHOLDS.map((t) => (
              <Chip
                appearance="refined" key={t.min}
                label={t.label}
                selected={settings.notificationThresholds.includes(t.min)}
                disabled={pending}
                onPress={() => patch({ notificationThresholds: toggleThreshold(settings.notificationThresholds, t.min) })}
              />
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.body }]}>아침 브리핑</Text>
              <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
                활동 시작 시각에 오늘 할 일 요약을 받아요. 밤사이 억제된 알림도 여기에 합산돼요.
              </Text>
            </View>
            <Switch
              value={settings.briefingEnabled}
              disabled={pending}
              onValueChange={(v) => patch({ briefingEnabled: v })}
              trackColor={{ false: colors.line, true: colors.accent2 }}
              thumbColor={colors.card}
              accessibilityLabel="아침 브리핑 스위치"
            />
          </View>
        </>
      )}
      {feedback && (
        <Text
          accessibilityLiveRegion={feedback.kind === 'error' ? 'assertive' : 'polite'}
          style={[
            styles.feedback,
            { color: feedback.kind === 'error' ? colors.dangerText : colors.sub, fontFamily: fonts.body },
          ]}
        >
          {feedback.message}
        </Text>
      )}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  sectionTitle: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textCol: { flex: 1, gap: 4 },
  label: { fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { fontSize: 12, lineHeight: 18 },
  feedback: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
});
