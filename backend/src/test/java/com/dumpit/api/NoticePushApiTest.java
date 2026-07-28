package com.dumpit.api;

import com.dumpit.push.PushSender;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NoticePushApiTest extends ApiIntegrationTestBase {

    @Test
    void 공지를_만들면_등록된_모든_기기로_푸시가_나간다() throws Exception {
        // USER_A 기기 등록
        mockMvc.perform(post("/me/devices").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-a\"}"))
                .andExpect(status().isNoContent());

        // 관리자가 공지 생성 (요청 스키마는 기존 AdminNotice 테스트를 그대로 따른다)
        mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"점검 안내\", \"content\": \"오늘 밤 점검합니다.\"}"))
                .andExpect(status().isCreated());

        // @Async — timeout 대기로 검증
        verify(pushSender, timeout(2000)).send(any(), argThat(m ->
                m.channelId().equals("push-notice") && m.body().contains("점검 안내")));
    }
}
