package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/pomodoro")
@RequiredArgsConstructor
public class PomodoroController {

    // 클라이언트 타이머 오차·요청 지연 관용치 상한 — 실제 관용치는 세션 길이의 20%와 이 값 중 작은 쪽
    // (고정 60초면 1분 세션에서 요구 경과시간이 0이 되어 즉시 완료가 통과해버린다)
    private static final long MAX_GRACE_SECONDS = 60;

    private final UserRepository userRepository;

    @PostMapping("/start")
    @Transactional
    public ResponseEntity<Void> startSession(@AuthenticationPrincipal OAuth2User principal) {
        User user = findUser(principal);
        user.startPomodoro(LocalDateTime.now()); // 이전 미완료 세션은 덮어씀 — 동시 1세션
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/complete")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeSession(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody(required = false) Map<String, Object> body) {

        int focusMinutes = extractFocusMinutes(body);
        User user = findUser(principal);

        // 서버가 기록한 시작 시각으로 실제 경과시간 검증 — 클라이언트 focusMinutes만 믿으면
        // complete 반복 호출만으로 무한 파밍이 가능하다. 검증 실패는 에러가 아니라 0코인 응답
        // (start를 모르는 구 클라이언트가 도는 롤아웃 중에도 타이머 UX는 깨지지 않게).
        LocalDateTime startedAt = user.getPomodoroStartedAt();
        long graceSeconds = Math.min(MAX_GRACE_SECONDS, focusMinutes * 60L / 5);
        boolean elapsedEnough = startedAt != null
                && Duration.between(startedAt, LocalDateTime.now()).getSeconds()
                   >= focusMinutes * 60L - graceSeconds;

        int coins = 0;
        if (elapsedEnough) {
            coins = Math.max(1, focusMinutes / 5);
            user.addCoins(coins);
        }
        user.clearPomodoro(); // 성공이든 아니든 세션 소거 — 같은 start로 재청구 불가
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "coins", coins,
                "totalCoins", user.getCoinBalance()
        ));
    }

    private User findUser(OAuth2User principal) {
        String email = principal.getAttribute("email");
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
    }

    private static int extractFocusMinutes(Map<String, Object> body) {
        if (body == null) return 25;
        Object val = body.get("focusMinutes");
        if (!(val instanceof Number n)) return 25;
        return Math.max(1, Math.min(120, n.intValue()));
    }
}
