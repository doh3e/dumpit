package kr.dumpit.widget

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetThemeStartupTest {
    @Test
    fun `새 위젯의 Glance 테마가 비어 있으면 저장된 다크 테마를 쓴다`() {
        val stored = """{"mode":"dark","bgSkin":null,"pomoSkin":null,"planet":null}"""

        assertEquals(stored, themeJsonForRender(currentStateJson = null, startupJson = stored))
    }

    @Test
    fun `새 위젯의 Glance 테마가 비어 있으면 저장된 장착 스킨을 쓴다`() {
        val stored = """{"mode":"dark","bgSkin":"galaxy","pomoSkin":"ocean","planet":"ringed"}"""

        assertEquals(stored, themeJsonForRender(currentStateJson = null, startupJson = stored))
    }

    @Test
    fun `세션 중 변경된 Glance 테마가 최초 저장 테마보다 우선한다`() {
        val startup = """{"mode":"dark","bgSkin":"galaxy","pomoSkin":"ocean","planet":"ringed"}"""
        val current = """{"mode":"light","bgSkin":null,"pomoSkin":null,"planet":null}"""

        assertEquals(current, themeJsonForRender(currentStateJson = current, startupJson = startup))
    }

    @Test
    fun `로그아웃 기본 테마가 세션 시작 때의 장착 스킨을 되살리지 않는다`() {
        val startup = """{"mode":"dark","bgSkin":"galaxy","pomoSkin":"ocean","planet":"ringed"}"""
        val loggedOut = """{"mode":"system","bgSkin":null,"pomoSkin":null,"planet":null}"""

        assertEquals(loggedOut, themeJsonForRender(currentStateJson = loggedOut, startupJson = startup))
    }
}
