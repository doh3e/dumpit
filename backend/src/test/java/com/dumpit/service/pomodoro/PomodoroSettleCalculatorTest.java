package com.dumpit.service.pomodoro;

import org.junit.jupiter.api.Test;

import static com.dumpit.service.pomodoro.PomodoroSettleCalculator.Plan;
import static com.dumpit.service.pomodoro.PomodoroSettleCalculator.settleableCap;
import static org.assertj.core.api.Assertions.assertThat;

class PomodoroSettleCalculatorTest {

    // 웹 기본 설정: 집중 25 · 휴식 5 · 긴휴식 15 · 4세트마다
    private static final Plan P25 = new Plan(25, 5, 15, 4, 4);

    @Test
    void 첫_세트는_집중시간에서_grace를_뺀_경과부터_정산_가능하다() {
        // 25분 = 1500초, grace = min(60, 1500/5) = 60초 → 1440초부터
        assertThat(settleableCap(P25, 1439)).isZero();
        assertThat(settleableCap(P25, 1440)).isEqualTo(1);
        assertThat(settleableCap(P25, 1500)).isEqualTo(1);
    }

    @Test
    void 둘째_세트는_휴식을_건너뛴_시각부터다() {
        // 집중25 + 휴식5 + 집중25 = 55분 = 3300초, grace 60 → 3240초부터 2세트
        assertThat(settleableCap(P25, 3239)).isEqualTo(1);
        assertThat(settleableCap(P25, 3240)).isEqualTo(2);
    }

    @Test
    void 유한_세트는_setsTarget이_상한이다() {
        assertThat(settleableCap(P25, 1_000_000_000L)).isEqualTo(4);
    }

    @Test
    void 긴휴식_주기가_타임라인에_반영된다() {
        // every=2, 무한: 집중25·휴식5·집중25·긴휴식15·집중25 = 95분 = 5700초 → grace 60 → 5640초부터 3세트
        Plan p = new Plan(25, 5, 15, 2, 0);
        assertThat(settleableCap(p, 5639)).isEqualTo(2);
        assertThat(settleableCap(p, 5640)).isEqualTo(3);
    }

    @Test
    void 단일_세트는_휴식이_없고_1이_상한이다() {
        Plan p = new Plan(25, 5, 15, 4, 1);
        assertThat(settleableCap(p, 1440)).isEqualTo(1);
        assertThat(settleableCap(p, 1_000_000_000L)).isEqualTo(1);
    }

    @Test
    void 짧은_세션은_grace가_비례_축소된다() {
        // 1분 세션: grace = min(60, 60/5) = 12초 → 48초부터 (60초 고정이면 0초 즉시 통과 회귀)
        Plan p = new Plan(1, 5, 15, 4, 0);
        assertThat(settleableCap(p, 47)).isZero();
        assertThat(settleableCap(p, 48)).isEqualTo(1);
    }

    @Test
    void 무한_세트도_안전_상한_1000을_넘지_않는다() {
        Plan p = new Plan(1, 1, 1, 4, 0);
        assertThat(settleableCap(p, Long.MAX_VALUE / 2)).isEqualTo(1000);
    }
}
