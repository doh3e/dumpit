package kr.dumpit.widget

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetHeroWidthLayoutTest {
    @Test
    fun `Hero wide와 tall의 정보 영역은 남은 행 너비를 사용한다`() {
        val source = widgetSource()
        val wide = source.section("private fun HeroWide", "private fun RefreshPlanet")
        val tall = source.section("private fun HeroTall", "private fun HeroDetails")

        assertTrue(wide.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertFalse(wide.contains("Column(modifier = GlanceModifier.width(102.dp))"))
        assertTrue(tall.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertFalse(tall.contains("GlanceModifier.width(80.dp).height(110.dp)"))
    }

    @Test
    fun `Hero wide와 tall의 68dp 조작 열은 유지한다`() {
        val source = widgetSource()
        val wide = source.section("private fun HeroWide", "private fun RefreshPlanet")
        val tall = source.section("private fun HeroTall", "private fun HeroDetails")

        assertTrue(wide.contains("Column(modifier = GlanceModifier.width(68.dp))"))
        assertTrue(tall.contains("Column(modifier = GlanceModifier.width(68.dp))"))
    }

    @Test
    fun `Hero wide는 정보와 조작을 같은 안정 ID 스크롤 행으로 유지한다`() {
        val wide = widgetSource().section("private fun HeroWide", "private fun RefreshPlanet")

        assertTrue(wide.contains("LazyColumn(modifier = GlanceModifier.fillMaxSize())"))
        assertTrue(wide.contains("item(itemId = \"state\".hashCode().toLong())"))
        assertTrue(wide.contains("item(itemId = \"hero:${'$'}{snapshot.hero.taskId}\".hashCode().toLong())"))
        assertTrue(wide.contains("items(queue, itemId = { item -> \"queue:${'$'}{item.taskId}\".hashCode().toLong() })"))
        assertTrue(wide.contains("HeroDetails(snapshot.hero, snapshot.suggestionMessage, theme, false, GlanceModifier.defaultWeight())"))
        assertTrue(wide.contains("RefreshPlanet(theme, snapshot, 64.dp, fillHeight = false)"))
        assertTrue(wide.contains("refreshable = snapshot?.hero == null || focusTitle != null, fillHeight = false"))
        assertTrue(wide.contains("Row(modifier = GlanceModifier.fillMaxWidth())"))
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
        assertTrue(tall.contains("RefreshPlanet(theme, snapshot, 64.dp, refreshable = false, fillHeight = false)"))
        assertFalse(tall.contains("height(110.dp)"))
    }

    @Test
    fun `Lazy 행의 행성은 자연 높이를 사용하고 제안 정보도 채우기 높이를 강제하지 않는다`() {
        val source = widgetSource()
        val planet = source.section("private fun RefreshPlanet", "private fun WideSingleInfo")
        val suggestion = source.section("private fun WideSuggestion", "private fun QueueInfo")

        assertTrue(planet.contains("if (fillHeight) it.fillMaxHeight() else it"))
        assertTrue(suggestion.contains("Row(modifier = GlanceModifier.fillMaxWidth())"))
        assertFalse(suggestion.contains("Row(modifier = GlanceModifier.fillMaxSize())"))
    }

    @Test
    fun `자연 높이 정보 열기는 48dp 최소 조작 영역을 보장한다`() {
        val source = widgetSource()
        val singleInfo = source.section("private fun WideSingleInfo", "private fun HeroTall")
        val heroDetails = source.section("private fun HeroDetails", "private fun WideSuggestion")
        val suggestion = source.section("private fun WideSuggestion", "private fun QueueInfo")

        listOf(singleInfo, heroDetails, suggestion).forEach { helper ->
            assertTrue(helper.contains("Spacer(GlanceModifier.fillMaxWidth().height(48.dp))"))
            assertFalse(helper.contains("height(54.dp)"))
            assertFalse(helper.contains("height(110.dp)"))
        }
    }

    private fun widgetSource(): String = sequenceOf(
        "src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "../modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
        "mobile/modules/dumpit-widget/android/src/main/java/kr/dumpit/widget/TodayTasksWidget.kt",
    ).map(::File).firstOrNull(File::isFile)?.readText()
        ?: error("TodayTasksWidget.kt source file was not found")

    private fun String.section(start: String, end: String): String =
        substring(indexOf(start), indexOf(end, indexOf(start)))
}
