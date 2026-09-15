package kr.dumpit.widget

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.PaddingModifier
import androidx.glance.layout.height
import androidx.glance.layout.width
import androidx.glance.layout.padding
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetButtonLayoutTest {
    @Test
    fun `텍스트 버튼은 48dp 터치영역과 34dp 표면을 분리한다`() {
        listOf("w_t_start", "w_t_pause", "w_t_resume", "w_t_complete").forEach { label ->
            val touchWidth = pixelButtonTouchWidth(label)
            val surfaceWidth = pixelButtonSurfaceWidth(label)
            val actual = pixelButtonLayoutModifiers(
                GlanceModifier.width(touchWidth), true, Color.Red, Color.Red, surfaceWidth,
            )
            assertEquals(dimensions(GlanceModifier.width(touchWidth).height(48.dp)), dimensions(actual.touchTarget))
            assertEquals(dimensions(GlanceModifier.width(surfaceWidth).height(34.dp)), dimensions(actual.frame))
            assertTrue(elements(actual.touchTarget).none { it.javaClass.simpleName.contains("Background") })
            assertNull(actual.secondarySurface)
            assertTrue((surfaceWidth - pixelButtonLabelWidth(label)) / 2f >= 6.dp)
        }
        assertEquals(80.dp, pixelButtonTouchWidth("w_t_start"))
        assertEquals(72.dp, pixelButtonSurfaceWidth("w_t_start"))
        assertEquals(72.dp, pixelButtonTouchWidth("w_t_pause"))
        assertEquals(64.dp, pixelButtonSurfaceWidth("w_t_pause"))
    }

    @Test
    fun `초기화 버튼은 48dp 터치와 34dp 보조 표면 및 안쪽 경계를 사용한다`() {
        val actual = pixelButtonLayoutModifiers(GlanceModifier.width(48.dp), false, Color.Black, Color.White, 34.dp)
        assertEquals(dimensions(GlanceModifier.width(48.dp).height(48.dp)), dimensions(actual.touchTarget))
        assertEquals(dimensions(GlanceModifier.width(34.dp).height(34.dp)), dimensions(actual.frame))
        assertEquals(padding(GlanceModifier.padding(2.dp)), padding(actual.frame))
        assertEquals(emptyList<PaddingModifier>(), padding(requireNotNull(actual.secondarySurface)))
    }

    @Test
    fun `12dp 픽셀 문구는 원본 에셋 비율을 유지한다`() {
        assertEquals(12f * 162 / 33, pixelButtonLabelWidth("w_t_start").value, 0.001f)
        assertEquals(12f * 141 / 33, pixelButtonLabelWidth("w_t_pause").value, 0.001f)
        assertEquals(pixelButtonLabelWidth("w_t_pause"), pixelButtonLabelWidth("w_t_complete"))
        assertEquals(12f * 72 / 33, pixelButtonLabelWidth("w_t_resume").value, 0.001f)
    }

    private fun elements(modifier: GlanceModifier): List<GlanceModifier.Element> =
        modifier.foldIn(emptyList()) { elements, element -> elements + element }

    private fun dimensions(modifier: GlanceModifier): List<Pair<String, Float>> =
        listOf("Width", "Height").map { axis ->
            val element = elements(modifier).single { it.javaClass.simpleName == "${axis}Modifier" }
            val dimension = element.javaClass.getMethod("get$axis").invoke(element)
            val dpGetter = dimension.javaClass.methods.single { it.name.startsWith("getDp") }
            axis to (dpGetter.invoke(dimension) as Float)
        }

    private fun padding(modifier: GlanceModifier) = elements(modifier).filterIsInstance<PaddingModifier>()
}
