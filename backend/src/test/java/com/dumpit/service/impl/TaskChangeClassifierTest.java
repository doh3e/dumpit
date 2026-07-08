package com.dumpit.service.impl;

import com.dumpit.entity.Task;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TaskChangeClassifierTest {

    private Map<String, Object> baseSnapshot() {
        Map<String, Object> m = new HashMap<>();
        m.put("status", Task.Status.TODO);
        m.put("category", Task.Category.WORK);
        m.put("deadline", LocalDateTime.of(2026, 7, 10, 23, 59));
        m.put("startTime", null);
        m.put("endTime", null);
        m.put("estimatedMinutes", 60);
        m.put("userPriorityScore", null);
        m.put("titleLength", 10);
        m.put("descriptionLength", null);
        return m;
    }

    @Test
    void 완료_전환은_TASK_COMPLETED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.DONE);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_COMPLETED");
    }

    @Test
    void 완료_해제는_TASK_REOPENED() {
        Map<String, Object> before = baseSnapshot();
        before.put("status", Task.Status.DONE);
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.TODO);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_REOPENED");
    }

    @Test
    void 진행_시작은_TASK_STARTED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.IN_PROGRESS);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_STARTED");
    }

    @Test
    void 그_외_상태_변경은_TASK_STATUS_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.CANCELLED);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_STATUS_CHANGED");
    }

    @Test
    void 마감_변경은_TASK_RESCHEDULED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("deadline", LocalDateTime.of(2026, 7, 12, 23, 59));

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_RESCHEDULED");
    }

    @Test
    void 사용자_우선순위_변경은_TASK_PRIORITY_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("userPriorityScore", 0.9);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_PRIORITY_CHANGED");
    }

    @Test
    void 카테고리_변경은_TASK_CATEGORY_CHANGED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("category", Task.Category.HEALTH);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_CATEGORY_CHANGED");
    }

    @Test
    void 제목_길이_변경은_TASK_CONTENT_UPDATED() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("titleLength", 25);

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_CONTENT_UPDATED");
    }

    @Test
    void 변경_없으면_TASK_UPDATED() {
        assertThat(TaskChangeClassifier.classify(baseSnapshot(), baseSnapshot())).isEqualTo("TASK_UPDATED");
    }

    @Test
    void 완료와_일정_변경이_섞이면_완료가_우선한다() {
        Map<String, Object> before = baseSnapshot();
        Map<String, Object> after = baseSnapshot();
        after.put("status", Task.Status.DONE);
        after.put("deadline", LocalDateTime.of(2026, 7, 12, 23, 59));

        assertThat(TaskChangeClassifier.classify(before, after)).isEqualTo("TASK_COMPLETED");
    }
}
