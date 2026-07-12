package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PomodoroNotificationApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;

    private Task seedTask(User user, String title, LocalDateTime deadline) {
        Task task = Task.of(user, title, null, deadline, 30);
        return taskRepository.save(task);
    }

    // ---------- POST /pomodoro/complete ----------

    @Test
    void 완료_focusMinutes_25면_코인5개_지급_및_잔액반영() throws Exception {
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.totalCoins").value(5));

        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5));
    }

    @Test
    void 완료_body없으면_기본25분으로_코인5개() throws Exception {
        mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(5))
                .andExpect(jsonPath("$.totalCoins").value(5));
    }

    @Test
    void 완료_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("focusMinutes", 25))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 완료_잘못된_JSON본문이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/pomodoro/complete").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{이건 JSON이 아님"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /notifications/deadline-nudges ----------

    @Test
    void 넛지_마감임박태스크만_반환_Redis없이_degrade() throws Exception {
        Task soon = seedTask(userA, "곧 마감", LocalDateTime.now().plusHours(3));
        seedTask(userA, "먼 마감", LocalDateTime.now().plusDays(10));
        seedTask(userB, "B의 임박 태스크", LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/notifications/deadline-nudges").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].taskId").value(soon.getTaskId().toString()))
                .andExpect(jsonPath("$[0].title").value("곧 마감"))
                .andExpect(jsonPath("$[0].remainingMinutes").exists())
                .andExpect(jsonPath("$[0].overdue").value(false));
    }

    @Test
    void 넛지_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/notifications/deadline-nudges"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }
}
