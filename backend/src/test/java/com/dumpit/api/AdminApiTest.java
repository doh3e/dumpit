package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.repository.TaskRepository;
import tools.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;

    // ---------- 공통 V6: admin 10개 엔드포인트 전부 userA(일반 유저) 호출 → 403 + 한글 ----------

    static Stream<Arguments> adminEndpoints() {
        String userId = NIL_UUID;
        return Stream.of(
                Arguments.of(HttpMethod.GET, "/admin/users", null),
                Arguments.of(HttpMethod.PATCH, "/admin/users/" + userId + "/ban", "{}"),
                Arguments.of(HttpMethod.PATCH, "/admin/users/" + userId + "/unban", null),
                Arguments.of(HttpMethod.GET, "/admin/notices", null),
                Arguments.of(HttpMethod.POST, "/admin/notices", "{\"title\":\"제목\",\"content\":\"내용\"}"),
                Arguments.of(HttpMethod.PATCH, "/admin/notices/" + userId, "{\"title\":\"제목\",\"content\":\"내용\"}"),
                Arguments.of(HttpMethod.DELETE, "/admin/notices/" + userId, null),
                Arguments.of(HttpMethod.GET, "/admin/inquiries", null),
                Arguments.of(HttpMethod.PATCH, "/admin/inquiries/" + userId + "/reply", "{\"reply\":\"답변\"}"),
                Arguments.of(HttpMethod.GET, "/admin/stats/today", null)
        );
    }

    @ParameterizedTest(name = "{0} {1} → 일반 유저는 403")
    @MethodSource("adminEndpoints")
    void 관리자아님_전엔드포인트_403_한글(HttpMethod method, String path, String body) throws Exception {
        MockHttpServletRequestBuilder builder = request(method, path).with(asUser(USER_A));
        if (body != null) {
            builder.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        MvcResult result = mockMvc.perform(builder)
                .andExpect(status().isForbidden())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /admin/users ----------

    @Test
    void 유저목록_admin호출_통계포함_200() throws Exception {
        taskRepository.save(Task.of(userA, "할일1", null, LocalDateTime.now().plusDays(1), 30));
        taskRepository.save(Task.of(userA, "할일2", null, LocalDateTime.now().plusDays(2), 30));

        MvcResult result = mockMvc.perform(get("/admin/users").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].aiUsage.used").exists())
                .andExpect(jsonPath("$[0].aiUsage.limit").exists())
                .andExpect(jsonPath("$[0].aiUsage.remaining").exists())
                .andExpect(jsonPath("$[0].activity.routineCount").exists())
                .andExpect(jsonPath("$[0].activity.ideaCount").exists())
                .andExpect(jsonPath("$[0].activity.brainDumpCount").exists())
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andReturn();

        JsonNode users = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        JsonNode userANode = findByEmail(users, USER_A);
        assertThat(userANode.get("activity").get("taskCount").asLong()).isEqualTo(2);
        assertThat(userANode.get("status").asString()).isEqualTo("ACTIVE");
        assertThat(findByEmail(users, ADMIN).get("isAdmin").asBoolean()).isTrue();
    }

    private JsonNode findByEmail(JsonNode users, String email) {
        for (JsonNode node : users) {
            if (email.equals(node.get("email").asString())) return node;
        }
        throw new AssertionError("응답에 email=" + email + " 유저가 없음: " + users);
    }

    @Test
    void 유저목록_쿼리카운트_상한() throws Exception {
        // 유저 3명(userA/userB/admin)은 @BeforeEach에서 이미 시드됨.
        taskRepository.save(Task.of(userA, "할일", null, LocalDateTime.now().plusDays(1), 30));

        long count = queryCount(() -> mockMvc.perform(get("/admin/users").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3)));

        // 픽스 전(N+1) 실측값 14 (강제 실패로 확인: expected: -1L but was: 14L
        // = requireAdmin 유저조회 1 + findAllForAdmin 1 + 유저 3명 × 4개 리포지토리 개별 count 12).
        // 유저 수(N)에 비례해 늘어나는 전형적인 N+1 — GROUP BY 집계 쿼리 4개로 병합해
        // 유저 수와 무관한 상수 쿼리 수로 즉시 픽스(AdminUserController.list() + 각 리포지토리의
        // countActiveGroupedByUser()).
        // 픽스 후 실측값 6 (강제 실패로 재확인: expected: -1L but was: 6L
        // = requireAdmin 1 + findAllForAdmin 1 + task/routine/idea/brainDump 그룹집계 4).
        // 여유 2를 더해 8로 고정.
        assertThat(count).isLessThanOrEqualTo(8);
    }

    // ---------- PATCH /admin/users/{id}/ban, /unban ----------

    @Test
    void 밴_V1_상태BANNED로변경() throws Exception {
        mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"부적절한 행동\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BANNED"))
                .andExpect(jsonPath("$.banReason").value("부적절한 행동"))
                .andExpect(jsonPath("$.bannedAt").exists());
    }

    @Test
    void 밴_없는유저면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/admin/users/" + NIL_UUID + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 밴_admin본인은_400_한글() throws Exception {
        // User.ban()이 admin이면 IllegalStateException("Admin users cannot be banned.")을 던지고,
        // GlobalExceptionHandler.handleIllegalState + koreanBadRequestMessage 매핑으로 400 한글이 되어야 한다.
        MvcResult result = mockMvc.perform(patch("/admin/users/" + admin.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("관리자 계정은 정지할 수 없습니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 밴_사유501자면_400_사이즈메시지() throws Exception {
        String reason501 = "가".repeat(501);
        MvcResult result = mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("reason", reason501))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("사유: 500자 이하로 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 밴해제_V1_상태ACTIVE로복귀() throws Exception {
        mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"사유\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/unban").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.banReason").doesNotExist())
                .andExpect(jsonPath("$.bannedAt").doesNotExist());
    }

    @Test
    void 밴해제_없는유저면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/admin/users/" + NIL_UUID + "/unban").with(asUser(ADMIN)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- 보안 케이스: 밴된 유저가 세션이 살아있는 동안 일반 API를 계속 쓸 수 있는지 ----------

    @Test
    void 밴된유저_세션유지중_GET_tasks_차단됨() throws Exception {
        mockMvc.perform(patch("/admin/users/" + userB.getUserId() + "/ban").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"테스트 밴\"}"))
                .andExpect(status().isOk());

        // OAuth 세션은 로그인 시점 캐시라 밴 이후에도 살아있는 세션으로는 계속 인증된 상태를 유지한다.
        // AuthenticatedRequestGuardFilter가 요청마다 DB를 재조회해 isActive()를 확인하므로
        // 이제는 401(SESSION_INVALIDATED)로 차단된다 — 이전엔 200이 나오던 보안 갭이었다
        // (docs/superpowers/audits/2026-07-13-api-audit-report.md §2 High #1 픽스).
        MvcResult result = mockMvc.perform(get("/tasks").with(asUser(USER_B)))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET/POST/PATCH/DELETE /admin/notices ----------

    @Test
    void 공지_CRUD_시나리오() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "공지 제목", "content", "공지 내용"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.noticeId").exists())
                .andExpect(jsonPath("$.title").value("공지 제목"))
                .andExpect(jsonPath("$.content").value("공지 내용"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andReturn();
        UUID noticeId = extractUuid(createResult, "noticeId");

        mockMvc.perform(get("/admin/notices").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].noticeId").value(noticeId.toString()));

        mockMvc.perform(patch("/admin/notices/" + noticeId).with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "수정된 제목", "content", "수정된 내용"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정된 제목"))
                .andExpect(jsonPath("$.content").value("수정된 내용"));

        mockMvc.perform(delete("/admin/notices/" + noticeId).with(asUser(ADMIN)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/notices").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("ARCHIVED"));
    }

    @Test
    void 공지_생성_title_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "   ", "content", "내용"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("제목을(를) 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 공지_생성_content_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "제목", "content", "   "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("내용을(를) 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 공지_수정_없는공지면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/admin/notices/" + NIL_UUID).with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "제목", "content", "내용"))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 공지_삭제_없는공지면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/admin/notices/" + NIL_UUID).with(asUser(ADMIN)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /admin/inquiries, PATCH /admin/inquiries/{id}/reply ----------

    @Test
    void 문의목록_시드후_admin조회() throws Exception {
        mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "문의 제목", "message", "문의 내용"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/admin/inquiries").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userEmail").value(USER_A))
                .andExpect(jsonPath("$[0].subject").value("문의 제목"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void 문의답변_이메일발송검증_V1() throws Exception {
        MvcResult submitResult = mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "문의 제목", "message", "문의 내용"))))
                .andExpect(status().isCreated())
                .andReturn();
        UUID inquiryId = extractUuid(submitResult, "inquiryId");
        clearInvocations(emailService);

        mockMvc.perform(patch("/admin/inquiries/" + inquiryId + "/reply").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("reply", "답변 내용입니다."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REPLIED"))
                .andExpect(jsonPath("$.adminReply").value("답변 내용입니다."))
                .andExpect(jsonPath("$.repliedAt").exists());

        verify(emailService, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test
    void 문의답변_없는문의면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/admin/inquiries/" + NIL_UUID + "/reply").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("reply", "답변"))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 문의답변_reply_빈값이면_400_한글() throws Exception {
        MvcResult submitResult = mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "문의 제목", "message", "문의 내용"))))
                .andExpect(status().isCreated())
                .andReturn();
        UUID inquiryId = extractUuid(submitResult, "inquiryId");

        MvcResult result = mockMvc.perform(patch("/admin/inquiries/" + inquiryId + "/reply").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("reply", "   "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("답변을(를) 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /admin/stats/today ----------

    @Test
    void 오늘통계_admin호출_200_shape() throws Exception {
        mockMvc.perform(get("/admin/stats/today").with(asUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinedUsers").exists())
                .andExpect(jsonPath("$.createdTasks").exists())
                .andExpect(jsonPath("$.createdRoutines").exists())
                .andExpect(jsonPath("$.brainDumps").exists())
                .andExpect(jsonPath("$.aiUsageLogs").exists())
                .andExpect(jsonPath("$.aiUsed").exists());
    }

    private UUID extractUuid(MvcResult result, String field) throws Exception {
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode json = objectMapper.readTree(body);
        return UUID.fromString(json.get(field).asString());
    }
}
