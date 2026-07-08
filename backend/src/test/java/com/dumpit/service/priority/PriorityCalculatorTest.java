package com.dumpit.service.priority;

import com.dumpit.entity.Task;
import com.dumpit.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class PriorityCalculatorTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 7, 12, 0);

    private Task task(Double userScore, Double aiScore, LocalDateTime deadline) {
        Task t = Task.of(new User(), "t", null, deadline, null);
        t.setUserPriorityScore(userScore);
        t.setAiPriorityScore(aiScore);
        return t;
    }

    @Test
    void 사용자_지정_점수가_있으면_그_값을_그대로_쓴다() {
        Task t = task(0.9, 0.1, NOW.plusDays(30));
        assertThat(PriorityCalculator.effectivePriority(t, NOW)).isEqualTo(0.9);
    }

    @Test
    void 긴급도와_중요도를_가중_합성한다() {
        // 마감 지남(긴급도 1.0), 중요도 0.5 → 0.6*1.0 + 0.4*0.5 = 0.8
        Task t = task(null, 0.5, NOW.minusHours(1));
        assertThat(PriorityCalculator.effectivePriority(t, NOW)).isEqualTo(0.8, within(1e-9));
    }

    @Test
    void 중요도가_없으면_기본값_0_5를_쓴다() {
        Task overdue = task(null, null, NOW.minusHours(1));
        assertThat(PriorityCalculator.effectivePriority(overdue, NOW)).isEqualTo(0.8, within(1e-9));
    }

    @Test
    void 마감이_가까울수록_긴급도가_높다() {
        double overdue = PriorityCalculator.urgencyScore(NOW.minusMinutes(1), NOW);
        double inOneHour = PriorityCalculator.urgencyScore(NOW.plusMinutes(30), NOW);
        double today = PriorityCalculator.urgencyScore(NOW.plusHours(10), NOW);
        double in3Days = PriorityCalculator.urgencyScore(NOW.plusDays(2), NOW);
        double in7Days = PriorityCalculator.urgencyScore(NOW.plusDays(5), NOW);
        double later = PriorityCalculator.urgencyScore(NOW.plusDays(30), NOW);
        double none = PriorityCalculator.urgencyScore(null, NOW);

        assertThat(overdue).isEqualTo(1.0);
        assertThat(inOneHour).isLessThan(overdue);
        assertThat(today).isLessThan(inOneHour);
        assertThat(in3Days).isLessThan(today);
        assertThat(in7Days).isLessThan(in3Days);
        assertThat(later).isLessThan(in7Days);
        assertThat(none).isLessThan(later);
    }

    @Test
    void 같은_태스크라도_시간이_지나면_우선순위가_올라간다() {
        Task t = task(null, 0.5, NOW.plusDays(2));
        Double early = PriorityCalculator.effectivePriority(t, NOW);
        Double nearDeadline = PriorityCalculator.effectivePriority(t, NOW.plusDays(2).minusMinutes(30));
        assertThat(nearDeadline).isGreaterThan(early);
    }
}
