package kr.dumpit.widget

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.PaddingModifier
import androidx.glance.layout.padding
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetFrameLayoutTest {
    @Test
    fun `패턴 위젯은 패턴을 줄이지 않고 투명 wrapper와 card surface에 inset을 나눈다`() {
        val actual = retroFrameLayoutModifiers(
            modifier = GlanceModifier,
            background = Color(0xFF1B2617),
            card = Color(0xFF26351F),
            useCardSurface = true,
            showPattern = true,
            contentPadding = 2.dp,
        )

        assertEquals(emptyList<PaddingModifier>(), paddingElements(actual.frame))
        assertEquals(emptyList<PaddingModifier>(), paddingElements(requireNotNull(actual.pattern)))
        assertEquals(
            paddingElements(GlanceModifier.padding(2.dp)),
            paddingElements(actual.contentWrapper),
        )
        assertEquals(
            paddingElements(GlanceModifier.padding(2.dp)),
            paddingElements(requireNotNull(actual.contentSurface)),
        )
    }

    @Test
    fun `패턴이 없는 기본 위젯도 card 정보 표면을 유지한다`() {
        val actual = retroFrameLayoutModifiers(
            modifier = GlanceModifier,
            background = Color(0xFF1F1B2E),
            card = Color(0xFF2B2442),
            useCardSurface = true,
            showPattern = false,
            contentPadding = 2.dp,
        )

        assertNull(actual.pattern)
        assertEquals(
            paddingElements(GlanceModifier.padding(2.dp)),
            paddingElements(actual.contentWrapper),
        )
        assertEquals(
            paddingElements(GlanceModifier.padding(2.dp)),
            paddingElements(requireNotNull(actual.contentSurface)),
        )
    }

    @Test
    fun `솔리드 override는 패턴과 내부 surface 없이 기존 너비별 inset을 유지한다`() {
        for (contentPadding in listOf(2.dp, 4.dp)) {
            val actual = retroFrameLayoutModifiers(
                modifier = GlanceModifier,
                background = Color(0xFFEF685A),
                card = Color(0xFFFFFDF6),
                useCardSurface = false,
                showPattern = false,
                contentPadding = contentPadding,
            )

            assertEquals(emptyList<PaddingModifier>(), paddingElements(actual.frame))
            assertNull(actual.pattern)
            assertEquals(
                paddingElements(GlanceModifier.padding(contentPadding)),
                paddingElements(actual.contentWrapper),
            )
            assertNull(actual.contentSurface)
        }
    }

    private fun elements(modifier: GlanceModifier): List<GlanceModifier.Element> =
        modifier.foldIn(emptyList()) { elements, element -> elements + element }

    private fun paddingElements(modifier: GlanceModifier): List<PaddingModifier> =
        elements(modifier).filterIsInstance<PaddingModifier>()
}
