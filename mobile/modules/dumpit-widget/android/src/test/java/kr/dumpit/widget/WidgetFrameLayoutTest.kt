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
    fun `패턴은 24dp 외곽에 남고 정보 표면은 12dp 안전 영역 안에 놓인다`() {
        val actual = retroFrameLayoutModifiers(
            modifier = GlanceModifier,
            background = Color(0xFF1B2617),
            card = Color(0xFF26351F),
            useCardSurface = true,
            showPattern = true,
            contentPadding = 12.dp,
            outerRadius = 24.dp,
        )

        assertEquals(emptyList<PaddingModifier>(), paddingElements(actual.frame))
        assertEquals(listOf(24f), cornerValues(actual.frame))
        assertEquals(emptyList<PaddingModifier>(), paddingElements(requireNotNull(actual.pattern)))
        assertEquals(
            listOf(24f),
            cornerValues(requireNotNull(actual.pattern)),
        )
        assertEquals(
            paddingElements(GlanceModifier.padding(12.dp)),
            paddingElements(actual.contentWrapper),
        )
        assertEquals(emptyList<PaddingModifier>(), paddingElements(requireNotNull(actual.contentSurface)))
        assertEquals(
            listOf(12f),
            cornerValues(requireNotNull(actual.contentSurface)),
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
            contentPadding = 12.dp,
            outerRadius = 24.dp,
        )

        assertNull(actual.pattern)
        assertEquals(
            paddingElements(GlanceModifier.padding(12.dp)),
            paddingElements(actual.contentWrapper),
        )
        assertEquals(emptyList<PaddingModifier>(), paddingElements(requireNotNull(actual.contentSurface)))
        assertEquals(
            listOf(12f),
            cornerValues(requireNotNull(actual.contentSurface)),
        )
    }

    @Test
    fun `솔리드 override도 같은 12dp 안전 여백을 사용한다`() {
        val actual = retroFrameLayoutModifiers(
            modifier = GlanceModifier,
            background = Color(0xFFEF685A),
            card = Color(0xFFFFFDF6),
            useCardSurface = false,
            showPattern = false,
            contentPadding = 12.dp,
            outerRadius = 24.dp,
        )

        assertEquals(emptyList<PaddingModifier>(), paddingElements(actual.frame))
        assertEquals(listOf(24f), cornerValues(actual.frame))
        assertNull(actual.pattern)
        assertEquals(
            paddingElements(GlanceModifier.padding(12.dp)),
            paddingElements(actual.contentWrapper),
        )
        assertNull(actual.contentSurface)
    }

    private fun elements(modifier: GlanceModifier): List<GlanceModifier.Element> =
        modifier.foldIn(emptyList()) { elements, element -> elements + element }

    private fun paddingElements(modifier: GlanceModifier): List<PaddingModifier> =
        elements(modifier).filterIsInstance<PaddingModifier>()

    private fun cornerValues(modifier: GlanceModifier): List<Float> =
        elements(modifier)
            .filter { it.javaClass.simpleName == "CornerRadiusModifier" }
            .map { corner ->
                val radius = corner.javaClass.getMethod("getRadius").invoke(corner)
                val dpGetter = radius.javaClass.methods.single { it.name.startsWith("getDp") }
                dpGetter.invoke(radius) as Float
            }
}
