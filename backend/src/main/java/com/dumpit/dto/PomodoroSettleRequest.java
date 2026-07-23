package com.dumpit.dto;

public record PomodoroSettleRequest(
        Integer claimedSessions,
        Boolean finished
) {}
