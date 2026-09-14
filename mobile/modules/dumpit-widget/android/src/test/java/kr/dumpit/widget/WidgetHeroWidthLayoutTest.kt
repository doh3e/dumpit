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

        assertTrue(wide.contains("Column(modifier = GlanceModifier.defaultWeight().fillMaxHeight())"))
        assertFalse(wide.contains("Column(modifier = GlanceModifier.width(102.dp))"))
        assertTrue(tall.contains("GlanceModifier.defaultWeight().height(110.dp)"))
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
