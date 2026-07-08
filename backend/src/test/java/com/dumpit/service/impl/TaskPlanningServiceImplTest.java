package com.dumpit.service.impl;

import com.dumpit.dto.TaskPlanningResponse;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.service.TaskService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TaskPlanningServiceImplTest {

    private static final String EMAIL = "user@test.com";

    private final TaskService taskService = mock(TaskService.class);
    private final TaskPlanningServiceImpl planningService = new TaskPlanningServiceImpl(taskService);
    private final User user = User.of(EMAIL, "tester", "google", "pid");

    private Task task(String title, Task.Category category) {
        Task t = Task.of(user, title, null, null, null);
        t.setCategory(category);
        t.setAiPriorityScore(0.5);
        return t;
    }

    private void givenTasks(Task... tasks) {
        when(taskService.getTasksForUser(eq(EMAIL), anyInt())).thenReturn(List.of(tasks));
    }

    @Test
    void 마감에서_파생된_시간슬롯_태스크는_지금_할_일로_추천된다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 8, 16, 0);
        Task t = task("보고서 쓰기", Task.Category.WORK);
        t.setDeadline(LocalDateTime.of(2026, 7, 8, 23, 59));
        t.setEstimatedMinutes(120);
        t.setStartTime(LocalDateTime.of(2026, 7, 8, 21, 59));
        t.setEndTime(LocalDateTime.of(2026, 7, 8, 23, 59));
        t.setIsLocked(false);
        givenTasks(t);

        TaskPlanningResponse res = planningService.getPlanning(EMAIL, now);

        assertThat(res.focusRecommendations()).isNotEmpty();
        assertThat(res.nowSuggestion().task()).isNotNull();
        assertThat(res.nowSuggestion().task().title()).isEqualTo("보고서 쓰기");
    }

    @Test
    void 사용자가_시간을_고정한_내일_일정은_지금_추천되지_않는다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 8, 16, 0);
        Task t = task("부트캠프 출석", Task.Category.WORK);
        t.setDeadline(LocalDateTime.of(2026, 7, 9, 18, 30));
        t.setStartTime(LocalDateTime.of(2026, 7, 9, 8, 0));
        t.setEndTime(LocalDateTime.of(2026, 7, 9, 18, 30));
        t.setIsLocked(true);
        givenTasks(t);

        TaskPlanningResponse res = planningService.getPlanning(EMAIL, now);

        assertThat(res.focusRecommendations()).isEmpty();
        assertThat(res.nowSuggestion().task()).isNull();
    }

    @Test
    void 식사_시간대에도_추천_태스크는_함께_내려온다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 8, 12, 0);
        Task t = task("보고서 쓰기", Task.Category.WORK);
        t.setDeadline(LocalDateTime.of(2026, 7, 8, 23, 59));
        t.setEstimatedMinutes(120);
        t.setStartTime(LocalDateTime.of(2026, 7, 8, 21, 59));
        t.setEndTime(LocalDateTime.of(2026, 7, 8, 23, 59));
        t.setIsLocked(false);
        givenTasks(t);

        TaskPlanningResponse res = planningService.getPlanning(EMAIL, now);

        assertThat(res.nowSuggestion().type()).isEqualTo("MEAL");
        assertThat(res.nowSuggestion().task()).isNotNull();
    }

    @Test
    void 시작시간만_있는_루틴은_그_시간대에_지금_진행_중으로_뜬다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 8, 7, 5);
        Task t = task("아침약 먹기", Task.Category.ROUTINE);
        t.setDeadline(LocalDateTime.of(2026, 7, 8, 23, 59));
        t.setStartTime(LocalDateTime.of(2026, 7, 8, 7, 0));
        givenTasks(t);

        TaskPlanningResponse res = planningService.getPlanning(EMAIL, now);

        assertThat(res.nowSuggestion().type()).isEqualTo("CURRENT_EVENT");
        assertThat(res.nowSuggestion().task()).isNotNull();
        assertThat(res.nowSuggestion().task().title()).isEqualTo("아침약 먹기");
    }
}
