package com.dumpit.push;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LoggingPushSender implements PushSender {
    @Override
    public SendResult send(String token, PushMessage message) {
        // body에는 태스크 제목 원문이 실린다 — 로그에 남기지 않는다(title은 고정 문구)
        log.info("[push-log-only] channel={} title={} link={}",
                message.channelId(), message.title(), message.link());
        return SendResult.OK;
    }
}
