import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../src/api/client';
import { deleteAccount } from '../src/api/profile';
import { useAuth } from '../src/auth/AuthContext';
import { Chip } from '../src/components/retro/Chip';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { useToast } from '../src/components/retro/ToastProvider';
import { ActiveHoursCard } from '../src/components/routine/ActiveHoursCard';
import { NotificationSettingsCard } from '../src/components/settings/NotificationSettingsCard';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { useThemeMode, type ThemeMode } from '../src/theme/ThemeProvider';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

const THEME_MODES: { id: ThemeMode; label: string; emoji: string }[] = [
  { id: 'light', label: '라이트', emoji: '☀️' },
  { id: 'dark', label: '다크', emoji: '🌙' },
  { id: 'system', label: '시스템', emoji: '📱' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useThemeMode();
  const { signOut } = useAuth();
  const toast = useToast();

  const [withdrawStage, setWithdrawStage] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  };

  const startWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 바로 이용할 수 없고 기록도 볼 수 없어요.\n\n30일 안에 같은 구글 계정으로 다시 로그인하면 되돌릴 수 있어요. 30일이 지나면 완전히 삭제됩니다.\n\n계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '계속', style: 'destructive', onPress: () => setWithdrawStage(true) },
      ],
    );
  };

  const doWithdraw = async () => {
    setWithdrawing(true);
    try {
      await deleteAccount();          // 서버가 계정을 잠그고 30일 뒤 완전 삭제를 예약
      await signOut();                // 구글 세션 해제 + 로컬 정리 → 로그인 화면
    } catch (e) {
      toast.show(getApiErrorMessage(e, '탈퇴 처리에 실패했어요.'));
      setWithdrawing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="⚙️ 설정" />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <RetroCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>🎨 테마</Text>
          <View style={styles.chipRow}>
            {THEME_MODES.map((m) => (
              <Chip key={m.id} label={m.label} emoji={m.emoji} selected={mode === m.id} onPress={() => setMode(m.id)} />
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            글자 크기는 휴대폰 시스템 설정을 따라요.
          </Text>
        </RetroCard>

        <ActiveHoursCard />

        <NotificationSettingsCard />

        <RetroCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>👤 계정</Text>
          <RetroButton label="로그아웃" variant="ghost" onPress={confirmSignOut} />
          {withdrawStage ? (
            <>
              <Text style={[styles.hint, { color: colors.warn, fontFamily: fonts.body }]}>
                정말 탈퇴하시려면 아래에 "탈퇴"를 입력해주세요.
              </Text>
              {/* 한글 IME 조합 보호 — uncontrolled */}
              <TextInput
                defaultValue=""
                onChangeText={setConfirmText}
                placeholder="탈퇴"
                placeholderTextColor={colors.sub}
                style={[styles.input, { borderColor: colors.warn, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
              />
              <View style={styles.withdrawActions}>
                <RetroButton label="취소" variant="ghost" size="sm" onPress={() => { setWithdrawStage(false); setConfirmText(''); }} />
                <RetroButton
                  label="영구 탈퇴"
                  variant="danger"
                  size="sm"
                  onPress={doWithdraw}
                  busy={withdrawing}
                  disabled={confirmText.trim() !== '탈퇴'}
                />
              </View>
            </>
          ) : (
            <RetroButton label="회원 탈퇴" variant="danger" size="sm" onPress={startWithdraw} />
          )}
        </RetroCard>

        <Text style={[styles.version, { color: colors.sub, fontFamily: fonts.chrome }]}>
          DumpIt! v{Constants.expoConfig?.version ?? '?'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { gap: 10 },
  sectionTitle: { fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  withdrawActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  version: { fontSize: 11, textAlign: 'center', marginTop: 6 },
});
