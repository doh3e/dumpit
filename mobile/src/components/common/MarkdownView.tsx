import Markdown from 'react-native-markdown-display';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

/** 아이디어·공지 본문 마크다운 렌더 — 헤딩·리스트·강조·코드·링크 최소셋을 테마 토큰으로 */
export function MarkdownView({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Markdown
      style={{
        body: { color: colors.fg, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
        heading1: { color: colors.fg, fontFamily: fonts.displayBold, fontSize: 20, marginTop: 8, marginBottom: 4 },
        heading2: { color: colors.fg, fontFamily: fonts.displayBold, fontSize: 17, marginTop: 8, marginBottom: 4 },
        heading3: { color: colors.fg, fontFamily: fonts.displayBold, fontSize: 15, marginTop: 6, marginBottom: 3 },
        strong: { fontFamily: fonts.bodyBold },
        link: { color: colors.accent2, textDecorationLine: 'underline' },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        code_inline: {
          backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.chrome,
          paddingHorizontal: 4, borderRadius: 4, fontSize: 13,
        },
        code_block: {
          backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.chrome,
          padding: 10, borderRadius: 8, fontSize: 12, borderWidth: 1, borderColor: colors.line,
        },
        fence: {
          backgroundColor: colors.chip, color: colors.fg, fontFamily: fonts.chrome,
          padding: 10, borderRadius: 8, fontSize: 12, borderWidth: 1, borderColor: colors.line,
        },
        blockquote: {
          backgroundColor: colors.chip, borderLeftWidth: 3, borderLeftColor: colors.accent2,
          paddingHorizontal: 10, paddingVertical: 4,
        },
        hr: { backgroundColor: colors.line, height: 1.5 },
      }}
    >
      {children}
    </Markdown>
  );
}
