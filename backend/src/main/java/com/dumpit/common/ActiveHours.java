package com.dumpit.common;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 사용자 활동시간 창 [startHour, endHour). start > end면 자정을 넘겨 다음날 새벽까지 이어진다. */
public record ActiveHours(int startHour, int endHour) {

    public static final ActiveHours DEFAULT = new ActiveHours(9, 22);

    public boolean wraps() {
        return startHour > endHour;
    }

    public boolean contains(int hour) {
        if (wraps()) return hour >= startHour || hour < endHour;
        return hour >= startHour && hour < endHour;
    }

    public boolean inFirstHours(int hour, int n) {
        if (!contains(hour)) return false;
        return Math.floorMod(hour - startHour, 24) < n;
    }

    public boolean inLastHours(int hour, int n) {
        if (!contains(hour)) return false;
        int toEnd = Math.floorMod(endHour - hour, 24);
        return toEnd >= 1 && toEnd <= n;
    }

    /** date의 '하루 끝'(활동 종료 시각). wrap이면 다음날 새벽으로 넘어간다. */
    public LocalDateTime dayEnd(LocalDate date) {
        LocalDate d = wraps() ? date.plusDays(1) : date;
        return d.atTime(endHour, 0);
    }
}
