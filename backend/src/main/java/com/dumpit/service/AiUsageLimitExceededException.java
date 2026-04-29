package com.dumpit.service;

public class AiUsageLimitExceededException extends RuntimeException {

    public AiUsageLimitExceededException() {
        super("오늘 AI 사용량을 모두 사용했어요. 내일 다시 시도해주세요.");
    }
}
