package com.dumpit.api;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.TaskRepository;
import com.dumpit.service.GoogleCalendarService;
import com.dumpit.service.OpenAiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.ClientAuthorizationRequiredException;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardCalendarApiTest extends ApiIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;
    @Autowired private ClientRegistrationRepository clientRegistrationRepository;

    // CalendarController가 직접 호출하는 OAuth2AuthorizedClientManager 자체를 목 처리한다.
    // 이유(중요, 발견 사실): spring-security-test의 oauth2Login()(=asUser())은 postProcessRequest에서
    // ReflectionTestUtils로 실제 DefaultOAuth2AuthorizedClientManager 빈의 authorizedClientRepository
    // 필드를 "test" 등록ID·scope=[read] 고정 토큰을 반환하는 내부 테스트용 리포지토리로 통째로 바꿔치기한다
    // (OAuth2AuthorizedClientArgumentResolver가 컨텍스트에 존재하기만 하면 항상 발동). 그 결과
    // authorizedClientRepository(@MockBean)를 아무리 given()으로 스텁해도 CalendarController가 실제로
    // 받는 클라이언트는 항상 그 고정값이 되어 스코프 조건을 검증할 수 없었다(최초 시도에서 실측 확인).
    // OAuth2AuthorizedClientManager를 통째로 목 처리하면 이 훅이 적용되는 instanceof 체크
    // (DefaultOAuth2AuthorizedClientManager)를 벗어나 정상적으로 시나리오별 스텁이 가능하다.
    @MockitoBean private OAuth2AuthorizedClientManager authorizedClientManager;

    @BeforeEach
    void stubOpenAi() {
        // 태스크 시드가 예상치 못하게 AI 추론 분기를 타도 NPE 없이 넘어가도록 하는 안전망 (TaskApiTest와 동일)
        given(openAiService.scorePriority(any(), any(), any(), any()))
                .willReturn(new OpenAiService.PriorityResult(0.5, "WORK", "테스트 사유"));
    }

    private Task seedTask(User user, String title, LocalDateTime deadline) {
        Task task = Task.of(user, title, null, deadline, 30);
        return taskRepository.save(task);
    }

    /** authorizedClientManager.authorize(...) 목이 반환할 "연결됨" 상태의 OAuth2AuthorizedClient */
    private OAuth2AuthorizedClient connectedClient(String... scopes) {
        ClientRegistration registration = clientRegistrationRepository.findByRegistrationId("google");
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER,
                "test-access-token",
                Instant.now().minusSeconds(60),
                Instant.now().plusSeconds(3600),
                Set.of(scopes));
        return new OAuth2AuthorizedClient(registration, USER_A, accessToken);
    }

    // ---------- GET /dashboard/planning ----------

    @Test
    void 플래닝_마감구간별_구획배치() throws Exception {
        // 시각(time-of-day)이 아니라 날짜로 앵커를 고정한다. now()+3h처럼 시각 오프셋으로 시드하면
        // 벽시계가 KST 21~24시 구간일 때 자정을 넘겨 다른 버킷으로 떨어지는 랜덤 실패가 있었다
        // (TaskPlanningServiceImpl.bucketOf: deadline <= endOfDay(today) → TODAY 등 날짜 경계 판정).
        // 주의: LocalTime.MAX(23:59:59.999999999)는 Postgres timestamp의 마이크로초(6자리) 정밀도로
        // 저장되며 나노초 9자리 반올림 시 다음 날 00:00:00으로 자정을 넘어버린다(실측 확인) —
        // 그래서 초 단위(23:59:59, 반올림 안전)로 앵커를 잡는다.
        Task today = seedTask(userA, "오늘 마감", LocalDate.now().atTime(23, 59, 59));
        Task tomorrow = seedTask(userA, "내일 마감", LocalDate.now().plusDays(1).atTime(12, 0));
        Task in8Days = seedTask(userA, "팔일후 마감", LocalDate.now().plusDays(8).atTime(12, 0));
        Task someday = seedTask(userA, "언젠가 할 일", null);

        mockMvc.perform(get("/dashboard/planning").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.now").exists())
                .andExpect(jsonPath("$.availableFocusMinutes").exists())
                .andExpect(jsonPath("$.sections.today.length()").value(1))
                .andExpect(jsonPath("$.sections.today[0].taskId").value(today.getTaskId().toString()))
                .andExpect(jsonPath("$.sections.tomorrow.length()").value(1))
                .andExpect(jsonPath("$.sections.tomorrow[0].taskId").value(tomorrow.getTaskId().toString()))
                // 7일 경계: 8일 후 마감은 next7Days가 아니라 later 구획으로 떨어져야 한다
                // (TaskPlanningServiceImplTest의 "칠일째/팔일째" 경계 규칙을 HTTP 계층에서 재확인)
                .andExpect(jsonPath("$.sections.next7Days.length()").value(0))
                .andExpect(jsonPath("$.sections.later.length()").value(1))
                .andExpect(jsonPath("$.sections.later[0].taskId").value(in8Days.getTaskId().toString()))
                .andExpect(jsonPath("$.sections.someday.length()").value(1))
                .andExpect(jsonPath("$.sections.someday[0].taskId").value(someday.getTaskId().toString()));
    }

    @Test
    void 플래닝_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/dashboard/planning"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 플래닝_쿼리카운트_상한() throws Exception {
        for (int i = 0; i < 10; i++) {
            seedTask(userA, "태스크" + i, LocalDateTime.now().plusDays(i));
        }

        long count = queryCount(() -> mockMvc.perform(get("/dashboard/planning").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks.length()").value(10)));

        // 실측값 2 (2026-07-13 측정: 유저 조회 1 + 태스크 목록 1 — TaskService.getTasksForUser 재사용,
        // 나머지 섹션·추천·nowSuggestion 계산은 인메모리 스트림 처리라 추가 쿼리 없음) + 여유 2 = 4로 고정.
        assertThat(count).isLessThanOrEqualTo(4);
    }

    // ---------- GET /calendar/events ----------

    @Test
    void 캘린더_연결됨_googleCalendarService스텁_이벤트목록반환() throws Exception {
        given(authorizedClientManager.authorize(any()))
                .willReturn(connectedClient("https://www.googleapis.com/auth/calendar.readonly"));
        given(googleCalendarService.getEvents(anyString(), any(), any())).willReturn(List.of(
                new GoogleCalendarService.CalendarEvent(
                        "evt-1", "회의", LocalDateTime.now(), LocalDateTime.now().plusHours(1))
        ));

        mockMvc.perform(get("/calendar/events").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("evt-1"))
                .andExpect(jsonPath("$[0].summary").value("회의"));
    }

    @Test
    void 캘린더_스코프없으면_권한필요_403_한글() throws Exception {
        // 연결은 되어 있지만(리프레시 등으로) 저장된 토큰에 calendar.readonly 스코프가 없는 상태.
        // 이 분기는 원래 GlobalExceptionHandler를 우회해 {code, message} 응답(표준 {error:...} 계약 위반)을
        // 수동 조립했고, 그 message 리터럴이 인코딩 손상(mojibake) 상태였다 — 이번 태스크에서 즉시 픽스.
        given(authorizedClientManager.authorize(any()))
                .willReturn(connectedClient("email", "profile"));

        MvcResult result = mockMvc.perform(get("/calendar/events").with(asUser(USER_A)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CALENDAR_PERMISSION_REQUIRED"))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 캘린더_미연결상태면_재연결필요_403_한글() throws Exception {
        // 구글 캘린더를 한 번도 연결한 적 없는 상태의 실제 프로덕션 동작: google 클라이언트 등록은
        // authorization_code grant라 DefaultOAuth2AuthorizedClientManager.authorize()가 저장된
        // authorized client를 못 찾으면 null을 반환하는 대신 ClientAuthorizationRequiredException
        // (OAuth2AuthorizationException 하위타입)을 던진다 — 컨트롤러의 catch(OAuth2AuthorizationException)
        // 분기가 이를 GOOGLE_CALENDAR_RECONNECT_REQUIRED 403으로 변환한다. "빈 목록 200" 아님(실제 코드 확인).
        // (참고: client==null 분기의 "빈 목록 200" 경로는 google=authorization_code grant에서는
        // 도달 불가능한 코드다 — report-notes에 기록)
        given(authorizedClientManager.authorize(any()))
                .willThrow(new ClientAuthorizationRequiredException("google"));

        MvcResult result = mockMvc.perform(get("/calendar/events").with(asUser(USER_A)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("GOOGLE_CALENDAR_RECONNECT_REQUIRED"))
                .andReturn();
        assertKoreanError(result);
    }

    @Test
    void 캘린더_미인증이면_401_한글() throws Exception {
        MvcResult result = mockMvc.perform(get("/calendar/events"))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertKoreanError(result);
    }
}
