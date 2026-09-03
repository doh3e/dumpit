package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.repository.TaskRepository;
import com.dumpit.service.OpenAiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TasksTodayApiTest extends ApiIntegrationTestBase {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Autowired private TaskRepository taskRepository;

    @BeforeEach
    void stubOpenAi() {
        // POST /tasks 생성 경로가 AI 우선순위 채점을 호출한다 — TaskApiTest와 동일한 안전망
        given(openAiService.scorePriority(any(), any(), any(), any(), any()))
                .willReturn(new OpenAiService.PriorityResult(0.6, "WORK", "테스트 사유"));
        given(openAiService.inferSchedule(any(), any(), any(), any(), any(), any(), any()))
                .willReturn(new OpenAiService.ScheduleInferenceResult(null, null, 30, "테스트 사유"));
    }

    private void createTask(String title, LocalDateTime deadline) throws Exception {
        mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"" + title + "\", \"deadline\": \"" + ISO.format(deadline) + "\"}"))
                .andExpect(status().isCreated());
    }

    /**
     * POST /tasks는 과거 마감을 거부한다(validateFutureDeadline) — OVERDUE 시드는
     * 리포지토리 직접 저장으로 API 유효성 검증을 우회한다(브리핑 노트가 명시한 대안).
     */
    private void seedOverdueTask(String title, LocalDateTime deadline) {
        taskRepository.save(Task.of(userA, title, null, deadline, 30));
    }

    @Test
    void 오늘_자정_이전_미래_마감만_반환한다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        createTask("오늘 마감", now.plusMinutes(30));
        seedOverdueTask("오늘이지만 이미 지남", now.minusMinutes(30));  // OVERDUE — 제외
        createTask("내일 마감", now.plusDays(1).withHour(10));         // TOMORROW — 제외

        mockMvc.perform(get("/tasks/today").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("오늘 마감"));
    }

    @Test
    void 타_유저의_태스크는_보이지_않는다() throws Exception {
        createTask("A의 오늘", LocalDateTime.now().plusMinutes(30));
        mockMvc.perform(get("/tasks/today").with(asUser(USER_B)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
