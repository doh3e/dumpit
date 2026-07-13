package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.service.OpenAiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TaskApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;

    // IDOR(V3) 실코드 = 403 (ForbiddenException) — TaskServiceImpl 전 메서드가 동일 패턴 사용
    private static final int IDOR_STATUS = 403;

    @BeforeEach
    void stubOpenAi() {
        // create/update가 예상치 못하게 AI 추론 분기를 타도 NPE 없이 넘어가도록 하는 안전망
        given(openAiService.scorePriority(any(), any(), any(), any()))
                .willReturn(new OpenAiService.PriorityResult(0.6, "WORK", "테스트 사유"));
        given(openAiService.inferSchedule(any(), any(), any(), any(), any()))
                .willReturn(new OpenAiService.ScheduleInferenceResult(null, null, 30, "테스트 사유"));
    }

    private Task seedTask(User user, String title) {
        Task task = Task.of(user, title, null, LocalDateTime.now().plusDays(3), 30);
        return taskRepository.save(task);
    }

    private void seedStickerPurchase(User user, String itemCode, int price) {
        jdbcTemplate.update(
                "INSERT INTO user_purchases (purchase_id, user_id, item_code, price, purchased_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), user.getUserId(), itemCode, price, LocalDateTime.now());
    }

    // ---------- POST /tasks ----------

    @Test
    void 생성_기본_201_응답_필드shape() throws Exception {
        LocalDateTime deadline = LocalDateTime.now().plusDays(3).withNano(0);
        mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "장보기",
                                "deadline", deadline,
                                "estimatedMinutes", 30))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskId").exists())
                .andExpect(jsonPath("$.title").value("장보기"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.category").value("WORK"))
                .andExpect(jsonPath("$.aiPriorityScore").value(0.6))
                .andExpect(jsonPath("$.estimatedMinutes").value(30))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void 생성_noDeadline_true_조합_201() throws Exception {
        mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "언젠가 할 일",
                                "noDeadline", true,
                                "estimatedMinutes", 20))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.deadline").doesNotExist());
    }

    @Test
    void 생성_deadline_지정_조합_201() throws Exception {
        LocalDateTime deadline = LocalDateTime.now().plusDays(5).withNano(0);
        mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "마감 있는 일",
                                "deadline", deadline,
                                "estimatedMinutes", 15))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.deadline").exists());
    }

    @Test
    void 생성_시작이_마감보다_늦으면_400_한글() throws Exception {
        LocalDateTime deadline = LocalDateTime.now().plusDays(2).withNano(0);
        LocalDateTime startTime = LocalDateTime.now().plusDays(3).withNano(0);
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "역전된 일정",
                                "deadline", deadline,
                                "startTime", startTime))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "제목"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_title_누락이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_title_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_title_201자면_400_한글() throws Exception {
        String longTitle = "가".repeat(201);
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", longTitle))))
                .andExpect(status().isBadRequest())
                // @Size 기본 메시지는 JVM 로케일 의존 — 어떤 로케일에서든 통일 문구로 변환되는지 정확히 고정
                .andExpect(jsonPath("$.error").value("제목: 200자 이하로 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_description_1001자면_400_한글() throws Exception {
        String longDescription = "가".repeat(1001);
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "제목",
                                "description", longDescription))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("입력값: 1000자 이하로 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_잘못된_category_enum이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"제목\",\"category\":\"NOT_A_CATEGORY\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /tasks ----------

    @Test
    void 목록조회_userA_태스크만_반환() throws Exception {
        Task a1 = seedTask(userA, "A의 할일1");
        Task a2 = seedTask(userA, "A의 할일2");
        seedTask(userB, "B의 할일");

        mockMvc.perform(get("/tasks").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].taskId").value(org.hamcrest.Matchers.containsInAnyOrder(
                        a1.getTaskId().toString(), a2.getTaskId().toString())));
    }

    @Test
    void 목록조회_doneSinceDays_파라미터_동작() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Task oldDone = seedTask(userA, "오래전 완료");
        oldDone.setStatus(Task.Status.DONE);
        oldDone.setCompletedAt(now.minusDays(40));
        taskRepository.save(oldDone);

        Task recentDone = seedTask(userA, "최근 완료");
        recentDone.setStatus(Task.Status.DONE);
        recentDone.setCompletedAt(now.minusDays(1));
        taskRepository.save(recentDone);

        Task todo = seedTask(userA, "할 일");

        mockMvc.perform(get("/tasks").param("doneSinceDays", "7").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].taskId").value(org.hamcrest.Matchers.containsInAnyOrder(
                        recentDone.getTaskId().toString(), todo.getTaskId().toString())));
    }

    @Test
    void 목록조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/tasks"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 목록조회_쿼리카운트_상한() throws Exception {
        for (int i = 0; i < 10; i++) {
            seedTask(userA, "태스크" + i);
        }

        long count = queryCount(() -> mockMvc.perform(get("/tasks").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10)));

        // 실측값 2 (2026-07-13 측정: 유저 조회 1 + 태스크 목록 1) + 여유 2 = 4로 고정 — Task 12 쿼리 진단 재료
        assertThat(count).isLessThanOrEqualTo(4);
    }

    // ---------- PATCH /tasks/{id} ----------

    @Test
    void 수정_title_부분수정() throws Exception {
        Task task = seedTask(userA, "원래 제목");

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "바뀐 제목"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("바뀐 제목"));
    }

    @Test
    void 수정_deadline_부분수정() throws Exception {
        Task task = seedTask(userA, "제목");
        LocalDateTime newDeadline = LocalDateTime.now().plusDays(10).withNano(0);

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("deadline", newDeadline))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deadline").exists());
    }

    @Test
    void 수정_noDeadline_부분수정() throws Exception {
        Task task = seedTask(userA, "제목");

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("noDeadline", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deadline").doesNotExist());
    }

    @Test
    void 수정_status_DONE으로_변경하면_코인지급() throws Exception {
        Task task = seedTask(userA, "완료할 일");

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "DONE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(30));
    }

    // ---------- 코인 지급·회수·점감 (docs/superpowers/specs/2026-07-14-coin-anti-farming-design.md) ----------

    private void completeTask(Task task, int expectedCoins) throws Exception {
        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "DONE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coinsGranted").value(expectedCoins));
    }

    private void assertCoinBalance(int expected) throws Exception {
        mockMvc.perform(get("/auth/me").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coins").value(expected));
    }

    @Test
    void 완료_해제하면_지급액_그대로_회수_마감조작해도_무효() throws Exception {
        Task task = seedTask(userA, "완료 후 해제");
        completeTask(task, 30);

        // 완료 후 마감을 과거로 조작 — 회수액이 재계산(마감지남 5코인)되면 +25 증식 구멍
        jdbcTemplate.update("UPDATE tasks SET deadline = ? WHERE task_id = ?",
                LocalDateTime.now().minusDays(1), task.getTaskId());

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "TODO"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coinsGranted").value(0));

        assertCoinBalance(0);
    }

    @Test
    void 오늘_완료한_태스크_삭제하면_코인회수() throws Exception {
        Task task = seedTask(userA, "완료 후 삭제");
        completeTask(task, 30);

        mockMvc.perform(delete("/tasks/" + task.getTaskId()).with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        assertCoinBalance(0);
    }

    @Test
    void 어제_완료한_태스크_삭제는_회수하지_않는다() throws Exception {
        Task task = seedTask(userA, "어제 완료분 정리");
        completeTask(task, 30);
        jdbcTemplate.update("UPDATE tasks SET completed_at = ? WHERE task_id = ?",
                LocalDateTime.now().minusDays(1), task.getTaskId());

        mockMvc.perform(delete("/tasks/" + task.getTaskId()).with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        assertCoinBalance(30);
    }

    @Test
    void 점감_하루_10개_초과_완료부터_5코인() throws Exception {
        for (int i = 0; i < 10; i++) {
            completeTask(seedTask(userA, "할일 " + i), 30);
        }
        completeTask(seedTask(userA, "11번째"), 5);
        assertCoinBalance(10 * 30 + 5);
    }

    @Test
    void 잔액부족해도_해제_회수는_그대로_차감_음수허용() throws Exception {
        Task task = seedTask(userA, "벌고 쓰고 해제");
        completeTask(task, 30);
        // 지급받은 코인을 써버린 상황 재현 — 회수를 잔액에서 클램프하면 무한 증식 구멍
        jdbcTemplate.update("UPDATE users SET coin_balance = 10 WHERE email = ?", USER_A);

        mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "TODO"))))
                .andExpect(status().isOk());

        assertCoinBalance(-20);
    }

    @Test
    void 수정_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(patch("/tasks/" + task.getTaskId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "탈취"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 남의_태스크_수정은_거부되고_데이터가_노출되지_않는다() throws Exception {
        // userA의 태스크 생성
        String body = mockMvc.perform(post("/tasks").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"A의 할일\"}"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String taskId = objectMapper.readTree(body).get("taskId").asString();

        // userB가 접근 → 4xx + A 데이터 미노출
        MvcResult result = mockMvc.perform(patch("/tasks/" + taskId).with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"탈취\"}"))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");
    }

    @Test
    void 수정_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/tasks/" + NIL_UUID).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "제목"))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 수정_title_201자면_400_정확한메시지() throws Exception {
        Task task = seedTask(userA, "제목");
        String longTitle = "가".repeat(201);

        MvcResult result = mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", longTitle))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("할 일은 200자 이하로 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 수정_status_잘못된값이면_400_한글() throws Exception {
        Task task = seedTask(userA, "제목");

        MvcResult result = mockMvc.perform(patch("/tasks/" + task.getTaskId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("status", "NOT_A_STATUS"))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PUT /tasks/{id}/sticker ----------

    @Test
    void 스티커_보유한스티커_부착() throws Exception {
        Task task = seedTask(userA, "제목");
        seedStickerPurchase(userA, "sticker.heart", 80);

        mockMvc.perform(put("/tasks/" + task.getTaskId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stickerCode").value("sticker.heart"));
    }

    @Test
    void 스티커_null로_해제() throws Exception {
        Task task = seedTask(userA, "제목");
        seedStickerPurchase(userA, "sticker.heart", 80);
        task.setStickerCode("sticker.heart");
        taskRepository.save(task);

        mockMvc.perform(put("/tasks/" + task.getTaskId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stickerCode").doesNotExist());
    }

    @Test
    void 스티커_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(put("/tasks/" + task.getTaskId() + "/sticker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 스티커_남의태스크는_거부된다() throws Exception {
        Task task = seedTask(userA, "A의 할일");
        seedStickerPurchase(userB, "sticker.heart", 80);

        MvcResult result = mockMvc.perform(put("/tasks/" + task.getTaskId() + "/sticker").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");
    }

    @Test
    void 스티커_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(put("/tasks/" + NIL_UUID + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 스티커_미보유코드면_400_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        // sticker.heart 구매 없음

        MvcResult result = mockMvc.perform(put("/tasks/" + task.getTaskId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /tasks/{id}/reanalyze ----------

    @Test
    void 재분석_openAi스텁후_200_점수반영() throws Exception {
        Task task = seedTask(userA, "제목");
        given(openAiService.scorePriority(any(), any(), any(), any()))
                .willReturn(new OpenAiService.PriorityResult(0.85, "STUDY", "재이유"));

        mockMvc.perform(post("/tasks/" + task.getTaskId() + "/reanalyze").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiPriorityScore").value(0.85));
    }

    @Test
    void 재분석_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/reanalyze"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 재분석_남의태스크는_거부된다() throws Exception {
        Task task = seedTask(userA, "A의 할일");

        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/reanalyze").with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");
    }

    @Test
    void 재분석_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks/" + NIL_UUID + "/reanalyze").with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /tasks/{id}/split/propose ----------

    @Test
    void 분할제안_openAi스텁_SubtaskResult_반환() throws Exception {
        Task task = seedTask(userA, "큰 일");
        given(openAiService.proposeSubtasks(any(), any(), any()))
                .willReturn(new OpenAiService.SubtaskResult(List.of(
                        new OpenAiService.SubtaskProposal("서브1", "설명1", 20),
                        new OpenAiService.SubtaskProposal("서브2", null, 15))));

        mockMvc.perform(post("/tasks/" + task.getTaskId() + "/split/propose").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtasks.length()").value(2))
                .andExpect(jsonPath("$.subtasks[0].title").value("서브1"))
                .andExpect(jsonPath("$.subtasks[0].estimatedMinutes").value(20));
    }

    @Test
    void 분할제안_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/split/propose"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 분할제안_남의태스크는_거부된다() throws Exception {
        Task task = seedTask(userA, "A의 할일");

        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/split/propose").with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");
    }

    @Test
    void 분할제안_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks/" + NIL_UUID + "/split/propose").with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /tasks/{id}/split ----------

    @Test
    void 분할실행_서브태스크_생성() throws Exception {
        Task parent = seedTask(userA, "큰 일");

        mockMvc.perform(post("/tasks/" + parent.getTaskId() + "/split").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subtasks":[
                                  {"title":"서브1","estimatedMinutes":20},
                                  {"title":"서브2","description":"설명","estimatedMinutes":10}
                                ]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].parentTaskId").value(parent.getTaskId().toString()))
                .andExpect(jsonPath("$[0].title").value("서브1"));
    }

    @Test
    void 분할실행_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/split")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subtasks\":[{\"title\":\"서브\"}]}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 분할실행_남의태스크는_거부된다() throws Exception {
        Task task = seedTask(userA, "A의 할일");

        MvcResult result = mockMvc.perform(post("/tasks/" + task.getTaskId() + "/split").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subtasks\":[{\"title\":\"서브\"}]}"))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");
    }

    @Test
    void 분할실행_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/tasks/" + NIL_UUID + "/split").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subtasks\":[{\"title\":\"서브\"}]}"))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 분할실행_빈목록이면_400_한글() throws Exception {
        Task parent = seedTask(userA, "큰 일");

        MvcResult result = mockMvc.perform(post("/tasks/" + parent.getTaskId() + "/split").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subtasks\":[]}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- DELETE /tasks/{id} ----------

    @Test
    void 삭제_204_소프트삭제_확인() throws Exception {
        Task task = seedTask(userA, "지울 일");

        mockMvc.perform(delete("/tasks/" + task.getTaskId()).with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        Task deleted = taskRepository.findById(task.getTaskId()).orElseThrow();
        assertThat(deleted.getDeletedAt()).isNotNull();

        mockMvc.perform(get("/tasks").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 삭제_미인증이면_401_한글() throws Exception {
        Task task = seedTask(userA, "제목");
        MvcResult result = mockMvc.perform(delete("/tasks/" + task.getTaskId()))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 삭제_남의태스크는_거부된다() throws Exception {
        Task task = seedTask(userA, "A의 할일");

        MvcResult result = mockMvc.perform(delete("/tasks/" + task.getTaskId()).with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 할일");

        Task stillThere = taskRepository.findById(task.getTaskId()).orElseThrow();
        assertThat(stillThere.getDeletedAt()).isNull();
    }

    @Test
    void 삭제_없는태스크면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/tasks/" + NIL_UUID).with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }
}
