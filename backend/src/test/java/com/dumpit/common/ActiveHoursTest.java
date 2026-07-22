package com.dumpit.common;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ActiveHoursTest {

    private final ActiveHours day = new ActiveHours(9, 22);
    private final ActiveHours night = new ActiveHours(22, 6);

    @Test
    void 기본형은_시작_포함_종료_미포함이다() {
        assertThat(day.wraps()).isFalse();
        assertThat(day.contains(9)).isTrue();
        assertThat(day.contains(21)).isTrue();
        assertThat(day.contains(22)).isFalse();
        assertThat(day.contains(8)).isFalse();
    }

    @Test
    void 자정을_넘기면_밤과_새벽이_활동창이다() {
        assertThat(night.wraps()).isTrue();
        assertThat(night.contains(22)).isTrue();
        assertThat(night.contains(23)).isTrue();
        assertThat(night.contains(0)).isTrue();
        assertThat(night.contains(5)).isTrue();
        assertThat(night.contains(6)).isFalse();
        assertThat(night.contains(12)).isFalse();
    }

    @Test
    void 활동_시작_후_첫_n시간_판정() {
        assertThat(day.inFirstHours(9, 2)).isTrue();
        assertThat(day.inFirstHours(10, 2)).isTrue();
        assertThat(day.inFirstHours(11, 2)).isFalse();
        assertThat(night.inFirstHours(22, 2)).isTrue();
        assertThat(night.inFirstHours(23, 2)).isTrue();
        assertThat(night.inFirstHours(0, 2)).isFalse();
    }

    @Test
    void 활동_종료_전_마지막_n시간_판정() {
        assertThat(day.inLastHours(20, 2)).isTrue();
        assertThat(day.inLastHours(21, 2)).isTrue();
        assertThat(day.inLastHours(19, 2)).isFalse();
        assertThat(day.inLastHours(22, 2)).isFalse();
        assertThat(night.inLastHours(4, 2)).isTrue();
        assertThat(night.inLastHours(5, 2)).isTrue();
        assertThat(night.inLastHours(3, 2)).isFalse();
    }

    @Test
    void 하루_끝은_활동_종료_시각이고_wrap이면_다음날이다() {
        LocalDate date = LocalDate.of(2026, 7, 22);
        assertThat(day.dayEnd(date)).isEqualTo(LocalDateTime.of(2026, 7, 22, 22, 0));
        assertThat(night.dayEnd(date)).isEqualTo(LocalDateTime.of(2026, 7, 23, 6, 0));
    }
}
