import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '../src/api/client';
import { INQUIRY_LIMITS, submitInquiry } from '../src/api/inquiry';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { useToast } from '../src/components/retro/ToastProvider';
import { PRIVACY_URL } from '../src/legal/links';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

const SUPPORT_EMAIL = 'dumpitadmin@gmail.com';

export default function InquiryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // 한글 IME 조합이 끊기지 않도록 입력은 uncontrolled로 둔다 (Fabric controlled input 이슈)
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !sending;

  const onSubmit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await submitInquiry(subject.trim(), message.trim());
      toast.show('문의를 보냈어요. 답변은 가입한 이메일로 드릴게요.');
      router.back();
    } catch (e) {
      toast.show(getApiErrorMessage(e, '문의를 보내지 못했어요. 잠시 후 다시 시도해주세요.'));
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="✉️ 문의하기" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <RetroCard style={styles.card}>
            <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.displayBold }]}>제목</Text>
            <TextInput
              defaultValue=""
              onChangeText={setSubject}
              placeholder="무엇을 도와드릴까요?"
              placeholderTextColor={colors.sub}
              maxLength={INQUIRY_LIMITS.subject}
              style={[styles.input, { borderColor: colors.edge, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
            />

            <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.displayBold }]}>내용</Text>
            <TextInput
              defaultValue=""
              onChangeText={setMessage}
              placeholder="겪으신 상황을 자세히 적어주시면 빠르게 확인할 수 있어요."
              placeholderTextColor={colors.sub}
              maxLength={INQUIRY_LIMITS.message}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textarea, { borderColor: colors.edge, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
            />

            <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
              답변은 가입에 사용한 구글 계정 이메일로 보내드려요. 문의 내용과 처리 내역은{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>개인정보처리방침</Text>
              에 따라 처리 완료 후 1년간 보관됩니다.
            </Text>

            <RetroButton label="문의 보내기" onPress={onSubmit} busy={sending} disabled={!canSend} />
          </RetroCard>

          <RetroCard style={styles.card}>
            <Text style={[styles.label, { color: colors.fg, fontFamily: fonts.displayBold }]}>이메일로 문의</Text>
            <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
              앱에서 보내기 어려우면 아래 주소로 직접 보내주셔도 됩니다.
            </Text>
            <Text
              style={[styles.link, { color: colors.accent, fontFamily: fonts.body }]}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            >
              {SUPPORT_EMAIL}
            </Text>
          </RetroCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 16, gap: 12 },
  card: { gap: 8 },
  label: { fontSize: 14 },
  input: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 160 },
  hint: { fontSize: 12, lineHeight: 18 },
  link: { textDecorationLine: 'underline' },
});
