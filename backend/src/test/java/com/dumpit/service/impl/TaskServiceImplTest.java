package com.dumpit.service.impl;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.exception.BadRequestException;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.ActivityLogService;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.DeadlineNudgeService;
import com.dumpit.service.OpenAiService;
import com.dumpit.service.ShopService;
import com.dumpit.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TaskServiceImplTest {

    private static final String EMAIL = "user@test.com";

    private final TaskRepository taskRepository = mock(TaskRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final OpenAiService openAiService = mock(OpenAiService.class);
    private final DeadlineNudgeService deadlineNudgeService = mock(DeadlineNudgeService.class);
    private final AiUsageService aiUsageService = mock(AiUsageService.class);
    private final ActivityLogService activityLogService = mock(ActivityLogService.class);
    private final ShopService shopService = mock(ShopService.class);

    private final TaskServiceImpl taskService = new TaskServiceImpl(
            taskRepository, userRepository, openAiService,
            deadlineNudgeService, aiUsageService, activityLogService, shopService);

    @BeforeEach
    void setUp() {
        when(userRepository.findByEmail(EMAIL))
                .thenReturn(Optional.of(User.of(EMAIL, "tester", "google", "pid")));
        when(openAiService.scorePriority(any(), any(), any(), any()))
                .thenReturn(new OpenAiService.PriorityResult(0.5, "WORK", "테스트"));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void 마감만_입력하면_시작시간을_역산하지_않는다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(null, null, 120, "추론"));
        LocalDateTime deadline = LocalDateTime.now().plusHours(8);

        Task saved = taskService.createTask(EMAIL, "보고서 쓰기", null,
                deadline, null, null, null, null, Task.Category.WORK, false);

        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEndTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(120);
        assertThat(saved.getIsLocked()).isFalse();
    }

    @Test
    void 시작과_마감이_모두_있으면_예상시간을_간격으로_파생하지_않는다() {
        // n박 일정: 파생이 있으면 4320분이 계산돼 1440분 검증에서 BadRequest가 터진다
        LocalDateTime start = LocalDateTime.now().plusHours(1);
        LocalDateTime deadline = LocalDateTime.now().plusDays(3);

        Task saved = taskService.createTask(EMAIL, "제주 여행", null,
                deadline, null, start, null, null, Task.Category.OTHER, false);

        assertThat(saved.getEstimatedMinutes()).isNull();
        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getDeadline()).isEqualTo(deadline);
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }

    @Test
    void 마감과_예상시간이_있으면_시작시간을_역산하지_않는다() {
        LocalDateTime deadline = LocalDateTime.now().plusHours(8);

        Task saved = taskService.createTask(EMAIL, "보고서 쓰기", null,
                deadline, 90, null, null, null, Task.Category.WORK, false);

        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEndTime()).isNull();
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }

    @Test
    void 예상시간만_입력하면_단서_없을때_마감이_생기지_않는다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(null, null, null, "단서 없음"));

        Task saved = taskService.createTask(EMAIL, "기타 연습", null,
                null, 60, null, null, null, Task.Category.OTHER, false);

        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(60);
    }

    @Test
    void 시작시간을_직접_입력한_태스크는_고정된다() {
        LocalDateTime start = LocalDateTime.now().plusHours(2);
        LocalDateTime deadline = LocalDateTime.now().plusHours(4);

        Task saved = taskService.createTask(EMAIL, "회의", null,
                deadline, null, start, null, null, Task.Category.WORK, false);

        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getIsLocked()).isTrue();
    }

    @Test
    void updateSticker_null코드는_검증없이_해제한다() {
        User user = User.of(EMAIL, "tester", "google", "pid");
        Task task = Task.of(user, "할 일", null, null, null);
        task.setStickerCode("sticker.cat");
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));

        Task saved = taskService.updateSticker(EMAIL, taskId, null);

        verify(shopService, never()).assertOwnsSticker(any(), any());
        assertThat(saved.getStickerCode()).isNull();
    }

    @Test
    void updateSticker_미보유_스티커는_예외이고_저장하지_않는다() {
        User user = User.of(EMAIL, "tester", "google", "pid");
        Task task = Task.of(user, "할 일", null, null, null);
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));
        doThrow(new BadRequestException("보유하지 않은 스티커입니다."))
                .when(shopService).assertOwnsSticker(any(), any());

        assertThrows(BadRequestException.class,
                () -> taskService.updateSticker(EMAIL, taskId, "sticker.cat"));

        verify(taskRepository, never()).save(any());
    }

    @Test
    void 언젠가_선언시_AI가_마감을_돌려줘도_버린다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(
                        "2099-01-01T10:00:00", "2099-01-01T12:00:00", 45, "추론"));

        Task saved = taskService.createTask(EMAIL, "언젠가 기타 배우기", null,
                null, null, null, null, null, Task.Category.OTHER, true);

        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(45);
    }

    @Test
    void 언젠가_선언시_예상시간이_있으면_AI를_호출하지_않는다() {
        Task saved = taskService.createTask(EMAIL, "책 읽기", null,
                null, 30, null, null, null, Task.Category.OTHER, true);

        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getEstimatedMinutes()).isEqualTo(30);
    }

    @Test
    void 언젠가_선언시_직접_입력한_시작시간은_보존된다() {
        LocalDateTime start = LocalDateTime.now().plusDays(2);

        Task saved = taskService.createTask(EMAIL, "동창 모임", null,
                null, 90, start, null, null, Task.Category.OTHER, true);

        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getIsLocked()).isTrue();
    }

    @Test
    void 언젠가와_마감을_동시에_보내면_예외() {
        assertThrows(BadRequestException.class, () ->
                taskService.createTask(EMAIL, "모순", null,
                        LocalDateTime.now().plusDays(1), null, null, null, null, Task.Category.OTHER, true));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void 수정에서_언젠가로_전환하면_재추론이_마감을_되살리지_않는다() {
        User user = User.of(EMAIL, "tester", "google", "pid");
        Task task = Task.of(user, "보고서", null, LocalDateTime.now().plusDays(1), 60);
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findActiveById(taskId)).thenReturn(Optional.of(task));

        Task saved = taskService.updateTask(EMAIL, taskId, new TaskService.TaskUpdateFields(
                null, null, false,      // title, description, hasDescription
                null, null, false,      // status, userPriorityScore, hasUserPriorityScore
                null, true,             // deadline(null 명시), hasDeadline
                null, false,            // estimatedMinutes, hasEstimatedMinutes
                null, false,            // startTime, hasStartTime
                null, false,            // endTime, hasEndTime
                null, false,            // isLocked, hasIsLocked
                null,                   // category
                true                    // noDeadline
        ));

        assertThat(saved.getDeadline()).isNull();
        // 기존 예상시간(60분)이 있으므로 AI 재추론 자체가 불필요
        verify(openAiService, never()).inferSchedule(any(), any(), any(), any(), any());
    }

    @Test
    void AI가_시작과_마감을_같은_시각으로_추론하면_시작시간을_버린다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(
                        "2099-01-02T15:00:00", "2099-01-02T15:00:00", 60, "회의 추론"));

        Task saved = taskService.createTask(EMAIL, "내일 3시 회의", null,
                null, null, null, null, null, Task.Category.WORK, false);

        assertThat(saved.getStartTime()).isNull();
        assertThat(saved.getDeadline()).isEqualTo(LocalDateTime.parse("2099-01-02T15:00:00"));
        assertThat(saved.getEstimatedMinutes()).isEqualTo(60);
    }

    @Test
    void 유저_시작시간과_모순되는_추론_마감은_버린다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(
                        null, "2099-01-01T09:00:00", 30, "모순 추론"));
        LocalDateTime start = LocalDateTime.parse("2099-01-02T10:00:00");

        Task saved = taskService.createTask(EMAIL, "발표 준비", null,
                null, null, start, null, null, Task.Category.WORK, false);

        assertThat(saved.getStartTime()).isEqualTo(start);
        assertThat(saved.getDeadline()).isNull();
        assertThat(saved.getIsLocked()).isTrue();
    }
}
