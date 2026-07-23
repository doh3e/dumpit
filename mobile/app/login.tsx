import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';
import { getApiErrorMessage } from '../src/api/client';
import { fonts } from '../src/theme/typography';
import { retroShadow } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(getApiErrorMessage(e, '로그인에 실패했어요. 다시 시도해주세요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.logoRow}>
        <Text style={[styles.logo, { color: colors.fg, fontFamily: fonts.displayBold }]}>DUMPIT!</Text>
        <Text style={[styles.star, { color: colors.starlight, fontFamily: fonts.display }]}>★</Text>
      </View>
      <Text style={[styles.tagline, { color: colors.sub, fontFamily: fonts.body }]}>
        생각나면, 일단 덤프.
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
          <Text style={[styles.buttonText, { color: colors.onAccent, fontFamily: fonts.displayBold }]}>
            구글로 시작하기
          </Text>
        )}
      </Pressable>
      <View style={styles.errorSlot}>
        {error && (
          <Text style={[styles.error, { color: colors.warn, fontFamily: fonts.body }]}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { fontSize: 40 },
  star: { fontSize: 18, marginTop: 2, marginLeft: 4 },
  tagline: { fontSize: 15, marginBottom: 28 },
  button: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 200,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16 },
  // 에러 출현으로 버튼이 밀리지 않도록 자리를 항상 확보
  errorSlot: { minHeight: 32, marginTop: 8, justifyContent: 'flex-start' },
  error: { fontSize: 13, textAlign: 'center' },
});
