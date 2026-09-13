import Constants from 'expo-constants';
import { useRef, useState } from 'react';
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
import { PixelIcon, type PixelIconName } from '../src/components/common/PixelIcon';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { useA11yPrefs, useThemeMode, type ContrastMode, type ThemeMode } from '../src/theme/ThemeProvider';
import { useTheme } from '../src/theme/useTheme';

const THEME_MODES: { id: ThemeMode; label: string; icon: PixelIconName }[] = [
  { id: 'light', label: '라이트', icon: 'sun' },
  { id: 'dark', label: '다크', icon: 'moon' },
  { id: 'system', label: '시스템', icon: 'phone' },
];

const CONTRAST_MODES: { id: ContrastMode; label: string }[] = [
  { id: 'system', label: '시스템' },
  { id: 'high', label: '고대비' },
  { id: 'normal', label: '기본' },
];

function WithdrawalControls({
  colors,
  fonts,
  signOut,
  showError,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  fonts: ReturnType<typeof useTheme>['fonts'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  showError: (message: string) => void;
}) {
  const [withdrawStage, setWithdrawStage] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

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
      await deleteAccount();
      await signOut({ afterWithdrawal: true });
    } catch (error) {
      showError(getApiErrorMessage(error, '탈퇴 처리에 실패했어요.'));
      setWithdrawing(false);
    }
  };

  return (
    <>
      {withdrawStage ? (
        <>
          <Text style={[styles.hint, { color: colors.warnText, fontFamily: fonts.body }]}>
            정말 탈퇴하시려면 아래에 &quot;탈퇴&quot;를 입력해주세요.
          </Text>
          {/* 한글 IME 조합 보호 — uncontrolled */}
          <TextInput
            defaultValue=""
            onChangeText={setConfirmText}
            placeholder="탈퇴"
            placeholderTextColor={colors.subOnChip}
            style={[styles.input, { borderColor: colors.warn, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
            accessibilityLabel="탈퇴 확인 입력"
          />
          <View style={styles.withdrawActions}>
            <RetroButton appearance="refined" label="취소" variant="ghost" size="sm" onPress={() => { setWithdrawStage(false); setConfirmText(''); }} />
            <RetroButton appearance="refined"
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
        <RetroButton appearance="refined" label="회원 탈퇴" variant="danger" size="sm" onPress={startWithdraw} />
      )}
    </>
  );
}

export default function SettingsScreen() {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { preferencesReady: themePreferencesReady, mode, setMode } = useThemeMode();
  const {
    preferencesReady: a11yPreferencesReady,
    contrastMode,
    setContrastMode,
    boldText,
    setBoldText,
  } = useA11yPrefs();
  const { me, signOut } = useAuth();
  const toast = useToast();

  const boldLabel = boldText ? '켬' : '끔';

  const [preferencePending, setPreferencePending] = useState(false);
  const preferencePendingRef = useRef(false);
  const [preferenceFeedback, setPreferenceFeedback] = useState<'success' | 'error' | null>(null);
  const preferencesReady = themePreferencesReady && a11yPreferencesReady;

  const saveDevicePreference = async (save: () => Promise<void>) => {
    if (!preferencesReady || preferencePendingRef.current) return;
    preferencePendingRef.current = true;
    setPreferencePending(true);
    setPreferenceFeedback(null);
    try {
      await save();
      setPreferenceFeedback('success');
    } catch {
      setPreferenceFeedback('error');
    } finally {
      preferencePendingRef.current = false;
      setPreferencePending(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="설정" icon={<PixelIcon name="gear" size={16} />} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <RetroCard appearance="refined" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            <PixelIcon name="palette" size={13} /> 테마
          </Text>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            선택하면 바로 적용되고 이 기기에 저장돼요.
          </Text>
          <View style={styles.chipRow}>
            {THEME_MODES.map((m) => (
              <Chip
                appearance="refined"
                key={m.id}
                label={m.label}
                icon={<PixelIcon name={m.icon} size={12} />}
                selected={mode === m.id}
                disabled={!preferencesReady || preferencePending}
                onPress={() => { void saveDevicePreference(() => setMode(m.id)); }}
              />
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            글자 크기는 휴대폰 시스템 설정을 따라요.
          </Text>
          <Text accessibilityRole="header" style={[styles.subTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>대비</Text>
          <View style={styles.chipRow}>
            {CONTRAST_MODES.map((m) => (
              // 테마 그리드에도 '시스템' 칩이 있어 라벨만으로는 어느 그룹인지 갈린다
              <Chip
                appearance="refined"
                key={m.id}
                label={m.label}
                accessibilityLabel={`대비 ${m.label}`}
                selected={contrastMode === m.id}
                disabled={!preferencesReady || preferencePending}
                onPress={() => { void saveDevicePreference(() => setContrastMode(m.id)); }}
              />
            ))}
          </View>
          <Text accessibilityRole="header" style={[styles.subTitle, { color: colors.sub, fontFamily: fonts.chrome }]}>굵은 글자</Text>
          <View style={styles.chipRow}>
            <Chip
              appearance="refined"
              label={boldLabel}
              accessibilityLabel={`굵은 글자 ${boldLabel}`}
              selected={boldText}
              disabled={!preferencesReady || preferencePending}
              onPress={() => { void saveDevicePreference(() => setBoldText(!boldText)); }}
            />
          </View>
          <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
            &apos;시스템&apos;은 휴대폰의 고대비 텍스트 설정을 따라요. 이 설정은 이 기기에만 저장돼요.
          </Text>
          {preferenceFeedback && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.feedback,
                { color: preferenceFeedback === 'error' ? colors.dangerText : colors.sub, fontFamily: fonts.body },
              ]}
            >
              {preferenceFeedback === 'error' ? '이 기기에 저장하지 못했어요.' : '이 기기에 저장했어요.'}
            </Text>
          )}
        </RetroCard>

        <ActiveHoursCard />

        <NotificationSettingsCard />

        <RetroCard appearance="refined" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
            <PixelIcon name="user" size={13} /> 계정
          </Text>
          <RetroButton appearance="refined" label="로그아웃" variant="ghost" onPress={confirmSignOut} />
          <WithdrawalControls
            key={me?.email ?? 'signed-out'}
            colors={colors}
            fonts={fonts}
            signOut={signOut}
            showError={toast.error}
          />
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
  feedback: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  subTitle: { fontSize: 11, marginTop: 6 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  withdrawActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  version: { fontSize: 11, textAlign: 'center', marginTop: 6 },
});
