package com.dumpit.push;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LoggingPushSender implements PushSender {
    @Override
    public SendResult send(String token, PushMessage message) {
        log.info("[push-log-only] channel={} title={} body={} link={}",
                message.channelId(), message.title(), message.body(), message.link());
        return SendResult.OK;
    }
}
