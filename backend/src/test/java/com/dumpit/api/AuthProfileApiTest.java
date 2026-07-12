package com.dumpit.api;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthProfileApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;
    @Autowired private BrainDumpRepository brainDumpRepository;
    @Autowired private IdeaRepository ideaRepository;

    // ---------- GET /auth/me ----------

    @Test
    void authMe_인증되면_유저정보_전체_shape_반환() throws Exception {
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(USER_A))
                .andExpect(jsonPath("$.name").value("테스트A"))
                .andExpect(jsonPath("$.picture").doesNotExist())
                .andExpect(jsonPath("$.coins").value(0))
                .andExpect(jsonPath("$.isAdmin").value(false))
                .andExpect(jsonPath("$.equipments").isMap());
    }

    @Test
    void authMe_admin은_isAdmin_true() throws Exception {
        mockMvc.perform(get("/auth/me").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(true));
    }

    @Test
    void authMe_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /me/profile ----------

    @Test
    void 프로필조회_인증되면_필드_반환() throws Exception {
        userA.updatePicture("https://cdn.test.dumpit.local/a.png");
        userRepository.save(userA);

        mockMvc.perform(get("/me/profile").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(USER_A))
                .andExpect(jsonPath("$.nickname").value("테스트A"))
                .andExpect(jsonPath("$.picture").value("https://cdn.test.dumpit.local/a.png"))
                .andExpect(jsonPath("$.bio").doesNotExist())
                .andExpect(jsonPath("$.coinBalance").value(0));
    }

    @Test
    void 프로필조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/me/profile"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PATCH /me/profile ----------

    @Test
    void 프로필수정_닉네임과_소개_변경_반영() throws Exception {
        mockMvc.perform(patch("/me/profile").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("nickname", "새닉네임", "bio", "안녕하세요"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("새닉네임"))
                .andExpect(jsonPath("$.bio").value("안녕하세요"));

        User updated = userRepository.findById(userA.getUserId()).orElseThrow();
        assertThat(updated.getNickname()).isEqualTo("새닉네임");
        assertThat(updated.getBio()).isEqualTo("안녕하세요");
    }

    @Test
    void 프로필수정_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of())))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 프로필수정_닉네임_공백이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/me/profile").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("nickname", "   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 프로필수정_소개500자_초과면_400_한글() throws Exception {
        String longBio = "가".repeat(501);
        MvcResult result = mockMvc.perform(patch("/me/profile").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("bio", longBio))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /me/stats ----------

    @Test
    void 통계조회_시드된_태스크_반영() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        seedTask(userA, Task.Status.DONE, Task.Category.WORK, now.minusHours(1), now);
        seedTask(userA, Task.Status.DONE, Task.Category.WORK, now.minusHours(2), now);
        seedTask(userA, Task.Status.TODO, Task.Category.STUDY, now.plusDays(3), null);
        seedTask(userA, Task.Status.IN_PROGRESS, Task.Category.CHORE, now.plusDays(1), null);
        brainDumpRepository.save(BrainDump.of(userA, "덤프 내용"));
        ideaRepository.save(Idea.of(userA, "아이디어 제목", "아이디어 내용"));

        mockMvc.perform(get("/me/stats").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDone").value(2))
                .andExpect(jsonPath("$.totalTodo").value(1))
                .andExpect(jsonPath("$.totalInProgress").value(1))
                .andExpect(jsonPath("$.categoryBreakdown.WORK").value(2))
                .andExpect(jsonPath("$.streak").value(1))
                .andExpect(jsonPath("$.heatmap").isMap())
                .andExpect(jsonPath("$.brainDumpCount").value(1))
                .andExpect(jsonPath("$.ideaCount").value(1))
                .andExpect(jsonPath("$.coinBalance").value(0));
    }

    @Test
    void 통계조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/me/stats"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /tasks/overdue ----------

    @Test
    void 마감지난태스크만_반환() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Task overdueTask = seedTask(userA, Task.Status.TODO, Task.Category.WORK, now.minusDays(1), null);
        seedTask(userA, Task.Status.TODO, Task.Category.WORK, now.plusDays(1), null);

        mockMvc.perform(get("/tasks/overdue").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].taskId").value(overdueTask.getTaskId().toString()))
                .andExpect(jsonPath("$[0].category").value("WORK"))
                .andExpect(jsonPath("$[0].estimatedMinutes").value(30));
    }

    @Test
    void 마감지난태스크_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/tasks/overdue"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- DELETE /me/account ----------

    @Test
    void 탈퇴하면_상태WITHDRAWN_이메일익명화_구글연동해제() throws Exception {
        mockMvc.perform(delete("/me/account").with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        User withdrawn = userRepository.findById(userA.getUserId()).orElseThrow();
        assertThat(withdrawn.getStatus()).isEqualTo(User.Status.WITHDRAWN);
        assertThat(withdrawn.getEmail()).startsWith("withdrawn+");
        verify(oauthRevocationService).revokeGoogle(any());
    }

    @Test
    void 탈퇴_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/me/account"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 관리자_탈퇴시도는_400_한글이고_계정은_그대로_유지() throws Exception {
        MvcResult result = mockMvc.perform(delete("/me/account").with(asUser(ADMIN)))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);

        User stillAdmin = userRepository.findById(admin.getUserId()).orElseThrow();
        assertThat(stillAdmin.getStatus()).isEqualTo(User.Status.ACTIVE);
        assertThat(stillAdmin.getEmail()).isEqualTo(ADMIN);
        // 탈퇴가 거부되면 OAuth 연결도 해지되면 안 된다 (회귀 방지)
        verifyNoInteractions(oauthRevocationService);
    }

    private Task seedTask(User user, Task.Status status, Task.Category category,
                           LocalDateTime deadline, LocalDateTime completedAt) {
        Task task = Task.of(user, "테스트 태스크", null, deadline, 30);
        task.setStatus(status);
        task.setCategory(category);
        if (completedAt != null) task.setCompletedAt(completedAt);
        return taskRepository.save(task);
    }
}
