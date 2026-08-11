package com.dumpit.controller;

import com.dumpit.dto.PomodoroSettleRequest;
import com.dumpit.dto.PomodoroStartRequest;
import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.pomodoro.PomodoroSettleCalculator;
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
    public ResponseEntity<Void> startSession(@AuthenticationPrincipal OAuth2User principal,
                                             @RequestBody(required = false) PomodoroStartRequest body) {
        User user = findUser(principal);
        LocalDateTime now = LocalDateTime.now();
        if (body == null || body.focusMinutes() == null) {
            user.startPomodoro(now); // 레거시(웹) — 이전 미완료 세션·계획은 덮어씀, 동시 1세션
        } else {
            user.startPomodoroPlan(now,
                    clamp(body.focusMinutes(), 1, 120, 25),
                    clamp(body.breakMinutes(), 1, 120, 5),
                    clamp(body.longBreakMinutes(), 1, 120, 15),
                    clamp(body.longBreakEvery(), 1, 12, 4),
                    clamp(body.setsTarget(), 0, 12, 0));
        }
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    /**
     * 백그라운드에서 지나간 집중 세트 일괄 정산. 서버 벽시계 상한(settleableCap)으로 검증하고
     * 이미 정산한 세트를 뺀 델타만 지급 — 언제 몇 번 호출해도 중복 지급이 없다.
     */
    @PostMapping("/settle")
    @Transactional
    public ResponseEntity<Map<String, Object>> settleSession(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody(required = false) PomodoroSettleRequest body) {

        User user = findUser(principal);
        int claimed = body != null ? clamp(body.claimedSessions(), 0, 1000, 0) : 0;
        boolean finished = body != null && Boolean.TRUE.equals(body.finished());

        int newSettled = 0;
        int coins = 0;
        if (user.getPomodoroStartedAt() != null && user.hasPomodoroPlan()) {
            // 저장값도 클램프를 거쳐 언박싱 — 부분 null 행(수동 편집 등)이 NPE 500을 내지 않게
            PomodoroSettleCalculator.Plan plan = new PomodoroSettleCalculator.Plan(
                    clamp(user.getPomodoroPlanFocusMinutes(), 1, 120, 25),
                    clamp(user.getPomodoroPlanBreakMinutes(), 1, 120, 5),
                    clamp(user.getPomodoroPlanLongBreakMinutes(), 1, 120, 15),
                    clamp(user.getPomodoroPlanLongBreakEvery(), 1, 12, 4),
                    clamp(user.getPomodoroPlanSetsTarget(), 0, 12, 0));
            long elapsed = Duration.between(user.getPomodoroStartedAt(), LocalDateTime.now()).getSeconds();
            int cap = PomodoroSettleCalculator.settleableCap(plan, elapsed);
            newSettled = Math.max(0, Math.min(claimed, cap) - user.getPomodoroSettledSessions());
            if (newSettled > 0) {
                coins = newSettled * Math.max(1, plan.focusMinutes() / 5);
                user.addCoins(coins);
                user.recordPomodoroFocusSessions(plan.focusMinutes(), newSettled);
                user.addSettledSessions(newSettled);
            }
        }
        if (finished) {
            user.clearPomodoro();
        }
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "coins", coins,
                "totalCoins", user.getCoinBalance(),
                "settledSessions", newSettled
        ));
    }

    private static int clamp(Integer value, int min, int max, int fallback) {
        if (value == null) return fallback;
        return Math.max(min, Math.min(max, value));
    }

    @PostMapping("/complete")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeSession(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody(required = false) Map<String, Object> body) {

        int focusMinutes = extractFocusMinutes(body);
        User user = findUser(principal);

        // 계획 세션은 settle 전용 — 같은 경과시간을 settle과 complete로 두 번 청구하는 혼용을 서버가 거부한다
        if (user.hasPomodoroPlan()) {
            user.clearPomodoro();
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("coins", 0, "totalCoins", user.getCoinBalance()));
        }

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
            user.recordPomodoroFocus(focusMinutes);
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
