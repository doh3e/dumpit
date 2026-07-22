package com.dumpit.service.impl;

import com.dumpit.common.ActiveHours;
import com.dumpit.dto.TaskPlanningResponse;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.service.TaskService;
import com.dumpit.service.UserSettingsService;
import org.junit.jupiter.api.BeforeEach;
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
    private final UserSettingsService userSettingsService = mock(UserSettingsService.class);
    private final TaskPlanningServiceImpl planningService =
            new TaskPlanningServiceImpl(taskService, userSettingsService);
    private final User user = User.of(EMAIL, "tester", "google", "pid");

    @BeforeEach
    void setUp() {
        when(userSettingsService.activeHours(EMAIL)).thenReturn(ActiveHours.DEFAULT);
    }

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

    @Test
    void 태스크는_마감에_따라_6개_버킷으로_나뉜다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task overdue = task("지난 일", Task.Category.WORK);
        overdue.setDeadline(LocalDateTime.of(2026, 7, 11, 9, 0));
        Task today = task("오늘 일", Task.Category.WORK);
        today.setDeadline(LocalDateTime.of(2026, 7, 11, 22, 0));
        Task tomorrow = task("내일 일", Task.Category.WORK);
        tomorrow.setDeadline(LocalDateTime.of(2026, 7, 12, 22, 0));
        Task week = task("일주일 일", Task.Category.WORK);
        week.setDeadline(LocalDateTime.of(2026, 7, 16, 12, 0));
        Task later = task("먼 일", Task.Category.WORK);
        later.setDeadline(LocalDateTime.of(2026, 8, 1, 12, 0));
        Task someday = task("언젠가 일", Task.Category.HOBBY);
        givenTasks(overdue, today, tomorrow, week, later, someday);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.overdue()).extracting("title").containsExactly("지난 일");
        assertThat(sections.today()).extracting("title").containsExactly("오늘 일");
        assertThat(sections.tomorrow()).extracting("title").containsExactly("내일 일");
        assertThat(sections.next7Days()).extracting("title").containsExactly("일주일 일");
        assertThat(sections.later()).extracting("title").containsExactly("먼 일");
        assertThat(sections.someday()).extracting("title").containsExactly("언젠가 일");
    }

    @Test
    void 내일_자정_마감은_내일_버킷_모레_마감은_일주일_버킷이다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task tomorrowMidnight = task("내일 자정 일", Task.Category.WORK);
        tomorrowMidnight.setDeadline(LocalDateTime.of(2026, 7, 12, 0, 0));
        Task dayAfter = task("모레 일", Task.Category.WORK);
        dayAfter.setDeadline(LocalDateTime.of(2026, 7, 13, 0, 0));
        givenTasks(tomorrowMidnight, dayAfter);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.today()).isEmpty();
        assertThat(sections.tomorrow()).extracting("title").containsExactly("내일 자정 일");
        assertThat(sections.next7Days()).extracting("title").containsExactly("모레 일");
    }

    @Test
    void 칠일째_마감은_일주일_버킷_팔일째_마감은_그외_버킷이다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task seventh = task("칠일째 일", Task.Category.WORK);
        seventh.setDeadline(LocalDateTime.of(2026, 7, 18, 23, 59));
        Task eighth = task("팔일째 일", Task.Category.WORK);
        eighth.setDeadline(LocalDateTime.of(2026, 7, 19, 0, 0));
        givenTasks(seventh, eighth);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.next7Days()).extracting("title").containsExactly("칠일째 일");
        assertThat(sections.later()).extracting("title").containsExactly("팔일째 일");
    }

    @Test
    void 언젠가_버킷은_중요도_내림차순으로_정렬된다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 11, 10, 0);
        Task low = task("덜 중요한 언젠가", Task.Category.HOBBY);
        low.setAiPriorityScore(0.2);
        Task high = task("더 중요한 언젠가", Task.Category.WORK);
        high.setAiPriorityScore(0.9);
        givenTasks(low, high);

        TaskPlanningResponse.TaskPlanningSections sections =
                planningService.getPlanning(EMAIL, now).sections();

        assertThat(sections.someday()).extracting("title")
                .containsExactly("더 중요한 언젠가", "덜 중요한 언젠가");
    }

    @Test
    void 활동시간_밖에는_수면_제안이_뜬다() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 8, 23, 30); // 기본 9~22 밖
        givenTasks();

        TaskPlanningResponse res = planningService.getPlanning(EMAIL, now);

        assertThat(res.nowSuggestion().type()).isEqualTo("SLEEP");
        assertThat(res.nowSuggestion().task()).isNull();
    }

    @Test
    void 활동_시작_두시간은_하루_시작_종료_전_두시간은_마무리다() {
        givenTasks();

        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 8, 9, 30))
                .nowSuggestion().type()).isEqualTo("DAY_START");
        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 8, 20, 30))
                .nowSuggestion().type()).isEqualTo("DAY_END");
    }

    @Test
    void 야행성은_낮이_수면_밤이_하루_시작_새벽이_마무리다() {
        when(userSettingsService.activeHours(EMAIL)).thenReturn(new ActiveHours(22, 6));
        givenTasks();

        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 8, 14, 0))
                .nowSuggestion().type()).isEqualTo("SLEEP");
        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 8, 22, 30))
                .nowSuggestion().type()).isEqualTo("DAY_START");
        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 9, 4, 30))
                .nowSuggestion().type()).isEqualTo("DAY_END");
    }

    @Test
    void 야행성의_점심시간은_식사가_아니라_수면이다() {
        when(userSettingsService.activeHours(EMAIL)).thenReturn(new ActiveHours(22, 6));
        givenTasks();

        assertThat(planningService.getPlanning(EMAIL, LocalDateTime.of(2026, 7, 8, 12, 0))
                .nowSuggestion().type()).isEqualTo("SLEEP");
    }
}
