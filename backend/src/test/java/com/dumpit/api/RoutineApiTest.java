package com.dumpit.api;

import com.dumpit.entity.Routine;
import com.dumpit.entity.User;
import com.dumpit.repository.RoutineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RoutineApiTest extends ApiIntegrationTestBase {

    @Autowired private RoutineRepository routineRepository;

    // IDOR(V3) 실코드 = 403 — RoutineServiceImpl.findOwnedRoutine이 NotFound(404)를 먼저 걸러낸 뒤
    // 소유권 불일치를 ForbiddenException(403)으로 던진다. Task/Idea 도메인과 동일 순서/코드.
    private static final int IDOR_STATUS = 403;

    private Routine seedRoutine(User user, String name) {
        Routine routine = Routine.of(user, name);
        routine.setRepeatType(Routine.RepeatType.DAILY);
        routine.setEnabled(true);
        return routineRepository.save(routine);
    }

    private Map<String, Object> dailyBody(String name) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("repeatType", "DAILY");
        body.put("startDate", LocalDate.now().toString());
        return body;
    }

    // ---------- GET /routines ----------

    @Test
    void 목록조회_userA_루틴만_반환() throws Exception {
        Routine a1 = seedRoutine(userA, "A루틴1");
        Routine a2 = seedRoutine(userA, "A루틴2");
        seedRoutine(userB, "B루틴");

        mockMvc.perform(get("/routines").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].routineId").value(org.hamcrest.Matchers.containsInAnyOrder(
                        a1.getRoutineId().toString(), a2.getRoutineId().toString())));
    }

    @Test
    void 목록조회_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/routines"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 목록조회_쿼리카운트_상한() throws Exception {
        for (int i = 0; i < 10; i++) {
            seedRoutine(userA, "루틴" + i);
        }

        long count = queryCount(() -> mockMvc.perform(get("/routines").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10)));

        // 실측값 2 (2026-07-13 측정: 유저 조회 1 + 루틴 목록 1, 강제 실패로 확인: expected: -1L but was: 2L) + 여유 2 = 4로 고정.
        // RoutineResponse.from은 user 등 연관 엔티티를 건드리지 않고 스칼라 필드만 옮기므로 N+1 없음.
        assertThat(count).isLessThanOrEqualTo(4);
    }

    // ---------- POST /routines ----------

    @Test
    void 생성_DAILY_201_응답_필드shape() throws Exception {
        mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dailyBody("아침 운동"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.routineId").exists())
                .andExpect(jsonPath("$.name").value("아침 운동"))
                .andExpect(jsonPath("$.repeatType").value("DAILY"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.startDate").value(LocalDate.now().toString()))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void 생성_WEEKLY_daysOfWeek_포함_201() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "주간 회의");
        body.put("repeatType", "WEEKLY");
        body.put("daysOfWeek", Set.of(1, 3, 5));
        body.put("startDate", LocalDate.now().toString());

        mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.repeatType").value("WEEKLY"))
                .andExpect(jsonPath("$.daysOfWeek").value(org.hamcrest.Matchers.containsInAnyOrder(1, 3, 5)));
    }

    @Test
    void 생성_MONTHLY_daysOfMonth_포함_201() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "월간 정산");
        body.put("repeatType", "MONTHLY");
        body.put("daysOfMonth", Set.of(1, 15));
        body.put("startDate", LocalDate.now().toString());

        mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.repeatType").value("MONTHLY"))
                .andExpect(jsonPath("$.daysOfMonth").value(org.hamcrest.Matchers.containsInAnyOrder(1, 15)));
    }

    @Test
    void 생성_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/routines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dailyBody("제목"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_name_빈값이면_400_한글() throws Exception {
        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dailyBody("   "))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_repeatType_누락이면_400_한글() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_WEEKLY_daysOfWeek_없으면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "WEEKLY");
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("주간 루틴은 1~7 사이의 요일을 하나 이상 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_MONTHLY_daysOfMonth_없으면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "MONTHLY");
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("월간 루틴은 1~31 사이의 날짜를 하나 이상 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_MONTHLY_WEEKDAY_서수_0이면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "MONTHLY_WEEKDAY");
        body.put("monthlyWeekOrdinal", 0);
        body.put("monthlyWeekDay", 3);
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("월간 요일 루틴은 1~5 사이의 주차를 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_MONTHLY_WEEKDAY_서수_6이면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "MONTHLY_WEEKDAY");
        body.put("monthlyWeekOrdinal", 6);
        body.put("monthlyWeekDay", 3);
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("월간 요일 루틴은 1~5 사이의 주차를 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_MONTHLY_WEEKDAY_요일_0이면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "MONTHLY_WEEKDAY");
        body.put("monthlyWeekOrdinal", 2);
        body.put("monthlyWeekDay", 0);
        body.put("startDate", LocalDate.now().toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("월간 요일 루틴은 1~7 사이의 요일을 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 생성_endDate가_startDate보다_빠르면_400_정확한메시지() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "DAILY");
        body.put("startDate", LocalDate.now().toString());
        body.put("endDate", LocalDate.now().minusDays(1).toString());

        MvcResult result = mockMvc.perform(post("/routines").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("종료일은 시작일보다 빠를 수 없습니다."))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PATCH /routines/{id} ----------

    @Test
    void 수정_name_시간_수정() throws Exception {
        Routine routine = seedRoutine(userA, "원래 이름");

        Map<String, Object> body = new HashMap<>();
        body.put("name", "바뀐 이름");
        body.put("repeatType", "DAILY");
        body.put("startDate", routine.getStartDate().toString());
        body.put("routineStartTime", "09:30:00");

        mockMvc.perform(patch("/routines/" + routine.getRoutineId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("바뀐 이름"))
                .andExpect(jsonPath("$.routineStartTime").value("09:30:00"));
    }

    @Test
    void 수정_미인증이면_401_한글() throws Exception {
        Routine routine = seedRoutine(userA, "제목");
        MvcResult result = mockMvc.perform(patch("/routines/" + routine.getRoutineId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dailyBody("탈취"))))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 남의_루틴_수정은_거부되고_데이터가_노출되지_않는다() throws Exception {
        Routine routine = seedRoutine(userA, "A의 루틴");

        Map<String, Object> body = dailyBody("탈취");
        body.put("startDate", routine.getStartDate().toString());

        MvcResult result = mockMvc.perform(patch("/routines/" + routine.getRoutineId()).with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 루틴");
    }

    @Test
    void 수정_없는루틴이면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/routines/" + NIL_UUID).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dailyBody("제목"))))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 수정_WEEKLY_daysOfWeek_없으면_400_정확한메시지() throws Exception {
        Routine routine = seedRoutine(userA, "제목");

        Map<String, Object> body = new HashMap<>();
        body.put("name", "제목");
        body.put("repeatType", "WEEKLY");
        body.put("startDate", routine.getStartDate().toString());

        MvcResult result = mockMvc.perform(patch("/routines/" + routine.getRoutineId()).with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("주간 루틴은 1~7 사이의 요일을 하나 이상 선택해야 합니다."))
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- PATCH /routines/{id}/enabled ----------

    @Test
    void 토글_enabled_false로_변경() throws Exception {
        Routine routine = seedRoutine(userA, "제목");

        mockMvc.perform(patch("/routines/" + routine.getRoutineId() + "/enabled").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void 토글_미인증이면_401_한글() throws Exception {
        Routine routine = seedRoutine(userA, "제목");
        MvcResult result = mockMvc.perform(patch("/routines/" + routine.getRoutineId() + "/enabled")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 남의_루틴_토글은_거부된다() throws Exception {
        Routine routine = seedRoutine(userA, "A의 루틴");

        MvcResult result = mockMvc.perform(patch("/routines/" + routine.getRoutineId() + "/enabled").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 루틴");
    }

    @Test
    void 토글_없는루틴이면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(patch("/routines/" + NIL_UUID + "/enabled").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }

    // ---------- DELETE /routines/{id} ----------

    @Test
    void 삭제_204_소프트삭제_확인() throws Exception {
        Routine routine = seedRoutine(userA, "지울 루틴");

        mockMvc.perform(delete("/routines/" + routine.getRoutineId()).with(asUser(USER_A)))
                .andExpect(status().isNoContent());

        Routine deleted = routineRepository.findById(routine.getRoutineId()).orElseThrow();
        assertThat(deleted.getDeletedAt()).isNotNull();

        mockMvc.perform(get("/routines").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 삭제_미인증이면_401_한글() throws Exception {
        Routine routine = seedRoutine(userA, "제목");
        MvcResult result = mockMvc.perform(delete("/routines/" + routine.getRoutineId()))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 남의_루틴_삭제는_거부된다() throws Exception {
        Routine routine = seedRoutine(userA, "A의 루틴");

        MvcResult result = mockMvc.perform(delete("/routines/" + routine.getRoutineId()).with(asUser(USER_B)))
                .andExpect(status().is(IDOR_STATUS))
                .andReturn();
        assertKoreanError(result);
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .doesNotContain("A의 루틴");

        Routine stillThere = routineRepository.findById(routine.getRoutineId()).orElseThrow();
        assertThat(stillThere.getDeletedAt()).isNull();
    }

    @Test
    void 삭제_없는루틴이면_404_한글() throws Exception {
        MvcResult result = mockMvc.perform(delete("/routines/" + NIL_UUID).with(asUser(USER_A)))
                .andExpect(status().isNotFound())
                .andReturn();
        assertKoreanError(result);
    }
}
