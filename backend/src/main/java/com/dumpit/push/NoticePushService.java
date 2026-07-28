package com.dumpit.push;

import com.dumpit.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoticePushService {

    static final String CHANNEL_NOTICE = "push-notice";

    private final DeviceTokenRepository deviceTokenRepository;
    private final PushSender pushSender;

    /** 저빈도(운영자 공지 작성 시) 전체 브로드캐스트 — 실패는 로그만 */
    @Async
    @Transactional(readOnly = true)
    public void broadcastNewNotice(String title) {
        for (var device : deviceTokenRepository.findAll()) {
            try {
                pushSender.send(device.getToken(),
                        new PushSender.PushMessage("새 공지사항", title, CHANNEL_NOTICE, "notices"));
            } catch (Exception e) {
                log.warn("공지 푸시 실패 token={}...: {}", device.getToken().substring(0, 8), e.getMessage());
            }
        }
    }
}
