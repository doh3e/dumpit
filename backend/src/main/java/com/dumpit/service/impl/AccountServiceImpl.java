package com.dumpit.service.impl;

import com.dumpit.common.SnapshotText;
import com.dumpit.entity.User;
import com.dumpit.exception.NotFoundException;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.DeviceTokenRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.AccountService;
import com.dumpit.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final ActivityLogService activityLogService;
    private final DeviceTokenRepository deviceTokenRepository;

    // 탈퇴 철회(복구) 대응을 위한 보관 기간. 지나면 계정과 콘텐츠를 완전히 파기한다.
    @Value("${app.retention.withdrawal-grace-days:30}")
    private long graceDays;

    /**
     * 탈퇴 1단계 — 계정을 잠그고 콘텐츠를 소프트 삭제한 뒤 완전 삭제 예정일을 건다.
     * <p>
     * 개인정보 파기와 콘텐츠 삭제는 유예 기간이 지난 뒤 {@code AccountPurgeScheduler}가 수행한다.
     * 여기서 이메일이나 구글 sub를 덮어쓰면 유예 중 돌아온 이용자를 원래 계정에 다시 붙일 수
     * 없어져 복구가 불가능해진다.
     */
    @Override
    @Transactional
    public User withdraw(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        if (!user.isActive()) {
            return user;
        }
        // 관리자 거부는 어떤 데이터도 건드리기 전에 판정한다 — 예전에는 소프트 삭제를 다 돌린 뒤
        // 마지막에 던져서 롤백에만 의존했다.
        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new IllegalStateException("Admin users cannot withdraw through this flow.");
        }

        LocalDateTime markedAt = LocalDateTime.now();
        Map<String, Object> before = withdrawalSnapshot(user);
        int deletedTasks = taskRepository.softDeleteByUser(user, markedAt);
        int deletedRoutines = routineRepository.softDeleteByUser(user, markedAt);
        int deletedIdeas = ideaRepository.softDeleteByUser(user, markedAt);
        int deletedBrainDumps = brainDumpRepository.softDeleteByUser(user, markedAt);

        activityLogService.record(user, "USER_WITHDRAWN", "USER", user.getUserId(), before,
                Map.of(
                        "deletedTasks", deletedTasks,
                        "deletedRoutines", deletedRoutines,
                        "deletedIdeas", deletedIdeas,
                        "deletedBrainDumps", deletedBrainDumps
                ));

        // 유예 중에도 푸시는 즉시 멈춰야 한다 — 기기 토큰만 지금 지운다.
        // 설정·구매·장착 등 나머지 행은 복구 대상이라 purge 단계에서 정리한다.
        deviceTokenRepository.deleteByUser(user);
        user.blockForGrace(markedAt.plusDays(graceDays), markedAt);
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

    // 활동 로그에는 콘텐츠·개인정보 원문을 넣지 않는다는 규약을 여기서도 지킨다 —
    // 예전에는 밴/해제 로그에만 이메일·닉네임이 평문으로 남았다(SnapshotText 참고).
    private Map<String, Object> snapshot(User user) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", user.getUserId());
        SnapshotText.putMasked(values, "email", user.getEmail());
        SnapshotText.putMasked(values, "nickname", user.getNickname());
        values.put("isAdmin", user.getIsAdmin());
        values.put("status", user.getStatus());
        values.put("bannedAt", user.getBannedAt());
        SnapshotText.putMasked(values, "banReason", user.getBanReason());
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
