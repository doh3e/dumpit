package kr.dumpit.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class WidgetPresentationTest {
    @Test
    fun `집중 라벨은 첫 회차와 서로 다른 후속 회차를 그대로 표시한다`() {
        listOf(1, 2, 3, 12).forEach { index ->
            assertEquals(
                PomodoroPhaseLabel(index, "w_t_nth_focus"),
                pomodoroPhaseLabel(PomodoroPhase("FOCUS", index, false, 0L, 60_000L)),
            )
        }
    }

    @Test
    fun `휴식 라벨은 집중 회차 없이 일반 휴식과 긴 휴식을 구분한다`() {
        val rest = PomodoroPhase("REST", 3, false, 0L, 60_000L)

        assertEquals(PomodoroPhaseLabel(null, "w_t_rest"), pomodoroPhaseLabel(rest))
        assertEquals(PomodoroPhaseLabel(null, "w_t_rest_long"), pomodoroPhaseLabel(rest.copy(long = true)))
        assertEquals(
            PomodoroPhaseLabel(null, "w_t_rest_long"),
            pomodoroPhaseLabel(rest.copy(kind = "REST_LONG", long = true)),
        )
    }

    @Test
    fun `집중 종류는 긴 휴식 플래그보다 우선한다`() {
        assertEquals(
            PomodoroPhaseLabel(2, "w_t_nth_focus"),
            pomodoroPhaseLabel(PomodoroPhase("FOCUS", 2, true, 0L, 60_000L)),
        )
    }

    @Test
    fun `스냅샷이 없으면 로그인을 안내한다`() {
        assertSame(WideHeroPresentation.Login, wideHeroPresentation(null, null))
    }

    @Test
    fun `집중 제목이 있으면 집중 상태를 우선한다`() {
        assertEquals(
            WideHeroPresentation.Focus("보고서 작성"),
            wideHeroPresentation(snapshot(allDone = true), "보고서 작성"),
        )
    }

    @Test
    fun `오늘 할 일을 모두 마치면 전체 완료를 안내한다`() {
        assertSame(WideHeroPresentation.AllDone, wideHeroPresentation(snapshot(allDone = true), null))
    }

    @Test
    fun `미완료인데 현재 할 일이 없으면 서버 제안을 보여준다`() {
        val presentation = wideHeroPresentation(
            snapshot(
                allDone = false,
                suggestionTitle = "잠깐 숨을 고르세요",
                suggestionMessage = "5분 뒤 가벼운 일부터 시작해볼까요?",
            ),
            null,
        )

        assertTrue(presentation is WideHeroPresentation.Suggestion)
        presentation as WideHeroPresentation.Suggestion
        assertEquals("잠깐 숨을 고르세요", presentation.snapshot.suggestionTitle)
        assertEquals("5분 뒤 가벼운 일부터 시작해볼까요?", presentation.snapshot.suggestionMessage)
    }

    private fun snapshot(
        allDone: Boolean,
        suggestionTitle: String? = null,
        suggestionMessage: String? = null,
    ) = HeroSnapshot(
        updatedAt = 0L,
        loggedIn = true,
        allDone = allDone,
        todayDone = if (allDone) 1 else 0,
        todayTotal = 1,
        hero = null,
        suggestionTitle = suggestionTitle,
        suggestionMessage = suggestionMessage,
        queue = emptyList(),
    )
}
