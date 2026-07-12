package com.dumpit.api;

import com.dumpit.entity.Idea;
import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.service.AiUsageLimitExceededException;
import com.dumpit.service.AiUsageService;
import com.dumpit.service.OpenAiService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
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

class IdeaApiTest extends ApiIntegrationTestBase {

    @Autowired private IdeaRepository ideaRepository;

    // 미보유 아이디어 접근(V3) 실코드 = 403 — findOwnedIdea가 NotFound(404) 먼저 걸러낸 뒤
    // 소유권 불일치를 ForbiddenException(403)으로 던진다. Task 도메인과 동일한 순서/코드.
    private static final int IDOR_STATUS = 403;

    // AiUsageServiceImpl.consume()은 실제로는 Redis 카운터로 한도를 집행한다(ai_usage_logs 테이블은
    // 감사로그 전용이라 시드해도 한도 판정에 영향 없음). 게다가 test 프로파일은 Redis 포트를 의도적으로
    // 막아둬(application-test.yml 참고) consume()이 항상 fail-open으로 통과한다. 따라서 429 시나리오는
    // AiUsageService 자체를 목 처리해 컨트롤러~예외핸들러 계약만 검증한다.
    @MockBean private AiUsageService aiUsageService;

    private Idea seedIdea(User user, String title, Idea parent) {
        Idea idea = Idea.of(user, title, null);
        idea.update(null, null, false, Task.Category.OTHER, parent);
        return ideaRepository.save(idea);
    }

    private void seedStickerPurchase(User user, String itemCode, int price) {
        jdbcTemplate.update(
                "INSERT INTO user_purchases (purchase_id, user_id, item_code, price, purchased_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), user.getUserId(), itemCode, price, LocalDateTime.now());
    }

    // ---------- GET /ideas ----------

    @Test
    void 목록조회_부모자식_구조가_parentIdeaId로_반영된다() throws Exception {
        Idea parent1 = seedIdea(userA, "부모1", null);
        Idea parent2 = seedIdea(userA, "부모2", null);
        Idea c1 = seedIdea(userA, "자식1-1", parent1);
        Idea c2 = seedIdea(userA, "자식1-2", parent1);
        seedIdea(userA, "자식1-3", parent1);
        Idea c4 = seedIdea(userA, "자식2-1", parent2);
        seedIdea(userA, "자식2-2", parent2);
        seedIdea(userA, "자식2-3", parent2);

        String body = mockMvc.perform(get("/ideas").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        JsonNode root = objectMapper.readTree(body);
        Map<String, String> parentByIdeaId = new HashMap<>();
        root.forEach(node -> parentByIdeaId.put(
                node.get("ideaId").asText(),
                node.hasNonNull("parentIdeaId") ? node.get("parentIdeaId").asText() : null));

        assertThat(parentByIdeaId.get(c1.getIdeaId().toString())).isEqualTo(parent1.getIdeaId().toString());
        assertThat(parentByIdeaId.get(c2.getIdeaId().toString())).isEqualTo(parent1.getIdeaId().toString());
        assertThat(parentByIdeaId.get(c4.getIdeaId().toString())).isEqualTo(parent2.getIdeaId().toString());
        assertThat(parentByIdeaId.get(parent1.getIdeaId().toString())).isNull();
        assertThat(parentByIdeaId.get(parent2.getIdeaId().toString())).isNull();
    }

    @Test
    void 목록조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/ideas"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 목록조회_쿼리카운트_상한() throws Exception {
        Idea parent1 = seedIdea(userA, "부모1", null);
        Idea parent2 = seedIdea(userA, "부모2", null);
        seedIdea(userA, "자식1-1", parent1);
        seedIdea(userA, "자식1-2", parent1);
        seedIdea(userA, "자식1-3", parent1);
        seedIdea(userA, "자식2-1", parent2);
        seedIdea(userA, "자식2-2", parent2);
        seedIdea(userA, "자식2-3", parent2);

        long count = queryCount(() -> mockMvc.perform(get("/ideas").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8)));

        // 실측값 2 (2026-07-13 측정: 유저 조회 1 + 아이디어 목록 1) + 여유 2 = 4로 고정.
        // parentIdea/convertedTask는 @ManyToOne LAZY지만 ID 게터만 호출하므로(IdeaResponse.from)
        // 프록시 초기화 없이 FK 값으로 응답 — N+1 없음(용의자였으나 무혐의로 확인됨).
        assertThat(count).isLessThanOrEqualTo(4);
    }

