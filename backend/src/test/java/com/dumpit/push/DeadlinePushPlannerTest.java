package com.dumpit.push;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeadlinePushPlannerTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 29, 14, 0);

    private DeadlinePushPlanner.DueTask task(String id, LocalDateTime deadline) {
        return new DeadlinePushPlanner.DueTask(id, "리포트 쓰기", deadline);
    }

    @Test
    void 이십사시간_창에_들어온_태스크는_첫감지_후보가_된다() {
        var out = DeadlinePushPlanner.plan(List.of(task("t1", NOW.plusHours(10))), List.of(60), NOW);
        assertThat(out).anyMatch(c -> c.dedupKey().endsWith(":first"));
    }

    @Test
    void 임계값은_도래_시점_전후_5분_창에서만_발화한다() {
        // 남은 58분, 임계값 60 → diff -2, 창 안
        var in = DeadlinePushPlanner.plan(List.of(task("t1", NOW.plusMinutes(58))), List.of(60), NOW);
        assertThat(in).anyMatch(c -> c.dedupKey().endsWith(":60"));

        // 남은 120분, 임계값 60 → 아직 멀었음
        var early = DeadlinePushPlanner.plan(List.of(task("t1", NOW.plusMinutes(120))), List.of(60), NOW);
        assertThat(early).noneMatch(c -> c.dedupKey().endsWith(":60"));

        // 남은 50분, 임계값 60 → 창(−5분)을 지나침(재기동 등) — 발화하지 않음
        var late = DeadlinePushPlanner.plan(List.of(task("t1", NOW.plusMinutes(50))), List.of(60), NOW);
        assertThat(late).noneMatch(c -> c.dedupKey().endsWith(":60"));
    }

    @Test
    void 지난_마감은_후보가_아니다() {
        var out = DeadlinePushPlanner.plan(List.of(task("t1", NOW.minusMinutes(10))), List.of(60), NOW);
        assertThat(out).isEmpty();
    }

    @Test
    void 본문에_임계값_라벨이_들어간다() {
        var out = DeadlinePushPlanner.plan(List.of(task("t1", NOW.plusMinutes(59))), List.of(60), NOW);
        var threshold = out.stream().filter(c -> c.dedupKey().endsWith(":60")).findFirst().orElseThrow();
        assertThat(threshold.body()).contains("리포트 쓰기").contains("1시간 전");
    }
}
