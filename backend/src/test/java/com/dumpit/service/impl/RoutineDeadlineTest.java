package com.dumpit.service.impl;

import com.dumpit.common.ActiveHours;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class RoutineDeadlineTest {

    private static final LocalDate DATE = LocalDate.of(2026, 7, 24);
    private static final LocalDateTime MORNING = DATE.atTime(6, 0);

    @Test
    void 종료시각_미지정_루틴의_기본_마감은_활동_종료_시각이다() {
        assertThat(RoutineServiceImpl.defaultDeadline(new ActiveHours(9, 22), DATE, null, MORNING))
                .isEqualTo(DATE.atTime(22, 0));
    }

    @Test
    void 야행성_wrap_일과는_다음날_새벽이_마감이다() {
        assertThat(RoutineServiceImpl.defaultDeadline(new ActiveHours(22, 5), DATE, null, MORNING))
                .isEqualTo(DATE.plusDays(1).atTime(5, 0));
    }

    @Test
    void 활동_종료가_이미_지났으면_종전_기본_2359로_폴백한다() {
        LocalDateTime lateNight = DATE.atTime(23, 0);
        assertThat(RoutineServiceImpl.defaultDeadline(new ActiveHours(9, 22), DATE, null, lateNight))
                .isEqualTo(DATE.atTime(23, 59));
    }

    @Test
    void 시작시각이_활동_종료보다_늦으면_2359로_폴백한다() {
        assertThat(RoutineServiceImpl.defaultDeadline(new ActiveHours(9, 22), DATE, LocalTime.of(23, 0), MORNING))
                .isEqualTo(DATE.atTime(23, 59));
    }
}
