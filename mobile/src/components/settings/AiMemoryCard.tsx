import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getApiErrorMessage } from '../../api/client';
import { useSaveSettings, useUserSettings } from '../../query/routineHooks';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { PixelIcon } from '../common/PixelIcon';
import { RetroButton } from '../retro/RetroButton';
import { RetroCard } from '../retro/RetroCard';
import { useToast } from '../retro/ToastProvider';

const MAX_LENGTH = 500;

/** AI 메모리 카드 — /me/settings.aiMemory 소비. 저장한 컨텍스트는 서버가 AI 분석 프롬프트에 주입한다 */
export function AiMemoryCard() {
  const { colors } = useTheme();
  const { data: settings } = useUserSettings();
  const save = useSaveSettings();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (!settings) return null;
  const memory = settings.aiMemory ?? '';

  const startEdit = () => {
    setDraft(memory);
    setEditing(true);
  };

  const saveMemory = () => {
    setSaving(true);
    save.mutate({ aiMemory: draft.trim() }, {
      onSuccess: () => setEditing(false),
      onError: (e) => toast.show(getApiErrorMessage(e, 'AI 메모리를 저장하지 못했어요.')),
      onSettled: () => setSaving(false),
    });
  };

  return (
    <RetroCard style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>
          <PixelIcon name="sparkle" size={13} /> AI 메모리
        </Text>
        {!editing && (
          <Pressable onPress={startEdit} accessibilityRole="button" accessibilityLabel="AI 메모리 편집" hitSlop={8}>
            <Text style={[styles.editLabel, { color: colors.sub, fontFamily: fonts.chrome }]}>수정</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.hint, { color: colors.sub, fontFamily: fonts.body }]}>
        우선순위 기준, 자주 쓰는 용어, 생활 패턴을 적어두면 AI가 할 일과 아이디어를 분석할 때 참고해요.
      </Text>
      {editing ? (
        <>
          {/* 한글 IME 조합 보호 — uncontrolled */}
          <TextInput
            defaultValue={memory}
            onChangeText={setDraft}
            maxLength={MAX_LENGTH}
            multiline
            placeholder={'예) 운동 관련 일이 나에게 제일 중요해요.\n예) "펌"은 회사 프로젝트를 뜻해요.'}
            placeholderTextColor={colors.sub}
            style={[styles.input, { borderColor: colors.line, backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.body }]}
          />
          <View style={styles.actions}>
            <Text style={[styles.counter, { color: colors.sub, fontFamily: fonts.chrome }]}>
              {draft.length}/{MAX_LENGTH}
            </Text>
            <RetroButton label="취소" variant="ghost" size="sm" onPress={() => setEditing(false)} />
            <RetroButton label="저장" size="sm" onPress={saveMemory} busy={saving} />
          </View>
        </>
      ) : (
        <Pressable onPress={startEdit} accessibilityRole="button" accessibilityLabel="AI 메모리 편집">
          <Text style={[styles.memory, { color: memory ? colors.fg : colors.sub, fontFamily: fonts.body }]}>
            {memory || '저장된 AI 메모리가 없어요'}
          </Text>
        </Pressable>
      )}
    </RetroCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14 },
  editLabel: { fontSize: 12 },
  hint: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 88, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  counter: { fontSize: 11, marginRight: 'auto' },
  memory: { fontSize: 13, lineHeight: 19 },
});
