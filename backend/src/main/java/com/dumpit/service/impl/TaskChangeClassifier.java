package com.dumpit.service.impl;

import com.dumpit.entity.Task;

import java.util.Map;
import java.util.Objects;

/**
 * TASK_UPDATED 하나에 뭉쳐 있던 변경을 세분화된 액션으로 분류한다.
 * 변경이 여러 종류 섞이면 학습 신호 가치가 큰 순서로 대표 액션 하나를 고른다:
 * 완료 > 재오픈 > 시작 > 상태 > 일정 > 우선순위 > 카테고리 > 내용.
 * 스냅샷에는 원문 대신 길이(titleLength 등)만 있으므로, 길이가 같은 내용 수정은 감지하지 못한다.
 */
final class TaskChangeClassifier {

    private TaskChangeClassifier() {}

    static String classify(Map<String, Object> before, Map<String, Object> after) {
        Object prevStatus = before.get("status");
        Object nextStatus = after.get("status");
        if (!Objects.equals(prevStatus, nextStatus)) {
            if (Task.Status.DONE.equals(nextStatus)) return "TASK_COMPLETED";
            if (Task.Status.DONE.equals(prevStatus)) return "TASK_REOPENED";
            if (Task.Status.IN_PROGRESS.equals(nextStatus)) return "TASK_STARTED";
            return "TASK_STATUS_CHANGED";
        }
        if (changed(before, after, "deadline") || changed(before, after, "startTime")
                || changed(before, after, "endTime") || changed(before, after, "estimatedMinutes")) {
            return "TASK_RESCHEDULED";
        }
        if (changed(before, after, "userPriorityScore")) return "TASK_PRIORITY_CHANGED";
        if (changed(before, after, "category")) return "TASK_CATEGORY_CHANGED";
        if (changed(before, after, "titleLength") || changed(before, after, "descriptionLength")) {
            return "TASK_CONTENT_UPDATED";
        }
        return "TASK_UPDATED";
    }

    private static boolean changed(Map<String, Object> before, Map<String, Object> after, String key) {
        return !Objects.equals(before.get(key), after.get(key));
    }
}
