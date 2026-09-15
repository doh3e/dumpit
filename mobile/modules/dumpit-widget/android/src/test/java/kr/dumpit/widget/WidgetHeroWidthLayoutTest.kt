package kr.dumpit.widget

import java.io.File
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetHeroWidthLayoutTest {
    @Test
    fun `실측 위젯 크기에서 12dp 양쪽 안전 여백을 제외한 너비를 계산한다`() {
        assertEquals(399.dp, widgetSafeContentWidth(423.dp))
        assertEquals(132.dp, widgetSafeContentWidth(156.dp))
        assertEquals(86.dp, widgetSafeContentWidth(110.dp))
    }

    @Test
    fun `실제 compact 반응형 버킷은 stacked와 inline 버튼 경로를 모두 선택한다`() {
        val compactSizes = POMODORO_RESPONSIVE_SIZES
            .filter { pomodoroLayoutFor(it) == PomodoroLayout.Compact }

        assertEquals(setOf(110.dp, 150.dp), compactSizes.map { it.width }.toSet())
        assertEquals(
            setOf(CompactButtonArrangement.Stacked, CompactButtonArrangement.Inline),
            compactSizes.map { compactButtonArrangement(it.width) }.toSet(),
        )
    }

    @Test
    fun `최소 expanded wide의 두 버튼은 48dp 이상이며 라벨 폭을 담는다`() {
        val actionWidth = pomodoroExpandedWideActionWidth(POMODORO_EXPANDED_WIDE.width)
        val buttons = expandedPairedButtonWidths(actionWidth)

        assertEquals(112.dp, actionWidth)
        assertEquals(60.dp, buttons.primary)
        assertEquals(48.dp, buttons.secondary)
        assertTrue(buttons.primary >= pixelButtonLabelWidth("w_t_pause"))
        val secondaryInnerWidth = buttons.secondary - 2.dp - 2.dp
        assertEquals(44.dp, secondaryInnerWidth)
        assertTrue(secondaryInnerWidth >= pixelButtonLabelWidth("w_t_reset"))
    }

    @Test
    fun `compact running은 기존 일시정지와 세트 도트만 유지한다`() {
        val running = pomodoroSource().section("private fun RunningContent", "private fun CompactPausedButtons")

        assertTrue(running.contains("PixelButton(\"w_t_pause\""))
        assertTrue(running.contains("SetDots(snapshot, now, theme)"))
        assertFalse(running.contains("CompactPomodoroButtons"))
        assertFalse(running.contains("CommandParam to \"reset\""))
    }

    @Test
    fun `Hero wide와 tall은 안전 영역에서 정보에 남은 행 너비를 준다`() {
        val source = widgetSource()
        val wide = source.section("private fun HeroWide", "private fun RefreshPlanet")
        val tall = source.section("private fun HeroTall", "private fun HeroDetails")

        assertTrue(wide.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertFalse(wide.contains("Column(modifier = GlanceModifier.width(102.dp))"))
        assertTrue(tall.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertFalse(tall.contains("GlanceModifier.width(80.dp).height(110.dp)"))
    }

    @Test
    fun `Hero 상단 행은 48dp 행성과 중앙 정렬된 완료 조작을 사용한다`() {
        val source = widgetSource()
        val wide = source.section("private fun HeroWide", "private fun RefreshPlanet")
        val tall = source.section("private fun HeroTall", "private fun HeroDetails")

        listOf(wide, tall).forEach { layout ->
            assertTrue(layout.contains("RefreshPlanet(theme, snapshot, 48.dp"))
            assertTrue(layout.contains("contentAlignment = Alignment.Center"))
        }
    }

    @Test
    fun `Hero wide는 정보와 조작을 같은 안정 ID 스크롤 행으로 유지한다`() {
        val wide = widgetSource().section("private fun HeroWide", "private fun RefreshPlanet")

        assertTrue(wide.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertTrue(wide.contains("item(itemId = \"state\".hashCode().toLong())"))
        assertTrue(wide.contains("item(itemId = \"hero:${'$'}{snapshot.hero.taskId}\".hashCode().toLong())"))
        assertTrue(wide.contains("items(queue, itemId = { item -> \"queue:${'$'}{item.taskId}\".hashCode().toLong() })"))
        assertTrue(wide.contains("HeroDetails(snapshot.hero, snapshot.suggestionMessage, theme, false, GlanceModifier.defaultWeight())"))
        assertTrue(wide.contains("RefreshPlanet(theme, snapshot, 48.dp, fillHeight = false)"))
        assertTrue(wide.contains("refreshable = snapshot?.hero == null || focusTitle != null, fillHeight = false"))
        assertTrue(wide.contains("Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically)"))
        assertFalse(wide.contains("Row(modifier = GlanceModifier.fillMaxSize())"))
        assertFalse(wide.contains("height(54.dp)"))
    }

    @Test
    fun `Hero tall은 고정 110dp 대신 안정 ID 스크롤 행을 사용한다`() {
        val tall = widgetSource().section("private fun HeroTall", "private fun HeroDetails")

        assertTrue(tall.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertTrue(tall.contains("item(itemId = \"hero:${'$'}{snapshot.hero.taskId}\".hashCode().toLong())"))
        assertTrue(tall.contains("items(queue, itemId = { item -> \"queue:${'$'}{item.taskId}\".hashCode().toLong() })"))
        assertTrue(tall.contains("HeroDetails(snapshot.hero, snapshot.suggestionMessage, theme, true, GlanceModifier.defaultWeight())"))
        assertTrue(tall.contains("RefreshPlanet(theme, snapshot, 48.dp, fillHeight = false)"))
        assertFalse(tall.contains("height(110.dp)"))
    }

    @Test
    fun `행성 자체가 새로고침 조작이고 별도 새로고침 아이콘은 없다`() {
        val source = widgetSource()
        val planet = source.section("private fun RefreshPlanet", "private fun WideSingleInfo")

        assertTrue(planet.contains("if (fillHeight) it.fillMaxHeight() else it"))
        assertTrue(planet.contains("GlanceModifier.size(size)"))
        assertTrue(planet.contains("contentDescription = \"오늘 할 일 새로고침\""))
        assertFalse(planet.contains("w_i_refresh"))
    }

    @Test
    fun `다음 항목은 라벨 배지 제목 체크박스를 한 행에 둔다`() {
        val source = widgetSource()
        val queueInfo = source.section("private fun QueueInfo", "private fun QueueToggle")

        assertTrue(queueInfo.contains("Row(modifier = GlanceModifier.fillMaxSize()"))
        assertTrue(queueInfo.contains("Text(item.title, maxLines = 1"))
        assertTrue(queueInfo.contains("modifier = GlanceModifier.defaultWeight()"))
        assertFalse(queueInfo.contains("Column"))
    }

    private fun widgetSource(): String = sequenceOf(
        "src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "../modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "mobile/modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
    ).map(::File).firstOrNull(File::isFile)?.readText()
        ?: error("TodayTasksWidget.kt source file was not found")

    private fun pomodoroSource(): String = sequenceOf(
        "src/main/java/kr/dumpit/widget/PomodoroWidget.kt",
        "../modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/PomodoroWidget.kt",
        "modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/PomodoroWidget.kt",
        "mobile/modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/PomodoroWidget.kt",
    ).map(::File).firstOrNull(File::isFile)?.readText()
        ?: error("PomodoroWidget.kt source file was not found")

    private fun String.section(start: String, end: String): String =
        substring(indexOf(start), indexOf(end, indexOf(start)))
}
