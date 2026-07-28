package com.dumpit.push;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 마감 임박 푸시 후보 판정 — 웹 DeadlineNudgeMenu의 발화 시맨틱을 서버로 이식한 순수 로직.
 * 발송·dedup·방해금지는 PushDispatchService 소관.
 */
public final class DeadlinePushPlanner {

    /** 웹 THRESHOLD_WINDOW_MIN 미러 — 스케줄러 공백(재기동 등) 허용 오차 */
    static final int WINDOW_MIN = 5;
    static final int DAY_MIN = 24 * 60;

    static final Map<Integer, String> THRESHOLD_LABELS = Map.of(
            720, "12시간 전", 360, "6시간 전", 180, "3시간 전",
            60, "1시간 전", 30, "30분 전", 10, "10분 전");

    public record DueTask(String taskId, String title, LocalDateTime deadline) {}
    public record Candidate(String dedupKey, String title, String body) {}

    private DeadlinePushPlanner() {}

    public static List<Candidate> plan(List<DueTask> tasks, List<Integer> thresholds, LocalDateTime now) {
        List<Candidate> out = new ArrayList<>();
        for (DueTask task : tasks) {
            long minutesLeft = Duration.between(now, task.deadline()).toMinutes();
            if (minutesLeft <= 0 || minutesLeft > DAY_MIN) continue;

            out.add(new Candidate(key(task, "first"), "Dumpit! 마감 알림",
                    task.title() + " · " + remainingLabel(minutesLeft) + " 마감"));

            for (Integer threshold : thresholds) {
                long diff = minutesLeft - threshold;
                if (diff <= 0 && diff >= -WINDOW_MIN) {
                    out.add(new Candidate(key(task, String.valueOf(threshold)), "Dumpit! 마감 알림",
                            task.title() + " · " + THRESHOLD_LABELS.getOrDefault(threshold, threshold + "분 전") + " 마감 예정"));
                }
            }
        }
        return out;
    }

    private static String key(DueTask task, String suffix) {
        return task.taskId() + ":" + task.deadline() + ":" + suffix;
    }

    private static String remainingLabel(long minutesLeft) {
        if (minutesLeft >= 60) return (minutesLeft / 60) + "시간 후";
        return minutesLeft + "분 후";
    }
}
