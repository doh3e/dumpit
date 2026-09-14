package kr.dumpit.widget

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.PaddingModifier
import androidx.glance.layout.padding
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetButtonLayoutTest {
    @Test
    fun `보조 버튼 경계 inset은 외곽 프레임에 적용한다`() {
        val border = Color(0xFF746550)
        val background = Color(0xFFFFFDF6)
        val actual = pixelButtonLayoutModifiers(
            modifier = GlanceModifier,
            primary = false,
            border = border,
            background = background,
        )

        assertEquals(
            paddingElements(GlanceModifier.padding(2.dp)),
            paddingElements(actual.frame),
        )
        assertEquals(
            emptyList<PaddingModifier>(),
            paddingElements(requireNotNull(actual.secondarySurface)),
        )
    }

    @Test
    fun `주 버튼 프레임에는 inset과 내부 표면을 추가하지 않는다`() {
        val border = Color(0xFFEF685A)
        val background = Color(0xFFEF685A)
        val actual = pixelButtonLayoutModifiers(
            modifier = GlanceModifier,
            primary = true,
            border = border,
            background = background,
        )

        assertEquals(
            emptyList<PaddingModifier>(),
            paddingElements(actual.frame),
        )
        assertNull(actual.secondarySurface)
    }

    private fun elements(modifier: GlanceModifier): List<GlanceModifier.Element> =
        modifier.foldIn(emptyList()) { elements, element -> elements + element }

    private fun paddingElements(modifier: GlanceModifier): List<PaddingModifier> =
        elements(modifier).filterIsInstance<PaddingModifier>()
}
