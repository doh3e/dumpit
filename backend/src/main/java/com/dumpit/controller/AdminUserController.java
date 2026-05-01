package com.dumpit.controller;

import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AccountService;
import com.dumpit.service.AiUsageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AccountService accountService;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final RoutineRepository routineRepository;
    private final IdeaRepository ideaRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final AiUsageService aiUsageService;

    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> list(@AuthenticationPrincipal OAuth2User principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(accountService.getUsersForAdmin().stream()
                .map(this::toResponse)
                .toList());
    }

    @PatchMapping("/{userId}/ban")
    public ResponseEntity<AdminUserResponse> ban(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID userId,
            @Valid @RequestBody BanRequest request) {
        requireAdmin(principal);
        return ResponseEntity.ok(toResponse(accountService.banUser(userId, request.reason())));
    }

    @PatchMapping("/{userId}/unban")
    public ResponseEntity<AdminUserResponse> unban(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable UUID userId) {
        requireAdmin(principal);
        return ResponseEntity.ok(toResponse(accountService.unbanUser(userId)));
    }

    private AdminUserResponse toResponse(User user) {
        AiUsageService.AiUsageStatus aiUsage = aiUsageService.getStatusForUser(user);
        return AdminUserResponse.from(
                user,
                new AdminUserActivitySummary(
                        taskRepository.countByUserAndDeletedAtIsNull(user),
                        routineRepository.countByUserAndDeletedAtIsNull(user),
                        ideaRepository.countByUserAndDeletedAtIsNull(user),
                        brainDumpRepository.countByUserAndDeletedAtIsNull(user)
                ),
                new AdminAiUsageSummary(aiUsage.used(), aiUsage.limit(), aiUsage.remaining())
        );
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

    public record BanRequest(@Size(max = 500) String reason) {}

    public record AdminUserResponse(
            UUID userId,
            String email,
            String nickname,
            String picture,
            int coinBalance,
            AdminAiUsageSummary aiUsage,
            AdminUserActivitySummary activity,
            boolean isAdmin,
            String status,
            String banReason,
            LocalDateTime bannedAt,
            LocalDateTime withdrawnAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static AdminUserResponse from(User user, AdminUserActivitySummary activity, AdminAiUsageSummary aiUsage) {
            return new AdminUserResponse(
                    user.getUserId(),
                    user.getEmail(),
                    user.getNickname(),
                    user.getPicture(),
                    user.getCoinBalance(),
                    aiUsage,
                    activity,
                    Boolean.TRUE.equals(user.getIsAdmin()),
                    user.getStatus().name(),
                    user.getBanReason(),
                    user.getBannedAt(),
                    user.getWithdrawnAt(),
                    user.getCreatedAt(),
                    user.getUpdatedAt()
            );
        }
    }

    public record AdminAiUsageSummary(int used, int limit, int remaining) {}

    public record AdminUserActivitySummary(
            long taskCount,
            long routineCount,
            long ideaCount,
            long brainDumpCount
    ) {}
}
