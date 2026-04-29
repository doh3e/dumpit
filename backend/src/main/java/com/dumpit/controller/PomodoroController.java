package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/pomodoro")
@RequiredArgsConstructor
public class PomodoroController {

    private final UserRepository userRepository;

    @PostMapping("/complete")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeSession(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody(required = false) Map<String, Object> body) {

        int focusMinutes = extractFocusMinutes(body);
        int coins = Math.max(1, focusMinutes / 5);

        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다"));

        user.addCoins(coins);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "coins", coins,
                "totalCoins", user.getCoinBalance()
        ));
    }

    private static int extractFocusMinutes(Map<String, Object> body) {
        if (body == null) return 25;
        Object val = body.get("focusMinutes");
        if (!(val instanceof Number n)) return 25;
        return Math.max(1, Math.min(120, n.intValue()));
    }
}
