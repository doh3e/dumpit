package com.dumpit.service;

import java.time.OffsetDateTime;

import com.dumpit.entity.User;

public interface AiUsageService {

    int DAILY_LIMIT = 100;

    enum UsageType {
        TASK_PRIORITY(1),
        TASK_REANALYZE(1),
        SUBTASK_PROPOSAL(3),
        BRAIN_DUMP(5);

        private final int cost;

        UsageType(int cost) {
            this.cost = cost;
        }

        public int cost() {
            return cost;
        }
    }

    AiUsageStatus getStatus(String email);

    AiUsageStatus getStatusForUser(User user);

    AiUsageStatus consume(String email, UsageType usageType);

    record AiUsageStatus(
            int used,
            int limit,
            int remaining,
            OffsetDateTime resetAt
    ) {}
}
