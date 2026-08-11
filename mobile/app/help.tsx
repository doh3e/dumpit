import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RetroButton } from '../src/components/retro/RetroButton';
import { RetroCard } from '../src/components/retro/RetroCard';
import { PixelIcon } from '../src/components/common/PixelIcon';
import { ScreenHeader } from '../src/components/shell/ScreenHeader';
import { fonts } from '../src/theme/typography';
import { useTheme } from '../src/theme/useTheme';

// 웹 HelpModal.jsx 정적 콘텐츠 이식 — 문구 변경 시 웹과 동기화
const AI_COST_ROWS = [
  { label: '일일 총 한도', cost: '100점', highlight: true },
  { label: '태스크 추가 및 AI 분석', cost: '1점' },
  { label: '우선순위 재분석', cost: '1점' },
  { label: '서브태스크 제안', cost: '3점' },
  { label: '브레인 덤프 분석', cost: '5점' },
  { label: '아이디어 덤프 AI 분석', cost: '5점' },
  { label: '아이디어 → 태스크 변환', cost: '1점' },
  { label: '그 외 모든 활동', cost: '무료' },
];

const FEATURES = [
  { icon: '📋', title: '대시보드', desc: '태스크를 등록하면 AI가 우선순위를 분석해줘요. 등록한 태스크는 마감 시간과 우선순위에 따라 하루일과표에 등록돼요.' },
  { icon: '🧠', title: '브레인 덤프', desc: '머릿속의 생각을 그대로 쏟아내면 AI가 각각의 독립된 태스크로 변환해줘요.' },
  { icon: '💡', title: '아이디어 덤프', desc: '자유롭게 쏟아낸 생각을 AI가 계층 구조의 아이디어로 정리해줘요. 아이디어는 태스크로 전환할 수 있어요.' },
  { icon: '🔁', title: '루틴', desc: '반복 일정을 설정하면 매일 자동으로 태스크가 생성돼요.' },
  { icon: '🍅', title: '포모도로 타이머', desc: '정해둔 시간만큼 집중 후 휴식! 완료 시 코인을 획득해요.' },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="도움말" icon={<PixelIcon name="question" size={16} />} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <RetroCard style={[styles.card, { backgroundColor: colors.chip }] as never}>
          <Text style={[styles.betaTitle, { color: colors.accent, fontFamily: fonts.displayBold }]}>🎉 베타 서비스 안내</Text>
          <Text style={[styles.betaText, { color: colors.sub, fontFamily: fonts.body }]}>
            Dumpit!은 현재 베타 서비스 중이에요. 모든 활동이 무료인 대신, AI를 활용하는 기능에는 일일 사용량 제한이 있습니다.
          </Text>
        </RetroCard>

        <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>주요 기능</Text>
        {FEATURES.map((f) => (
          <RetroCard key={f.title} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.sub, fontFamily: fonts.body }]}>{f.desc}</Text>
            </View>
          </RetroCard>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.fg, fontFamily: fonts.displayBold }]}>⚡ 일일 AI 사용량 안내</Text>
        <RetroCard style={styles.tableCard}>
          {AI_COST_ROWS.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.tableRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                row.highlight && { backgroundColor: colors.chip, borderRadius: 6 },
              ]}
            >
              <Text style={[styles.tableLabel, { color: row.highlight ? colors.fg : colors.sub, fontFamily: row.highlight ? fonts.bodyBold : fonts.body }]}>
                {row.label}
              </Text>
              <Text style={[styles.tableCost, { color: colors.fg, fontFamily: fonts.chrome }]}>{row.cost}</Text>
            </View>
          ))}
        </RetroCard>
        <Text style={[styles.footnote, { color: colors.sub, fontFamily: fonts.body }]}>매일 자정(KST)에 초기화돼요.</Text>

        <RetroButton label="확인했어요!" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  card: { gap: 6 },
  betaTitle: { fontSize: 13 },
  betaText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 15, marginTop: 8 },
  featureCard: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  featureIcon: { fontSize: 18 },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { fontSize: 13 },
  featureDesc: { fontSize: 12, lineHeight: 17 },
  tableCard: { gap: 0, paddingVertical: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 4, minHeight: 38 },
  tableLabel: { fontSize: 12, flex: 1 },
  tableCost: { fontSize: 12 },
  footnote: { fontSize: 11 },
});
