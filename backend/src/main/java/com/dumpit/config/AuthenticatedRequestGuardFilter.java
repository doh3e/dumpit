package com.dumpit.config;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 인증 필터(AuthorizationFilter) 뒤, 컨트롤러 진입 전에 배치되는 요청 게이트.
 *
 * <p>두 가지를 막는다:
 * <ol>
 *   <li>밴/탈퇴 게이트 — OAuth 세션은 로그인 시점 principal을 캐시하므로, 세션이 살아있는 동안
 *       밴/탈퇴된 유저가 API를 계속 쓸 수 있는 취약점을 요청마다 DB 재조회로 막는다.</li>
 *   <li>CSRF 커스텀 헤더 — SameSite=None 세션 쿠키 환경에서 본문 없는 상태변경 요청이 크로스사이트
 *       simple request로 위조되는 것을, 브라우저가 크로스오리진에서 임의로 못 붙이는
 *       X-Requested-With 헤더 존재 여부로 막는다.</li>
 * </ol>
 *
 * <p><b>빈 등록 주의</b>: 이 필터는 {@code @Component}가 아니다. 시큐리티 체인에
 * {@code addFilterAfter(AuthorizationFilter.class)}로만 등록되어야 하며(SecurityConfig에서 직접 생성),
 * 서블릿 컨테이너 자동 등록을 겸하면 누군가 {@code @Order}로 SecurityContext 확립 전에 실행시켜
 * once-per-request 속성을 미리 세팅 → 체인 내 가드가 통째로 스킵되는 우회가 가능해진다.
 */
@RequiredArgsConstructor
public class AuthenticatedRequestGuardFilter extends OncePerRequestFilter {

    /** 하위 경로를 가지므로 접두어(startsWith) 매칭. */
    private static final Set<String> EXEMPT_PATH_PREFIXES = Set.of(
            "/auth/", "/oauth2/", "/login/oauth2/"
    );

    /** 정확 매칭(equals) — /healthfoo·/errorbar 같은 경계 우회를 막는다. (/logout은 실제 경로가 /auth/logout이라 위 접두어에 포함됨.) */
    private static final Set<String> EXEMPT_EXACT_PATHS = Set.of(
            "/health", "/error"
    );

    private static final Set<String> STATE_CHANGING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private static final UrlPathHelper URL_PATH_HELPER = new UrlPathHelper();

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        if (isExemptPath(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            // 미인증 요청은 가드 대상이 아님 — 다운스트림 authenticationEntryPoint가 401 처리.
            filterChain.doFilter(request, response);
            return;
        }

        String email = extractEmail(auth);
        if (email == null) {
            // 인증됐는데 email 식별 불가는 비정상 — fail-closed로 401 차단.
            // (예외 경로/미인증은 이미 위에서 통과됐으므로, 여기 도달 = 비예외·인증됨·email-null 이상 케이스뿐.)
            writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "SESSION_INVALIDATED", "세션이 만료되었습니다. 다시 로그인해주세요.");
            return;
        }

        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty() || !user.get().isActive()) {
            writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "SESSION_INVALIDATED", "세션이 만료되었습니다. 다시 로그인해주세요.");
            return;
        }

        if (STATE_CHANGING_METHODS.contains(request.getMethod())
                && !StringUtils.hasText(request.getHeader("X-Requested-With"))) {
            writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN,
                    "CSRF_HEADER_REQUIRED", "요청을 처리할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 컨텍스트 패스(운영 /api)를 뺀 애플리케이션 내부 경로로 비교한다.
     * 테스트 환경은 컨텍스트 패스가 비어 있어 getRequestURI()와 동일하지만,
     * 운영은 /api가 붙으므로 이 헬퍼 없이 리터럴 접두어 비교만 하면 예외 경로가 전부 빗나간다.
     */
    private boolean isExemptPath(HttpServletRequest request) {
        String path = URL_PATH_HELPER.getPathWithinApplication(request);
        if (EXEMPT_EXACT_PATHS.contains(path)) return true;
        for (String prefix : EXEMPT_PATH_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        return false;
    }

    private String extractEmail(Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof OAuth2User oAuth2User) {
            return oAuth2User.getAttribute("email");
        }
        return null;
    }

    private void writeErrorResponse(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("code", code);
        body.put("error", message);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