    // ---------- POST /ideas ----------

    @Test
    void 생성_parentId_지정하면_201_트리연결() throws Exception {
        Idea parent = seedIdea(userA, "부모 아이디어", null);

        mockMvc.perform(post("/ideas").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "새 아이디어",
                                "content", "본문",
                                "parentIdeaId", parent.getIdeaId()))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ideaId").exists())
                .andExpect(jsonPath("$.title").value("새 아이디어"))
                .andExpect(jsonPath("$.content").value("본문"))
                .andExpect(jsonPath("$.parentIdeaId").value(parent.getIdeaId().toString()))
                .andExpect(jsonPath("$.category").value("OTHER"))
                .andExpect(jsonPath("$.pinned").value(false))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void 생성_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "제목"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_title_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("title", "   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_존재하지않는_parentId면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "title", "제목",
                                "parentIdeaId", NIL_UUID))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /ideas/bulk ----------

    @Test
    void 벌크생성_여러줄이면_여러아이디어_201() throws Exception {
        mockMvc.perform(post("/ideas/bulk").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "rawText", "첫줄 아이디어\n둘째줄 아이디어\n- 셋째줄 아이디어"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].title").value("첫줄 아이디어"))
                .andExpect(jsonPath("$[2].title").value("셋째줄 아이디어"));
    }

    @Test
    void 벌크생성_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "한 줄"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 벌크생성_rawText_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/bulk").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PATCH /ideas/{id} ----------

    @Test
    void 수정_content와_parentId_함께_수정된다() throws Exception {
        Idea parent = seedIdea(userA, "부모", null);
        Idea idea = seedIdea(userA, "원래 제목", null);

        mockMvc.perform(patch("/ideas/" + idea.getIdeaId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "content", "바뀐 내용",
                                "parentIdeaId", parent.getIdeaId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("바뀐 내용"))
                .andExpect(jsonPath("$.parentIdeaId").value(parent.getIdeaId().toString()));
    }

    @Test
    void 수정_미인증이면_401_한글() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        MvcResult result = mockMvc.perform(patch("/ideas/" + idea.getIdeaId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("content", "탈취"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 남의_아이디어_수정은_거부되고_데이터가_노출되지_않는다() throws Exception {
        Idea idea = seedIdea(userA, "A의 아이디어", null);

        MvcResult result = mockMvc.perform(patch("/ideas/" + idea.getIdeaId()).with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("content", "탈취"))))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 아이디어");
    }

    @Test
    void 수정_없는아이디어면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/ideas/" + NIL_UUID).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("content", "제목"))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 수정_자기자신을_부모로_지정하면_400_정확한메시지() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);

        MvcResult result = mockMvc.perform(patch("/ideas/" + idea.getIdeaId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("parentIdeaId", idea.getIdeaId()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("아이디어는 자기 자신을 상위 아이디어로 둘 수 없습니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 수정_하위아이디어를_부모로_지정하면_400_정확한메시지() throws Exception {
        Idea parent = seedIdea(userA, "부모", null);
        Idea child = seedIdea(userA, "자식", parent);

        MvcResult result = mockMvc.perform(patch("/ideas/" + parent.getIdeaId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("parentIdeaId", child.getIdeaId()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("하위 아이디어를 상위 아이디어로 지정할 수 없습니다."))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PUT /ideas/{id}/sticker ----------

    @Test
    void 스티커_보유한스티커_부착_및_해제() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        seedStickerPurchase(userA, "sticker.heart", 80);
        LocalDateTime originalUpdatedAt = ideaRepository.findActiveById(idea.getIdeaId())
                .orElseThrow().getUpdatedAt();

        mockMvc.perform(put("/ideas/" + idea.getIdeaId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stickerCode").value("sticker.heart"));

        mockMvc.perform(put("/ideas/" + idea.getIdeaId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stickerCode").doesNotExist());

        // HTTP 계층에서도 updated_at 불변 확인(엔티티 레벨 상세 검증은 IdeaStickerUpdateIntegrationTest)
        LocalDateTime afterUpdatedAt = ideaRepository.findActiveById(idea.getIdeaId())
                .orElseThrow().getUpdatedAt();
        assertThat(afterUpdatedAt).isEqualTo(originalUpdatedAt);
    }

    @Test
    void 스티커_미인증이면_401_한글() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        MvcResult result = mockMvc.perform(put("/ideas/" + idea.getIdeaId() + "/sticker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 스티커_남의아이디어는_거부된다() throws Exception {
        Idea idea = seedIdea(userA, "A의 아이디어", null);
        seedStickerPurchase(userB, "sticker.heart", 80);

        MvcResult result = mockMvc.perform(put("/ideas/" + idea.getIdeaId() + "/sticker").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 아이디어");
    }

    @Test
    void 스티커_없는아이디어면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(put("/ideas/" + NIL_UUID + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 스티커_미보유코드면_400_한글() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        // sticker.heart 구매 없음

        MvcResult result = mockMvc.perform(put("/ideas/" + idea.getIdeaId() + "/sticker").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"sticker.heart\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /ideas/{id}/convert-to-task ----------

    @Test
    void 태스크전환_태스크생성_및_아이디어_전환상태_반영() throws Exception {
        Idea idea = seedIdea(userA, "전환할 아이디어", null);
        given(openAiService.scorePriority(any(), any(), any(), any()))
                .willReturn(new OpenAiService.PriorityResult(0.5, "WORK", "사유"));

        String body = mockMvc.perform(post("/ideas/" + idea.getIdeaId() + "/convert-to-task").with(asUser(USER_A)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskId").exists())
                .andExpect(jsonPath("$.title").value("전환할 아이디어"))
                .andExpect(jsonPath("$.category").value("WORK"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String taskId = objectMapper.readTree(body).get("taskId").asText();

        Idea updated = ideaRepository.findActiveById(idea.getIdeaId()).orElseThrow();
        assertThat(updated.getConvertedTask()).isNotNull();
        assertThat(updated.getConvertedTask().getTaskId().toString()).isEqualTo(taskId);
        assertThat(updated.getConvertedAt()).isNotNull();
    }

    @Test
    void 태스크전환_미인증이면_401_한글() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        MvcResult result = mockMvc.perform(post("/ideas/" + idea.getIdeaId() + "/convert-to-task"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 태스크전환_남의아이디어는_거부된다() throws Exception {
        Idea idea = seedIdea(userA, "A의 아이디어", null);

        MvcResult result = mockMvc.perform(post("/ideas/" + idea.getIdeaId() + "/convert-to-task").with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 아이디어");
    }

    @Test
    void 태스크전환_없는아이디어면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/" + NIL_UUID + "/convert-to-task").with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /ideas/ai-extract ----------

    @Test
    void AI추출_openAi스텁_결과반환_200() throws Exception {
        given(openAiService.extractIdeas(any())).willReturn(new OpenAiService.IdeaExtractResult(java.util.List.of(
                new OpenAiService.IdeaNode("추출된 아이디어1", "내용1", "WORK", java.util.List.of()),
                new OpenAiService.IdeaNode("추출된 아이디어2", null, null, null)
        )));

        mockMvc.perform(post("/ideas/ai-extract").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "아이디어 원문 텍스트"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ideas.length()").value(2))
                .andExpect(jsonPath("$.ideas[0].title").value("추출된 아이디어1"))
                .andExpect(jsonPath("$.ideas[1].title").value("추출된 아이디어2"));
    }

    @Test
    void AI추출_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/ai-extract")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "아이디어 원문"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void AI추출_한도초과상태면_429_한글() throws Exception {
        given(aiUsageService.consume(USER_A, AiUsageService.UsageType.IDEA_EXTRACT))
                .willThrow(new AiUsageLimitExceededException());

        MvcResult result = mockMvc.perform(post("/ideas/ai-extract").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("rawText", "아이디어 원문"))))
                .andExpect(status().is(429))
                .andExpect(jsonPath("$.code").value("AI_USAGE_LIMIT_EXCEEDED"))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /ideas/ai-extract/confirm ----------

    @Test
    void AI추출확정_확정하면_아이디어_생성_201() throws Exception {
        mockMvc.perform(post("/ideas/ai-extract/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ideas":[
                                  {"title":"확정된 아이디어1","content":"내용1","category":"WORK","children":[
                                    {"title":"자식 아이디어","content":null,"category":null,"children":null}
                                  ]},
                                  {"title":"확정된 아이디어2","content":null,"category":null,"children":null}
                                ]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].title").value("확정된 아이디어1"))
                .andExpect(jsonPath("$[1].title").value("자식 아이디어"))
                .andExpect(jsonPath("$[1].parentIdeaId").value(org.hamcrest.Matchers.notNullValue()))
                .andExpect(jsonPath("$[2].title").value("확정된 아이디어2"));
    }

    @Test
    void AI추출확정_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/ai-extract/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ideas\":[{\"title\":\"제목\"}]}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void AI추출확정_빈목록이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/ideas/ai-extract/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ideas\":[]}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // [태스크13] IdeaExtractConfirmRequest.IdeaNodeInput은 title/content/category에 @Size가 없고
    // 최상위 ideas 리스트에도 @Valid가 빠져 있어(중첩 children 포함) 대용량 문자열이 검증 없이
    // 그대로 저장될 수 있었다. IdeaRequest(@Size(max=200)/(max=3000))와 동일 상한을 적용하고
    // ideas/children 양쪽에 @Valid를 추가해 재귀적으로 걸러지는지 확인(최상위/자식 노드 각각).
    @Test
    void AI추출확정_title_길이초과면_400_한글() throws Exception {
        String tooLongTitle = "가".repeat(201);
        MvcResult result = mockMvc.perform(post("/ideas/ai-extract/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ideas\":[{\"title\":\"" + tooLongTitle + "\"}]}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void AI추출확정_자식노드_title_길이초과면_400_한글() throws Exception {
        String tooLongTitle = "가".repeat(201);
        MvcResult result = mockMvc.perform(post("/ideas/ai-extract/confirm").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ideas":[
                                  {"title":"정상 제목","content":null,"category":null,"children":[
                                    {"title":"%s","content":null,"category":null,"children":null}
                                  ]}
                                ]}
                                """.formatted(tooLongTitle)))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- DELETE /ideas/{id} ----------

    @Test
    void 삭제_204_소프트삭제_확인() throws Exception {
        Idea idea = seedIdea(userA, "지울 아이디어", null);

        mockMvc.perform(delete("/ideas/" + idea.getIdeaId()).with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        Idea deleted = ideaRepository.findById(idea.getIdeaId()).orElseThrow();
        assertThat(deleted.getDeletedAt()).isNotNull();

        mockMvc.perform(get("/ideas").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 삭제_미인증이면_401_한글() throws Exception {
        Idea idea = seedIdea(userA, "제목", null);
        MvcResult result = mockMvc.perform(delete("/ideas/" + idea.getIdeaId()))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 삭제_남의아이디어는_거부된다() throws Exception {
        Idea idea = seedIdea(userA, "A의 아이디어", null);

        MvcResult result = mockMvc.perform(delete("/ideas/" + idea.getIdeaId()).with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 아이디어");

        Idea stillThere = ideaRepository.findById(idea.getIdeaId()).orElseThrow();
        assertThat(stillThere.getDeletedAt()).isNull();
    }

    @Test
    void 삭제_없는아이디어면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/ideas/" + NIL_UUID).with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 삭제_자식있는부모삭제하면_400_정확한메시지() throws Exception {
        Idea parent = seedIdea(userA, "부모", null);
        seedIdea(userA, "자식", parent);

        MvcResult result = mockMvc.perform(delete("/ideas/" + parent.getIdeaId()).with(asUser(USER_A)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("하위 아이디어를 먼저 삭제해주세요."))
                .andReturn();
        assertKoreanError(result);
    }
}
