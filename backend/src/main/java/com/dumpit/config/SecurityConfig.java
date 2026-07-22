package com.dumpit.config;

import com.dumpit.repository.UserRepository;
import com.dumpit.service.CustomOAuth2UserService;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProviderBuilder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private static final Set<String> GOOGLE_SCOPES = Set.of(
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly"
    );

    /** 운영 컨텍스트 패스(/api)를 뺀 내부 경로 비교용 — AuthenticatedRequestGuardFilter와 동일 방식. */
    private static final UrlPathHelper URL_PATH_HELPER = new UrlPathHelper();

    private final CustomOAuth2UserService customOAuth2UserService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Bean
    @Profile("!local")
    public OAuth2AuthorizedClientRepository authorizedClientRepository(
            ClientRegistrationRepository clientRegistrationRepository,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {
        return new RedisOAuth2AuthorizedClientRepository(
                clientRegistrationRepository,
                redisTemplate,
                objectMapper);
    }

    /** 로컬 개발용 — Redis 없이 세션에 OAuth 토큰 저장 */
    @Bean
    @Profile("local")
    public OAuth2AuthorizedClientRepository localAuthorizedClientRepository() {
        return new HttpSessionOAuth2AuthorizedClientRepository();
    }

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository clientRegistrationRepository,
            OAuth2AuthorizedClientRepository authorizedClientRepository) {

        OAuth2AuthorizedClientProvider authorizedClientProvider =
                OAuth2AuthorizedClientProviderBuilder.builder()
                        .authorizationCode()
                        .refreshToken(refresh -> refresh.clockSkew(Duration.ofMinutes(5)))
                        .build();

        DefaultOAuth2AuthorizedClientManager authorizedClientManager =
                new DefaultOAuth2AuthorizedClientManager(
                        clientRegistrationRepository,
                        authorizedClientRepository);
        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);
        return authorizedClientManager;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           ClientRegistrationRepository clientRegistrationRepository,
                                           OAuth2AuthorizedClientRepository authorizedClientRepository) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())

            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(opts -> {})
                .xssProtection(xss -> {})
                .referrerPolicy(ref ->
                    ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31_536_000)
                )
            )

            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/error").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/auth/mobile/google").permitAll()
                .anyRequest().authenticated()
            )

            // 직접 생성해 시큐리티 체인에만 등록한다. @Component로 두면 서블릿 컨테이너에도
            // 자동 등록되어, @Order로 SecurityContext 확립 전 실행 시 once-per-request 우회가 열린다.
            .addFilterAfter(new AuthenticatedRequestGuardFilter(userRepository, objectMapper),
                    AuthorizationFilter.class)

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                            "UNAUTHORIZED", "로그인이 필요합니다."))
                .accessDeniedHandler((request, response, denied) ->
                    writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN,
                            "FORBIDDEN", "접근 권한이 없습니다."))
            )

            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(auth -> auth
                    .authorizationRequestResolver(
                        customAuthorizationRequestResolver(clientRegistrationRepository)
                    )
                )
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .authorizedClientRepository(authorizedClientRepository)
                .successHandler((request, response, authentication) -> {
                    logGoogleAuthorizedClientState(authorizedClientRepository, request, authentication);
                    response.sendRedirect(frontendUrl + "/dashboard");
                })
                .failureUrl(frontendUrl + "/?error=login_failed")
            )

            // logoutUrl() 대신 커스텀 매처를 쓴다. CSRF 비활성 상태의 기본 매처는 GET까지 허용해,
            // SameSite=Lax여도 최상위 GET 내비게이션(링크 클릭)으로 강제 로그아웃이 가능했다.
            // LogoutFilter는 AuthenticatedRequestGuardFilter보다 앞이라 가드의 헤더 검사도 못 미친다 —
            // POST + X-Requested-With(프론트 axios 기본 헤더)를 여기서 직접 요구한다.
            .logout(logout -> logout
                .logoutRequestMatcher(request ->
                    "POST".equals(request.getMethod())
                            && "/auth/logout".equals(URL_PATH_HELPER.getPathWithinApplication(request))
                            && StringUtils.hasText(request.getHeader("X-Requested-With")))
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) ->
                    response.setStatus(HttpServletResponse.SC_NO_CONTENT)
                )
            );

        return http.build();
    }

    private void writeErrorResponse(HttpServletResponse response, int status,
                                    String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("code", code);
        body.put("error", message);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private void logGoogleAuthorizedClientState(OAuth2AuthorizedClientRepository authorizedClientRepository,
                                                HttpServletRequest request,
                                                Authentication authentication) {
        OAuth2AuthorizedClient client = authorizedClientRepository
                .loadAuthorizedClient("google", authentication, request);
        if (client == null) {
            log.warn("Google OAuth login completed but authorized client was not found in Redis.");
            return;
        }
        log.info("Google OAuth login completed: accessTokenExpiresAt={}, refreshTokenPresent={}, scopes={}",
                client.getAccessToken() != null ? client.getAccessToken().getExpiresAt() : null,
                client.getRefreshToken() != null,
                client.getAccessToken() != null ? client.getAccessToken().getScopes() : null);
    }

    /**
     * Google OAuth2 요청에 access_type=offline 추가 -> refresh_token 획득.
     */
    private OAuth2AuthorizationRequestResolver customAuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository) {

        DefaultOAuth2AuthorizationRequestResolver defaultResolver =
                new DefaultOAuth2AuthorizationRequestResolver(
                        clientRegistrationRepository, "/oauth2/authorization");

        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                return addGoogleParams(defaultResolver.resolve(request), request);
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
                return addGoogleParams(defaultResolver.resolve(request, clientRegistrationId), request);
            }

            private OAuth2AuthorizationRequest addGoogleParams(OAuth2AuthorizationRequest authRequest,
                                                               HttpServletRequest request) {
                if (authRequest == null) return null;
                Map<String, Object> params = new HashMap<>(authRequest.getAdditionalParameters());
                params.put("access_type", "offline");
                params.put("include_granted_scopes", "false");
                if ("1".equals(request.getParameter("calendar_consent"))
                        || "consent".equals(request.getParameter("prompt"))) {
                    params.put("prompt", "consent");
                }
                return OAuth2AuthorizationRequest.from(authRequest)
                        .scopes(GOOGLE_SCOPES)
                        .additionalParameters(params)
                        .build();
            }
        };
    }
}
