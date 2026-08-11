package com.dumpit.push;

public interface PushSender {
    enum SendResult { OK, INVALID_TOKEN, ERROR }
    record PushMessage(String title, String body, String channelId, String link) {}
    SendResult send(String token, PushMessage message);
}
