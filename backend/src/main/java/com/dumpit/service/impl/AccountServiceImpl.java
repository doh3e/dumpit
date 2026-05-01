package com.dumpit.service.impl;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.Inquiry;
import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.InquiryRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AccountService;
import com.dumpit.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final RoutineRepository routineRepository;
    private final IdeaRepository ideaRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final InquiryRepository inquiryRepository;
    private final ActivityLogService activityLogService;

    @Override
    @Transactional
    public User withdraw(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        if (!user.isActive()) {
            return user;
        }

        LocalDateTime deletedAt = LocalDateTime.now();
        Map<String, Object> before = withdrawalSnapshot(user);
        int deletedTasks = taskRepository.softDeleteByUser(user, deletedAt);
        int deletedRoutines = routineRepository.softDeleteByUser(user, deletedAt);
        int deletedIdeas = ideaRepository.softDeleteByUser(user, deletedAt);

        int deletedBrainDumps = 0;
        for (BrainDump brainDump : brainDumpRepository.findByUserAndDeletedAtIsNull(user)) {
            brainDump.anonymizeAndDelete();
            deletedBrainDumps++;
        }

        for (Inquiry inquiry : inquiryRepository.findByUser(user)) {
            inquiry.anonymizeUser();
        }

        activityLogService.record(user, "USER_WITHDRAWN", "USER", user.getUserId(), before,
                Map.of(
                        "deletedTasks", deletedTasks,
                        "deletedRoutines", deletedRoutines,
                        "deletedIdeas", deletedIdeas,
                        "deletedBrainDumps", deletedBrainDumps
                ));

        user.withdraw();
        return userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> getUsersForAdmin() {
        return userRepository.findAllForAdmin();
    }

    @Override
    @Transactional
    public User banUser(UUID userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        Map<String, Object> before = snapshot(user);
        user.ban(reason);
        User saved = userRepository.save(user);
        activityLogService.record(saved, "USER_BANNED", "USER", saved.getUserId(), before, snapshot(saved));
        return saved;
    }

    @Override
    @Transactional
    public User unbanUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        Map<String, Object> before = snapshot(user);
        user.unban();
        User saved = userRepository.save(user);
        activityLogService.record(saved, "USER_UNBANNED", "USER", saved.getUserId(), before, snapshot(saved));
        return saved;
    }

    private Map<String, Object> snapshot(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", user.getUserId());
        values.put("email", user.getEmail());
        values.put("nickname", user.getNickname());
        values.put("isAdmin", user.getIsAdmin());
        values.put("status", user.getStatus());
        values.put("bannedAt", user.getBannedAt());
        values.put("banReason", user.getBanReason());
        values.put("withdrawnAt", user.getWithdrawnAt());
        return values;
    }

    private Map<String, Object> withdrawalSnapshot(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", user.getUserId());
        values.put("status", user.getStatus());
        values.put("isAdmin", user.getIsAdmin());
        return values;
    }
}
