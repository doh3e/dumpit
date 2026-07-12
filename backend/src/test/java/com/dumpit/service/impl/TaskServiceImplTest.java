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
    void 마감만_입력한_태스크는_시작시간이_파생되어도_고정되지_않는다() {
        when(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .thenReturn(new OpenAiService.ScheduleInferenceResult(null, null, 120, "추론"));
        LocalDateTime deadline = LocalDateTime.now().plusHours(8);

        Task saved = taskService.createTask(EMAIL, "보고서 쓰기", null,
                deadline, null, null, null, null, Task.Category.WORK);

        assertThat(saved.getStartTime()).isEqualTo(deadline.minusMinutes(120));
        assertThat(saved.getEndTime()).isEqualTo(deadline);
        assertThat(saved.getIsLocked()).isFalse();
    }

    @Test
    void 시작시간을_직접_입력한_태스크는_고정된다() {
        LocalDateTime start = LocalDateTime.now().plusHours(2);
        LocalDateTime deadline = LocalDateTime.now().plusHours(4);

        Task saved = taskService.createTask(EMAIL, "회의", null,
                deadline, null, start, null, null, Task.Category.WORK);

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
}
