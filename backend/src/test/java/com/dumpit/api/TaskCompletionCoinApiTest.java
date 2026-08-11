package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 완료 코인은 리스트 미리보기(DTO의 PriorityCalculator 실시간 값)와 같은 수식·같은 입력이어야 한다.
 * 회귀 배경: calcCompletionCoins가 원시 중요도(user??ai)를 써서 표시 19 / 지급 24 어긋남 (2026-07-23).
 */
class TaskCompletionCoinApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;

    private Task seed(User user, Double userScore, Double aiScore) {
        Task task = Task.of(user, "코인 검증", null, null, null); // 마감 없음 → 긴급도 0.15 고정(결정적)
        task.setUserPriorityScore(userScore);
        task.setAiPriorityScore(aiScore);
        return taskRepository.save(task);
    }

    private void complete(Task task, int expectedCoins) throws Exception {
        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "DONE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coinsGranted").value(expectedCoins));
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(expectedCoins));
    }

    @Test
    void 완료코인은_긴급도_합성값으로_계산된다_AI점수() throws Exception {
        // p = 0.6*0.15 + 0.4*0.5 = 0.29 → 10 + 0.29*40 = 21 (원시 ai 0.5였다면 30)
        complete(seed(userA, null, 0.5), 21);
    }

    @Test
    void 완료코인은_긴급도_합성값으로_계산된다_지정점수() throws Exception {
        // p = max(0.4, 0.6*0.15 + 0.4*0.4) = 0.4 → 10 + 16 = 26
        complete(seed(userA, 0.4, null), 26);
    }
}
