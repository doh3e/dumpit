import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { describeError, type ErrorInfo } from '../src/api/errors';
import { useAuth } from '../src/auth/AuthContext';
import { GoogleGIcon } from '../src/components/common/GoogleGIcon';
import { PRIVACY_URL, TERMS_URL } from '../src/legal/links';
import { fonts } from '../src/theme/typography';
import { retroShadow } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

// 스플래시와 같은 투명 배경 토성 로고 — 별도 에셋을 추가하지 않는다
const LOGO = require('../assets/images/splash-icon.png');

// 문구는 웹 랜딩(frontend/src/pages/HomePage.jsx)과 글자 단위로 같아야 한다 — 바꿀 때 양쪽 동시 수정
export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const info = describeError(e, '로그인에 실패했어요. 다시 시도해주세요.');
      if (!info.silent) setError(info);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="덤핏 로고" />
      <Text style={[styles.headline, { color: colors.fg, fontFamily: fonts.bodyBold }]}>
        생각을 쏟아내면, AI가 정리해드려요
      </Text>
      <Text style={[styles.body, { color: colors.sub, fontFamily: fonts.body }]}>
        해야 할 일들이 우주먼지처럼 뒤엉켜 있나요?
      </Text>
      <Text style={[styles.shout, { color: colors.accent, fontFamily: fonts.chrome }]}>
        그냥 다 쏟아내세요!
      </Text>
      <Text style={[styles.body, { color: colors.sub, fontFamily: fonts.body }]}>
        덤핏이 <Text style={styles.underline}>AI</Text>를 통해 우선순위를 정하고{'\n'}
        할 일을 알기 쉽게 정리해드려요.
      </Text>

      <Pressable
        onPress={onPress}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, borderColor: colors.edge },
          // 웹 .btn-retro:active 재현 — 3px 밀리며 오프셋 섀도가 접힌다
          pressed
            ? { transform: [{ translateX: 3 }, { translateY: 3 }], boxShadow: `0px 0px 0px ${colors.shadowSm}` }
            : retroShadow(3, colors.shadowSm),
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <View style={styles.buttonContent}>
            <GoogleGIcon size={20} />
            <Text style={[styles.buttonText, { color: colors.onAccent, fontFamily: fonts.displayBold }]}>
              Google로 시작하기
            </Text>
          </View>
        )}
      </Pressable>
      <View style={styles.errorSlot}>
        {error && (
          <>
            <Text style={[styles.error, { color: colors.warn, fontFamily: fonts.body }]}>{error.message}</Text>
            {error.code && (
              <Text selectable style={[styles.errorCode, { color: colors.sub, fontFamily: fonts.chrome }]}>
                오류 코드 {error.code}
              </Text>
            )}
          </>
        )}
      </View>

      {/* 동의 고지 — 웹 로그인 화면과 동일한 문구 체계. 만 14세 미만은 이용할 수 없다(약관 제4조) */}
      <Text style={[styles.consent, { color: colors.sub, fontFamily: fonts.body }]}>
        로그인하면 만 14세 이상이며{' '}
        <Text style={styles.consentLink} onPress={() => Linking.openURL(TERMS_URL)}>
          서비스 이용약관
        </Text>
        {' '}및{' '}
        <Text style={styles.consentLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
          개인정보처리방침
        </Text>
        에 동의하는 것으로 간주됩니다.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  logo: { width: 220, height: 220, marginBottom: 4 },
  headline: { fontSize: 19, letterSpacing: 0.3, textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  shout: { fontSize: 28, lineHeight: 36, textAlign: 'center', marginVertical: 12 },
  underline: { textDecorationLine: 'underline' },
  button: {
    marginTop: 32,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 220,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { fontSize: 16 },
  // 에러 출현으로 버튼이 밀리지 않도록 자리를 항상 확보 (문구 줄 + 코드 줄)
  errorSlot: { minHeight: 48, marginTop: 8, alignItems: 'center', gap: 4 },
  error: { fontSize: 13, textAlign: 'center', maxWidth: 300 },
  errorCode: { fontSize: 12, textAlign: 'center' },
  consent: { fontSize: 11, lineHeight: 17, textAlign: 'center', maxWidth: 300, marginTop: 8 },
  consentLink: { textDecorationLine: 'underline' },
});
