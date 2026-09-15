package kr.dumpit.widget

import java.io.File
import java.io.DataInputStream
import javax.xml.parsers.DocumentBuilderFactory
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.SizeMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetHeroWidthLayoutTest {
    @Test
    fun `실제 크기에서 총 20dp 양쪽 여백을 제외한다`() {
        assertEquals(383.dp, widgetSafeContentWidth(423.dp))
        assertEquals(210.dp, widgetSafeContentWidth(250.dp))
        assertEquals(140.dp, widgetSafeContentWidth(180.dp))
        assertEquals(0.dp, widgetSafeContentWidth(30.dp))
    }

    @Test
    fun `이전 작은 Hero 인스턴스는 정상 내용을 잘라 표시하지 않는다`() {
        listOf(DpSize(150.dp, 110.dp), DpSize(250.dp, 169.dp), DpSize(249.dp, 400.dp)).forEach {
            assertEquals(HeroLayout.ResizeRequired, heroLayoutFor(it))
            assertEquals(0, heroQueueRows(it))
        }
        assertEquals(HeroLayout.Wide, heroLayoutFor(HERO_MIN_SIZE))
    }

    @Test
    fun `Hero 큐 개수는 실제 높이 170 250 310 경계에 맞춘다`() {
        listOf(170 to 1, 249 to 1, 250 to 2, 309 to 2, 310 to 3, 600 to 3).forEach { (height, rows) ->
            assertEquals(rows, heroQueueRows(DpSize(250.dp, height.dp)))
        }
        assertEquals(HeroLayout.Tall, heroLayoutFor(DpSize(250.dp, 250.dp)))
    }

    @Test
    fun `Pomo는 가로가 넓어도 최소 세로 높이를 지킨다`() {
        listOf(DpSize(110.dp, 110.dp), DpSize(179.dp, 400.dp), DpSize(500.dp, 259.dp)).forEach {
            assertEquals(PomodoroLayout.ResizeRequired, pomodoroLayoutFor(it))
        }
        assertEquals(PomodoroLayout.ExpandedTall, pomodoroLayoutFor(POMODORO_MIN_SIZE))
        assertEquals(PomodoroLayout.ExpandedTall, pomodoroLayoutFor(DpSize(319.dp, 260.dp)))
        assertEquals(PomodoroLayout.ExpandedWide, pomodoroLayoutFor(DpSize(320.dp, 260.dp)))
    }

    @Test
    fun `Pomo 최소 내부 높이에 헤더 링 태스크 간격 조작이 모두 들어간다`() {
        assertEquals(220.dp, pomodoroTallContentHeight(true))
        assertEquals(widgetContentSize(POMODORO_MIN_SIZE.height, WIDGET_CONTENT_INSET), pomodoroTallContentHeight(true))
        assertEquals(184.dp, pomodoroTallContentHeight(false))
        assertEquals(128.dp, expandedTallPairedActionWidth())
        assertTrue(expandedTallPairedActionWidth() <= widgetSafeContentWidth(POMODORO_MIN_SIZE.width))
        assertEquals(10.dp, POMODORO_HEADER_GAP)
        assertEquals(8.dp, POMODORO_TASK_GAP)
        assertEquals(14.dp, POMODORO_BUTTON_GAP)
    }

    @Test
    fun `Pomo 헤더 실제 에셋과 모드 배지는 최소 내부 폭과 높이에 들어간다`() {
        listOf(
            Triple("w_t_pomodoro", POMODORO_TITLE_HEIGHT, POMODORO_TITLE_WIDTH),
            Triple("w_t_mode_focus", POMODORO_MODE_HEIGHT, POMODORO_MODE_WIDTH),
            Triple("w_t_mode_break", POMODORO_MODE_HEIGHT, POMODORO_MODE_WIDTH),
        ).forEach { (name, height, width) ->
            val (assetWidth, assetHeight) = pngDimensions(resourceFile("src/main/res/drawable-nodpi/$name.png"))
            assertEquals(height.value * assetWidth / assetHeight, width.value, 0.001f)
        }
        val headerWidth = POMODORO_TITLE_WIDTH + POMODORO_MODE_WIDTH + POMODORO_MODE_PADDING * 2 + 2.dp
        assertTrue(headerWidth + 3.dp <= widgetSafeContentWidth(POMODORO_MIN_SIZE.width))
        assertEquals(POMODORO_HEADER_HEIGHT, POMODORO_MODE_HEIGHT + 4.dp + 2.dp)
    }

    @Test
    fun `Hero 큰 글자와 최소 높이는 제목 한 줄로 큐 공간을 확보한다`() {
        assertEquals(2, heroTitleMaxLines(showSuggestion = true, fontScale = 1.001f))
        assertEquals(1, heroTitleMaxLines(showSuggestion = true, fontScale = 1.5f))
        assertEquals(1, heroTitleMaxLines(showSuggestion = false, fontScale = 1f))
        assertEquals(1, heroTitleMaxLines(showSuggestion = false, fontScale = 1.5f))
    }

    @Test
    fun `두 위젯은 호스트의 실제 크기를 사용한다`() {
        assertEquals(SizeMode.Exact, TodayTasksWidget().sizeMode)
        assertEquals(SizeMode.Exact, PomodoroWidget().sizeMode)
    }

    @Test
    fun `provider 최소 크기와 크기 안내 경계가 일치한다`() {
        assertProvider("today_tasks", HERO_MIN_SIZE, 4, 2)
        assertProvider("pomodoro", POMODORO_MIN_SIZE, 3, 3)
    }

    private fun assertProvider(name: String, minSize: DpSize, columns: Int, rows: Int) {
        val factory = DocumentBuilderFactory.newInstance().apply { isNamespaceAware = true }
        val provider = factory.newDocumentBuilder().parse(resourceFile("src/main/res/xml/${name}_widget_info.xml")).documentElement
        fun attr(name: String) = provider.getAttributeNS("http://schemas.android.com/apk/res/android", name)
        assertEquals("${minSize.width.value.toInt()}dp", attr("minWidth"))
        assertEquals(attr("minWidth"), attr("minResizeWidth"))
        assertEquals("${minSize.height.value.toInt()}dp", attr("minHeight"))
        assertEquals(attr("minHeight"), attr("minResizeHeight"))
        assertEquals(columns.toString(), attr("targetCellWidth"))
        assertEquals(rows.toString(), attr("targetCellHeight"))
    }

    private fun resourceFile(relative: String): File =
        sequenceOf("", "../modules/dumpit-widget/android/", "modules/dumpit-widget/android/", "mobile/modules/dumpit-widget/android/")
            .map { File(it + relative) }.first(File::isFile)

    private fun pngDimensions(file: File): Pair<Int, Int> =
        DataInputStream(file.inputStream()).use { input ->
            assertEquals(0x89504E47.toInt(), input.readInt())
            assertEquals(0x0D0A1A0A, input.readInt())
            assertEquals(13, input.readInt())
            assertEquals(0x49484452, input.readInt())
            input.readInt() to input.readInt()
        }
}
