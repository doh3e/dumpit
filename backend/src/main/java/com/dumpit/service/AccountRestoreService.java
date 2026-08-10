package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.repository.BrainDumpRepository;
import com.dumpit.repository.IdeaRepository;
import com.dumpit.repository.RoutineRepository;
import com.dumpit.repository.TaskRepository;
import com.dumpit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 유예 기간 안에 돌아온 계정을 되살린다.
 * <p>
 * 복구 대상은 {@code users.withdrawal_marked_at}과 삭제 시각이 정확히 일치하는 행뿐이다.
 * {@code deletedAt}만 보고 되살리면 이용자가 탈퇴 전에 스스로 지운 항목까지 부활한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountRestoreService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final RoutineRepository routineRepository;
    private final IdeaRepository ideaRepository;
    private final BrainDumpRepository brainDumpRepository;
    private final ActivityLogService activityLogService;

    @Transactional
    public User restore(User user) {
        LocalDateTime markedAt = user.getWithdrawalMarkedAt();
        int tasks = 0, routines = 0, ideas = 0, brainDumps = 0;

        // 탈퇴 마킹 시각이 없는 계정은 구(舊) 방식으로 탈퇴한 행이라 복구 기준이 없다.
        // 상태만 되돌리고 콘텐츠는 손대지 않는다 — 잘못 되살리는 것보다 안전하다.
        if (markedAt != null) {
            tasks = taskRepository.restoreByUser(user, markedAt);
            routines = routineRepository.restoreByUser(user, markedAt);
            ideas = ideaRepository.restoreByUser(user, markedAt);
            brainDumps = brainDumpRepository.restoreByUser(user, markedAt);
        }

        Map<String, Object> before = new LinkedHashMap<>();
        before.put("status", user.getStatus());
        before.put("withdrawnAt", user.getWithdrawnAt());
        before.put("purgeAfter", user.getPurgeAfter());

        user.restoreFromWithdrawal();
        User saved = userRepository.save(user);

        activityLogService.record(saved, "USER_RESTORED", "USER", saved.getUserId(), before,
                Map.of(
                        "restoredTasks", tasks,
                        "restoredRoutines", routines,
                        "restoredIdeas", ideas,
                        "restoredBrainDumps", brainDumps
                ));
        log.info("Account restored within grace period: userId={}", saved.getUserId());
        return saved;
    }
}
