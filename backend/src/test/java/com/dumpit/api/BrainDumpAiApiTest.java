package com.dumpit.api;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.service.OpenAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrainDumpAiApiTest extends ApiIntegrationTestBase {

    @Autowired private BrainDumpRepository brainDumpRepository;

    // IDOR(V3) 실코드 = 403 — BrainDumpServiceImpl.confirm이 findById로 NotFound(404)를 먼저 걸러낸 뒤
    // 소유권 불일치를 ForbiddenException(403)으로 던진다. Task/Idea 도메인과 동일한 순서/코드.
    private static final int IDOR_STATUS = 403;

    private BrainDump seedDump(User user, String rawText) {
        return brainDumpRepository.save(BrainDump.of(user, rawText));
    }

    // ---------- POST /brain-dump ----------

    @Test
    void 제출_openAi스텁_태스크제안_반환_및_AI사용량로그기록() throws Exception {
        given(openAiService.analyzeBrainDump(anyString())).willReturn(new OpenAiService.BrainDumpResult(List.of(
                new OpenAiService.BrainDumpTask("첫번째 할일", "설명1", null, 30, 0.6, "WORK"),
                new OpenAiService.BrainDumpTask("두번째 할일", null, null, null, null, null)
        )));

        mockMvc.perform(post("/brain-dump").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "오늘 할일 정리하기"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dumpId").exists())
                .andExpect(jsonPath("$.tasks.length()").value(2))
                .andExpect(jsonPath("$.tasks[0].title").value("첫번째 할일"))
                .andExpect(jsonPath("$.tasks[0].category").value("WORK"))
                .andExpect(jsonPath("$.tasks[0].aiPriorityScore").value(0.6))
                .andExpect(jsonPath("$.tasks[1].title").value("두번째 할일"));

        // AI 토큰 5점 차감 확인 — AiUsageServiceImpl.consume()의 한도 집행은 Redis 카운터 기반인데
        // test 프로파일은 Redis 포트를 의도적으로 막아둬(application-test.yml) 항상 fail-open으로 통과한다
        // (IdeaApiTest에서 이미 확인된 제약). 따라서 Redis 카운터 자체는 검증 불가하고, 대신 감사로그
        // (ai_usage_logs)에 BRAIN_DUMP 타입·cost=5로 기록되는지로 "5점 차감" 의도를 대체 검증한다.
        List<Map<String, Object>> logs = jdbcTemplate.queryForList(
                "SELECT cost, usage_type, allowed FROM ai_usage_logs WHERE user_id = ?", userA.getUserId());
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).get("usage_type")).isEqualTo("BRAIN_DUMP");
        assertThat(((Number) logs.get(0).get("cost")).intValue()).isEqualTo(5);
    }

    @Test
    void 제출_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/brain-dump")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "내용"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 제출_rawText_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/brain-dump").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /brain-dump/{dumpId}/confirm ----------

    @Test
    void 확정_태스크저장_201() throws Exception {
        BrainDump dump = seedDump(userA, "원문");
        LocalDateTime deadline = LocalDateTime.now().plusDays(3).withNano(0);

        mockMvc.perform(post("/brain-dump/" + dump.getDumpId() + "/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "tasks", List.of(Map.of(
                                        "title", "확정된 할일",
                                        "description", "설명",
                                        "priorityScore", 0.7,
                                        "category", "WORK",
                                        "deadline", deadline,
                                        "estimatedMinutes", 30))))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].taskId").exists())
                .andExpect(jsonPath("$[0].title").value("확정된 할일"))
                .andExpect(jsonPath("$[0].category").value("WORK"))
                .andExpect(jsonPath("$[0].estimatedMinutes").value(30));
    }

    @Test
    void 확정_미인증이면_401_한글() throws Exception {
        BrainDump dump = seedDump(userA, "원문");
        MvcResult result = mockMvc.perform(post("/brain-dump/" + dump.getDumpId() + "/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("tasks", List.of(Map.of("title", "할일"))))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 확정_남의덤프는_거부되고_데이터가_노출되지_않는다() throws Exception {
        BrainDump dump = seedDump(userA, "A의 비밀 원문");

        MvcResult result = mockMvc.perform(post("/brain-dump/" + dump.getDumpId() + "/confirm").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("tasks", List.of(Map.of("title", "탈취"))))))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 비밀 원문");
    }

    @Test
    void 확정_없는덤프면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/brain-dump/" + NIL_UUID + "/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("tasks", List.of(Map.of("title", "할일"))))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // [태스크13] DumpConfirmRequest.TaskInput은 title/description/category에 @Size가 없어
    // 대용량 문자열(예: 100만자 title)이 검증 없이 그대로 Task 엔티티(TEXT 컬럼)에 저장될 수 있었다.
    // TaskRequest(@Size(max=200)/(max=1000))와 동일한 상한을 적용해 400으로 걸러지는지 확인.
    @Test
    void 확정_title_길이초과면_400_한글() throws Exception {
        BrainDump dump = seedDump(userA, "원문");
        String tooLongTitle = "가".repeat(201);

        MvcResult result = mockMvc.perform(post("/brain-dump/" + dump.getDumpId() + "/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "tasks", List.of(Map.of("title", tooLongTitle))))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- GET /ai-usage ----------

    @Test
    void 조회_사용량필드shape_200() throws Exception {
        mockMvc.perform(get("/ai-usage").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.used").value(0))
                .andExpect(jsonPath("$.limit").value(100))
                .andExpect(jsonPath("$.remaining").value(100))
                .andExpect(jsonPath("$.resetAt").exists());
    }

    @Test
    void 조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/ai-usage"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }
}
