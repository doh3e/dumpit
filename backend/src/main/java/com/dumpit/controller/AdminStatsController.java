package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.repository.AiUsageLogRepository;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final RoutineRepository routineRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final AiUsageLogRepository aiUsageLogRepository;

    @GetMapping("/today")
    public ResponseEntity<TodayStatsResponse> today(@AuthenticationPrincipal OAuth2User principal) {
        requireAdmin(principal);
        LocalDateTime since = LocalDate.now().atStartOfDay();
        return ResponseEntity.ok(new TodayStatsResponse(
                userRepository.countByCreatedAtGreaterThanEqual(since),
                taskRepository.countByCreatedAtGreaterThanEqual(since),
                routineRepository.countByCreatedAtGreaterThanEqual(since),
                brainDumpRepository.countByCreatedAtGreaterThanEqual(since),
                aiUsageLogRepository.countByCreatedAtGreaterThanEqual(since),
                aiUsageLogRepository.sumAllowedCostSince(since)
        ));
    }

    private void requireAdmin(OAuth2User principal) {
        if (principal == null) {
            throw new AccessDeniedException("Admin permission is required.");
        }
        String email = principal.getAttribute("email");
        boolean admin = userRepository.findByEmail(email)
                .filter(User::isActive)
                .map(User::getIsAdmin)
                .orElse(false);
        if (!admin) {
            throw new AccessDeniedException("Admin permission is required.");
        }
    }

    public record TodayStatsResponse(
            long joinedUsers,
            long createdTasks,
            long createdRoutines,
            long brainDumps,
            long aiUsageLogs,
            long aiUsed
    ) {}
}
