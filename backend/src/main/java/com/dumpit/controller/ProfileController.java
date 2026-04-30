package com.dumpit.controller;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final IdeaRepository ideaRepository;

    @GetMapping("/me/profile")
    public ResponseEntity<ProfileResponse> getProfile(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(toProfileResponse(user));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<ProfileResponse> updateProfile(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestBody ProfileUpdateRequest req) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();

        if (req.bio() != null) {
            user.updateBio(req.bio().length() > 500 ? req.bio().substring(0, 500) : req.bio());
        }
        if (req.nickname() != null && !req.nickname().isBlank()) {
            user.updateNickname(req.nickname().length() > 50 ? req.nickname().substring(0, 50) : req.nickname());
        }
        userRepository.save(user);
        return ResponseEntity.ok(toProfileResponse(user));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<StatsResponse> getStats(@AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();

        long totalDone = taskRepository.countByUserAndStatusAndDeletedAtIsNull(user, Task.Status.DONE);
        long totalTodo = taskRepository.countByUserAndStatusAndDeletedAtIsNull(user, Task.Status.TODO);
        long totalInProgress = taskRepository.countByUserAndStatusAndDeletedAtIsNull(user, Task.Status.IN_PROGRESS);

        List<Object[]> categoryRows = taskRepository.countDoneByCategory(user);
        Map<String, Long> categoryBreakdown = new LinkedHashMap<>();
        for (Object[] row : categoryRows) {
            Task.Category cat = (Task.Category) row[0];
            Long count = (Long) row[1];
            categoryBreakdown.put(cat.name(), count);
        }

        LocalDate heatmapStart = LocalDate.now().minusWeeks(28);
        List<LocalDateTime> completedAts = taskRepository.findCompletedAtSince(user, heatmapStart.atStartOfDay());

        Map<LocalDate, Long> completedCountByDate = completedAts.stream()
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.groupingBy(date -> date, LinkedHashMap::new, Collectors.counting()));

        Set<LocalDate> doneDays = completedCountByDate.keySet();

        int streak = calcStreak(doneDays);

        Map<String, Integer> heatmap = new LinkedHashMap<>();
        for (LocalDate d = heatmapStart; !d.isAfter(LocalDate.now()); d = d.plusDays(1)) {
            heatmap.put(d.toString(), completedCountByDate.getOrDefault(d, 0L).intValue());
        }

        long brainDumpCount = brainDumpRepository.countByUser(user);
        long ideaCount = ideaRepository.countByUserAndDeletedAtIsNull(user);

        return ResponseEntity.ok(new StatsResponse(
                totalDone, totalTodo, totalInProgress,
                categoryBreakdown, streak, heatmap,
                brainDumpCount, ideaCount,
                user.getCoinBalance()
        ));
    }

    @GetMapping("/tasks/overdue")
    public ResponseEntity<List<OverdueTaskResponse>> getOverdueTasks(
            @AuthenticationPrincipal OAuth2User principal) {
        User user = resolveUser(principal);
        if (user == null) return ResponseEntity.status(401).build();

        List<Task> overdue = taskRepository.findOverdueTasks(user, LocalDateTime.now());
        List<OverdueTaskResponse> result = overdue.stream()
                .map(t -> new OverdueTaskResponse(
                        t.getTaskId(), t.getTitle(), t.getCategory().name(),
                        t.getDeadline(), t.getEstimatedMinutes()))
                .toList();
        return ResponseEntity.ok(result);
    }

    private int calcStreak(Set<LocalDate> doneDays) {
        int streak = 0;
        LocalDate day = LocalDate.now();
        while (doneDays.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    private User resolveUser(OAuth2User principal) {
        if (principal == null) return null;
        String email = principal.getAttribute("email");
        return userRepository.findByEmail(email).orElse(null);
    }

    private ProfileResponse toProfileResponse(User user) {
        return new ProfileResponse(
                user.getEmail(),
                user.getNickname(),
                user.getPicture(),
                user.getBio(),
                user.getCoinBalance()
        );
    }

    public record ProfileResponse(String email, String nickname, String picture, String bio, int coinBalance) {}
    public record ProfileUpdateRequest(String bio, String nickname) {}
    public record StatsResponse(
            long totalDone, long totalTodo, long totalInProgress,
            Map<String, Long> categoryBreakdown, int streak, Map<String, Integer> heatmap,
            long brainDumpCount, long ideaCount, int coinBalance) {}
    public record OverdueTaskResponse(
            UUID taskId, String title, String category,
            LocalDateTime deadline, Integer estimatedMinutes) {}
}
