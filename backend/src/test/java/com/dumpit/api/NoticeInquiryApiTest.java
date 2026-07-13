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
        return seedNotice(title, status, publishAt, false, false);
    }

    private UUID seedNotice(
            String title,
            String status,
            LocalDateTime publishAt,
            boolean pinned,
            boolean popup) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO notices (notice_id, author_id, title, content, status, publish_at, pinned, popup, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, admin.getUserId(), title, "본문 " + title, status, publishAt, pinned, popup, now, now);
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
                .andExpect(jsonPath("$.pinned.length()").value(0))
                .andExpect(jsonPath("$.notices.length()").value(2))
                .andExpect(jsonPath("$.notices[*].noticeId").value(org.hamcrest.Matchers.containsInAnyOrder(
                        published1.toString(), published2.toString())))
                .andExpect(jsonPath("$.notices[0].title").exists())
                .andExpect(jsonPath("$.notices[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$.notices[0].publishAt").exists())
                .andExpect(jsonPath("$.notices[0].createdAt").exists())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void 목록조회_일반공지_페이지크기3_최신순() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        UUID notice1 = seedNotice("공지1", "PUBLISHED", now.minusHours(1));
        UUID notice2 = seedNotice("공지2", "PUBLISHED", now.minusHours(2));
        UUID notice3 = seedNotice("공지3", "PUBLISHED", now.minusHours(3));
        UUID notice4 = seedNotice("공지4", "PUBLISHED", now.minusHours(4));
        UUID notice5 = seedNotice("공지5", "PUBLISHED", now.minusHours(5));

        mockMvc.perform(get("/notices").param("page", "0").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned.length()").value(0))
                .andExpect(jsonPath("$.notices.length()").value(3))
                .andExpect(jsonPath("$.notices[0].noticeId").value(notice1.toString()))
                .andExpect(jsonPath("$.notices[1].noticeId").value(notice2.toString()))
                .andExpect(jsonPath("$.notices[2].noticeId").value(notice3.toString()))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.totalElements").value(5));

        mockMvc.perform(get("/notices").param("page", "1").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned.length()").value(0))
                .andExpect(jsonPath("$.notices.length()").value(2))
                .andExpect(jsonPath("$.notices[0].noticeId").value(notice4.toString()))
                .andExpect(jsonPath("$.notices[1].noticeId").value(notice5.toString()))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    @Test
    void 목록조회_고정공지는_일반목록에서_제외되고_모든페이지에_유지() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        UUID pinned = seedNotice("고정공지", "PUBLISHED", now.minusMinutes(30), true, false);
        UUID regular1 = seedNotice("일반1", "PUBLISHED", now.minusHours(1));
        UUID regular2 = seedNotice("일반2", "PUBLISHED", now.minusHours(2));
        UUID regular3 = seedNotice("일반3", "PUBLISHED", now.minusHours(3));
        UUID regular4 = seedNotice("일반4", "PUBLISHED", now.minusHours(4));

        mockMvc.perform(get("/notices").param("page", "0").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned.length()").value(1))
                .andExpect(jsonPath("$.pinned[0].noticeId").value(pinned.toString()))
                .andExpect(jsonPath("$.notices.length()").value(3))
                .andExpect(jsonPath("$.notices[0].noticeId").value(regular1.toString()))
                .andExpect(jsonPath("$.notices[1].noticeId").value(regular2.toString()))
                .andExpect(jsonPath("$.notices[2].noticeId").value(regular3.toString()))
                .andExpect(jsonPath("$.totalElements").value(4));

        mockMvc.perform(get("/notices").param("page", "1").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned.length()").value(1))
                .andExpect(jsonPath("$.pinned[0].noticeId").value(pinned.toString()))
                .andExpect(jsonPath("$.notices.length()").value(1))
                .andExpect(jsonPath("$.notices[0].noticeId").value(regular4.toString()))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.totalElements").value(4));
    }

    @Test
    void 목록조회_음수페이지는_0페이지로_클램프() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 4; i++) {
            seedNotice("공지" + i, "PUBLISHED", now.minusHours(i + 1));
        }

        MvcResult pageZero = mockMvc.perform(get("/notices").param("page", "0").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andReturn();
        MvcResult negativePage = mockMvc.perform(get("/notices").param("page", "-1").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andReturn();

        assertThat(negativePage.getResponse().getContentAsString())
                .isEqualTo(pageZero.getResponse().getContentAsString());
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
                .andExpect(jsonPath("$.pinned.length()").value(0))
                .andExpect(jsonPath("$.notices.length()").value(3))
                .andExpect(jsonPath("$.totalElements").value(5)));

        // 기존 실측값 2 (2026-07-13 측정: 유저 조회 1 + 공지 목록 1)에서
        // 새 구조는 고정 공지 1 + 일반 공지 내용 1 + count 1이므로 총 4개로 예상한다.
        // 실행 환경 편차 여유 2를 더해 상한을 6으로 고정.
        // NoticeResponse.from은 Notice의 스칼라 필드만 옮기고 author 등 연관 엔티티를 건드리지 않아 N+1 없음.
        assertThat(count).isLessThanOrEqualTo(6);
    }

    // ---------- GET /notices/unread ----------

    @Test
    void 미읽음목록_읽음처리_전후_변화() throws Exception {
        UUID noticeId = seedNotice(
                "안읽은공지", "PUBLISHED", LocalDateTime.now().minusHours(1), false, true);

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
    void 미읽음목록_popup공지_만_반환() throws Exception {
        seedNotice("일반공지", "PUBLISHED", LocalDateTime.now().minusHours(2), false, false);
        UUID popupNotice = seedNotice(
                "팝업공지", "PUBLISHED", LocalDateTime.now().minusHours(1), false, true);

        mockMvc.perform(get("/notices/unread").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].noticeId").value(popupNotice.toString()))
                .andExpect(jsonPath("$[0].popup").value(true));
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
