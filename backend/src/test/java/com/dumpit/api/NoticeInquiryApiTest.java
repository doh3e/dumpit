package com.dumpit.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NoticeInquiryApiTest extends ApiIntegrationTestBase {

    private UUID seedNotice(String title, String status, LocalDateTime publishAt) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO notices (notice_id, author_id, title, content, status, publish_at, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, admin.getUserId(), title, "본문 " + title, status, publishAt, now, now);
        return id;
    }

    private int countNoticeReads(UUID noticeId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notice_reads WHERE notice_id = ?", Integer.class, noticeId);
        return count == null ? 0 : count;
    }

    // ---------- GET /notices ----------

    @Test
    void 목록조회_공개된공지만_반환() throws Exception {
        UUID published1 = seedNotice("공지1", "PUBLISHED", LocalDateTime.now().minusDays(1));
        UUID published2 = seedNotice("공지2", "PUBLISHED", LocalDateTime.now().minusHours(1));
        seedNotice("초안", "DRAFT", LocalDateTime.now().minusDays(1));
        seedNotice("예약발행", "PUBLISHED", LocalDateTime.now().plusDays(1));

        mockMvc.perform(get("/notices").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].noticeId").value(org.hamcrest.Matchers.containsInAnyOrder(
                        published1.toString(), published2.toString())))
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$[0].publishAt").exists())
                .andExpect(jsonPath("$[0].createdAt").exists());
    }

    @Test
    void 목록조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/notices"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 목록조회_쿼리카운트_상한() throws Exception {
        for (int i = 0; i < 5; i++) {
            seedNotice("공지" + i, "PUBLISHED", LocalDateTime.now().minusHours(i + 1));
        }

        long count = queryCount(() -> mockMvc.perform(get("/notices").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5)));

        // 실측값 2 (2026-07-13 측정, 강제 실패로 확인: expected: -1L but was: 2L
        // = 유저 조회 1 + 공지 목록 1) + 여유 2 = 4로 고정.
        // NoticeResponse.from은 Notice의 스칼라 필드만 옮기고 author 등 연관 엔티티를 건드리지 않아 N+1 없음.
        assertThat(count).isLessThanOrEqualTo(4);
    }

    // ---------- GET /notices/unread ----------

    @Test
    void 미읽음목록_읽음처리_전후_변화() throws Exception {
        UUID noticeId = seedNotice("안읽은공지", "PUBLISHED", LocalDateTime.now().minusHours(1));

        mockMvc.perform(get("/notices/unread").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].noticeId").value(noticeId.toString()));

        mockMvc.perform(post("/notices/" + noticeId + "/read").with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/notices/unread").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 미읽음목록_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/notices/unread"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /notices/{id}/read ----------

    @Test
    void 읽음처리_중복호출해도_레코드는_하나() throws Exception {
        UUID noticeId = seedNotice("공지", "PUBLISHED", LocalDateTime.now().minusHours(1));

        mockMvc.perform(post("/notices/" + noticeId + "/read").with(asUser(USER_A)))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/notices/" + noticeId + "/read").with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        assertThat(countNoticeReads(noticeId)).isEqualTo(1);
    }

    @Test
    void 읽음처리_미인증이면_401_한글() throws Exception {
        UUID noticeId = seedNotice("공지", "PUBLISHED", LocalDateTime.now().minusHours(1));
        MvcResult result = mockMvc.perform(post("/notices/" + noticeId + "/read"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 읽음처리_없는공지면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/notices/" + NIL_UUID + "/read").with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- POST /inquiries ----------

    @Test
    void 문의_생성_이메일발송_검증() throws Exception {
        mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "문의 제목",
                                "message", "문의 내용입니다."))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inquiryId").exists())
                .andExpect(jsonPath("$.userEmail").value(USER_A))
                .andExpect(jsonPath("$.subject").value("문의 제목"))
                .andExpect(jsonPath("$.message").value("문의 내용입니다."))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.adminReply").doesNotExist())
                .andExpect(jsonPath("$.repliedAt").doesNotExist())
                .andExpect(jsonPath("$.createdAt").exists());

        verify(emailService, times(2)).send(anyString(), anyString(), anyString());
    }

    @Test
    void 문의_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/inquiries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "제목", "message", "내용"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 문의_subject_빈값이면_400_정확한메시지() throws Exception {
        MvcResult result = mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "   ", "message", "내용"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("제목을(를) 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 문의_message_빈값이면_400_정확한메시지() throws Exception {
        MvcResult result = mockMvc.perform(post("/inquiries").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of(
                                "subject", "제목", "message", "   "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("내용을(를) 입력해주세요."))
                .andReturn();
        assertKoreanError(result);
    }
}
