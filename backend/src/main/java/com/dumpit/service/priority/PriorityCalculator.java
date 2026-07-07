package com.dumpit.service.priority;

import com.dumpit.entity.Task;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 조회 시점에 규칙 기반 긴급도와 AI 중요도를 합성해 우선순위를 계산한다.
 * - userPriorityScore가 있으면 무조건 그 값을 쓴다 (사용자 통제권 우선).
 * - 긴급도는 마감까지 남은 시간으로 결정적으로 계산되므로 시간이 지나면 자동으로 올라간다.
 * - aiPriorityScore는 LLM이 평가한 "중요도"다 (프롬프트 priority-v2부터 긴급도 미반영).
 */
public final class PriorityCalculator {

    static final double URGENCY_WEIGHT = 0.6;
    static final double IMPORTANCE_WEIGHT = 0.4;
    static final double DEFAULT_IMPORTANCE = 0.5;
    static final double NO_DEADLINE_URGENCY = 0.15;

    private PriorityCalculator() {}

    public static Double effectivePriority(Task task, LocalDateTime now) {
        if (task.getUserPriorityScore() != null) {
            return task.getUserPriorityScore();
        }
        double importance = task.getAiPriorityScore() != null ? task.getAiPriorityScore() : DEFAULT_IMPORTANCE;
        double urgency = urgencyScore(task.getDeadline(), now);
        return URGENCY_WEIGHT * urgency + IMPORTANCE_WEIGHT * importance;
    }

    static double urgencyScore(LocalDateTime deadline, LocalDateTime now) {
        if (deadline == null) return NO_DEADLINE_URGENCY;
        long minutesLeft = Duration.between(now, deadline).toMinutes();
        if (minutesLeft <= 0) return 1.0;
        if (minutesLeft <= 60) return 0.95;
        if (minutesLeft <= 60 * 24) return 0.85;
        if (minutesLeft <= 60 * 24 * 3) return 0.6;
        if (minutesLeft <= 60 * 24 * 7) return 0.4;
        return 0.25;
    }
}
