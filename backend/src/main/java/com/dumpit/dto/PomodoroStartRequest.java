package com.dumpit.dto;

// 전부 null 허용 — focusMinutes가 null이면 레거시(계획 없는) 시작으로 처리한다
public record PomodoroStartRequest(
        Integer focusMinutes,
        Integer breakMinutes,
        Integer longBreakMinutes,
        Integer longBreakEvery,
        Integer setsTarget
) {}
