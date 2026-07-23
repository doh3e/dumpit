package com.dumpit.service.pomodoro;

/**
 * 세션 계획 타임라인에서 "지금까지 완료 가능했던 집중 세트 수" 상한을 계산한다.
 * settle의 어뷰징 방어는 이 상한이 전부다 — 클라이언트 주장(claimed)은 min(claimed, cap)으로만 반영된다.
 * 타임라인 규칙은 웹 pomodoroCycle.js와 동일: 집중 후 휴식, 완료수 % longBreakEvery == 0이면 긴휴식,
 * setsTarget == 1이면 휴식 없음, setsTarget == 0이면 무한.
 */
public final class PomodoroSettleCalculator {

    // claimedSessions 클램프 상한과 동일 — 무한 계획의 폭주 방지
    static final int MAX_SETTLE_SESSIONS = 1000;
    private static final long MAX_GRACE_SECONDS = 60;

    public record Plan(int focusMinutes, int breakMinutes, int longBreakMinutes,
                       int longBreakEvery, int setsTarget) {}

    private PomodoroSettleCalculator() {}

    public static int settleableCap(Plan plan, long elapsedSeconds) {
        long focusSeconds = plan.focusMinutes() * 60L;
        long grace = Math.min(MAX_GRACE_SECONDS, focusSeconds / 5);
        int max = plan.setsTarget() > 0 ? Math.min(plan.setsTarget(), MAX_SETTLE_SESSIONS) : MAX_SETTLE_SESSIONS;

        long offset = 0;
        int cap = 0;
        for (int k = 1; k <= max; k++) {
            offset += focusSeconds;                       // k번째 집중 종료 시점
            if (elapsedSeconds < offset - grace) break;
            cap = k;
            offset += breakSecondsAfter(plan, k);         // 다음 집중 시작까지의 휴식
        }
        return cap;
    }

    private static long breakSecondsAfter(Plan plan, int completedSets) {
        if (plan.setsTarget() == 1) return 0;             // 단일 세트는 휴식 없음 (웹 동일)
        boolean longBreak = plan.longBreakEvery() > 0 && completedSets % plan.longBreakEvery() == 0;
        return (longBreak ? plan.longBreakMinutes() : plan.breakMinutes()) * 60L;
    }
}
