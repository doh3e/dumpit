package com.dumpit.api;

import com.dumpit.push.PushDispatchService;
import com.dumpit.push.PushSender;
import com.dumpit.repository.DeviceTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 스케줄러의 run()에서 readOnly 트랜잭션을 걷어낸 회귀 고정 — sendToUserDevices가
 * 스케줄러와 같은 무-외곽-트랜잭션 문맥에서 호출돼도 무효 토큰 삭제가 실제 DB에 반영돼야 한다.
 */
class PushInvalidTokenCleanupTest extends ApiIntegrationTestBase {

    @Autowired DeviceTokenRepository deviceTokenRepository;
    @Autowired PushDispatchService pushDispatchService;

    @Test
    void 무효_토큰은_실_DB에서_삭제된다() throws Exception {
        mockMvc.perform(post("/me/devices").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-invalid\", \"platform\": \"android\"}"))
                .andExpect(status().isNoContent());

        when(pushSender.send(any(), any())).thenReturn(PushSender.SendResult.INVALID_TOKEN);

        pushDispatchService.sendToUserDevices(
                userRepository.findByEmail(USER_A).orElseThrow(),
                new PushSender.PushMessage("t", "b", "push-deadline", "home"));

        assertThat(deviceTokenRepository.findAll()).isEmpty();
    }
}
