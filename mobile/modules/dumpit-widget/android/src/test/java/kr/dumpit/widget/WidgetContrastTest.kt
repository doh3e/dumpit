package kr.dumpit.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetContrastTest {
    @Test
    fun `상대 휘도는 WCAG의 sRGB 감마 2점4를 따른다`() {
        assertEquals(
            4.478089453577214,
            WidgetContrast.contrastRatio(0xFF777777L, 0xFFFFFFFFL),
            0.000001,
        )
    }

    @Test
    fun `낮은 대비의 보조색은 배경에서 4점5 대 1 이상이 된다`() {
        val original = 0xFF8C7C66L
        val background = 0xFFF7EFDFL
        val adjusted = WidgetContrast.ensureMinimumContrast(original, background)

        assertTrue(WidgetContrast.contrastRatio(original, background) < 4.5)
        assertEquals(0xFF796B58L, adjusted)
        assertTrue(WidgetContrast.contrastRatio(adjusted, background) >= 4.5)
    }

    @Test
    fun `낮은 대비의 버튼 글자는 액센트에서 4점5 대 1 이상이 된다`() {
        val accent = 0xFFD95F52L
        val adjusted = WidgetContrast.ensureMinimumContrast(0xFFFFFBF0L, accent)

        assertTrue(WidgetContrast.contrastRatio(adjusted, accent) >= 4.5)
    }

    @Test
    fun `이미 충분히 읽기 쉬운 글자색은 유지한다`() {
        val foreground = 0xFF33271EL
        val background = 0xFFFFFDF6L

        assertEquals(foreground, WidgetContrast.ensureMinimumContrast(foreground, background))
    }

    @Test
    fun `낮은 대비의 보조 버튼 경계는 카드에서 3 대 1 이상이 된다`() {
        val original = 0xFFE0D2B6L
        val background = 0xFFFFFDF6L
        val adjusted = WidgetContrast.secondaryButtonBorder(original, background)

        assertTrue(WidgetContrast.contrastRatio(original, background) < 3.0)
        assertTrue(WidgetContrast.contrastRatio(adjusted, background) >= 3.0)
    }
}
