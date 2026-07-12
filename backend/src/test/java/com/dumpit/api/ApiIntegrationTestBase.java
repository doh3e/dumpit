package com.dumpit.api;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.EmailService;
import com.dumpit.service.GoogleCalendarService;
import com.dumpit.service.OAuthRevocationService;
import com.dumpit.service.OpenAiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiIntegrationTestBase {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected JdbcTemplate jdbcTemplate;
    @Autowired protected UserRepository userRepository;
    @Autowired protected EntityManagerFactory entityManagerFactory;

    // 외부 의존성 목 — 상속한 테스트에서 given(...)으로 스텁
    @MockBean protected OpenAiService openAiService;
    @MockBean protected GoogleCalendarService googleCalendarService;
    @MockBean protected EmailService emailService;
    @MockBean protected OAuthRevocationService oauthRevocationService;
    // Redis 기반 실구현(RedisOAuth2AuthorizedClientRepository)이 테스트 환경 Redis에 연결을 시도하는 것을 막는다
    @MockBean protected OAuth2AuthorizedClientRepository authorizedClientRepository;

    protected static final String USER_A = "usera@test.dumpit.local";
    protected static final String USER_B = "userb@test.dumpit.local";
    protected static final String ADMIN = "admin@test.dumpit.local";
    protected static final String NIL_UUID = "00000000-0000-0000-0000-000000000000";

    protected User userA;
    protected User userB;
    protected User admin;

    @BeforeEach
    void resetDatabaseAndSeedUsers() {
        truncateAllTables();
        userA = userRepository.save(User.of(USER_A, "테스트A", "google", "test-a"));
        userB = userRepository.save(User.of(USER_B, "테스트B", "google", "test-b"));
        admin = userRepository.save(User.of(ADMIN, "관리자", "google", "test-admin"));
        jdbcTemplate.update("UPDATE users SET is_admin = true WHERE email = ?", ADMIN);
    }

    private void truncateAllTables() {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history'",
                String.class);
        if (!tables.isEmpty()) {
            jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", tables) + " RESTART IDENTITY CASCADE");
        }
    }

    /** OAuth 세션 로그인 재현 — 컨트롤러는 principal.getAttribute("email")로 유저를 식별한다 */
    protected RequestPostProcessor asUser(String email) {
        return oauth2Login().attributes(attrs -> {
            attrs.put("email", email);
            attrs.put("name", "테스트유저");
        });
    }

    /** 오류 응답 형식 + 한글 메시지 + 영어 원문 미노출 검증 */
    protected void assertKoreanError(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode json = objectMapper.readTree(body);
        assertThat(json.has("error")).as("오류 응답에 error 필드 필요: " + body).isTrue();
        String message = json.get("error").asText();
        assertThat(message).as("한글 메시지 필요, 실제: " + message).containsPattern("[가-힣]");
        assertThat(message.toLowerCase())
                .as("영어 원문 노출: " + message)
                .doesNotContain("not found").doesNotContain("must not")
                .doesNotContain("must be").doesNotContain("size must")
                .doesNotContain("cannot").doesNotContain("exception");
    }

    /** action 동안 실행된 JDBC prepared statement 수 (N+1 검출용) */
    protected long queryCount(ThrowingRunnable action) throws Exception {
        Statistics stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        action.run();
        return stats.getPrepareStatementCount();
    }

    @FunctionalInterface
    public interface ThrowingRunnable { void run() throws Exception; }
}
