package com.dumpit.push;

import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class FcmPushSender implements PushSender {

    private final FirebaseMessaging messaging;

    @Override
    public SendResult send(String token, PushMessage message) {
        Message fcm = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(message.title()).setBody(message.body()).build())
                .setAndroidConfig(AndroidConfig.builder()
                        .setNotification(AndroidNotification.builder()
                                .setChannelId(message.channelId()).build())
                        .build())
                .putData("link", message.link())
                .putData("channelId", message.channelId())
                .build();
        try {
            messaging.send(fcm);
            return SendResult.OK;
        } catch (FirebaseMessagingException e) {
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                    || e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                return SendResult.INVALID_TOKEN;
            }
            log.warn("FCM 발송 실패: {}", e.getMessagingErrorCode(), e);
            return SendResult.ERROR;
        }
    }
}
