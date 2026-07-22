import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <Text style={[styles.logo, { color: colors.fg, fontFamily: fonts.displayBold }]}>DUMPIT!</Text>
      <Text style={[styles.tagline, { color: colors.sub, fontFamily: fonts.body }]}>
        생각나면, 일단 덤프.
      </Text>
      <Pressable
        onPress={onPress}
        disabled={busy}
        style={[
          styles.button,
          { backgroundColor: colors.accent, borderColor: colors.edge },
          retroShadow(3, colors.shadowSm),
          busy && { opacity: 0.5 },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.onAccent, fontFamily: fonts.displayBold }]}>
          구글로 시작하기
        </Text>
      </Pressable>
      {error && (
        <Text style={[styles.error, { color: colors.warn, fontFamily: fonts.body }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  logo: { fontSize: 40, letterSpacing: 1 },
  tagline: { fontSize: 15, marginBottom: 28 },
  button: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 28, paddingVertical: 14 },
  buttonText: { fontSize: 16 },
  error: { marginTop: 16, fontSize: 13, textAlign: 'center' },
});
