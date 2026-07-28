package com.dumpit.api;

import com.dumpit.push.PushSender;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

    @Test
    void 푸시_실패해도_다음_기기로_계속_발송된다() throws Exception {
        // 두 기기 등록 (USER_A, USER_B)
        mockMvc.perform(post("/me/devices").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-a\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/me/devices").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-b\"}"))
                .andExpect(status().isNoContent());

        // 첫 번째 호출은 ERROR, 두 번째는 OK
        when(pushSender.send(any(), any()))
                .thenReturn(PushSender.SendResult.ERROR)
                .thenReturn(PushSender.SendResult.OK);

        // 관리자가 공지 생성
        mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"점검 안내\", \"content\": \"오늘 밤 점검합니다.\"}"))
                .andExpect(status().isCreated());

        // @Async — 두 기기 모두 send() 호출됨 (실패해도 계속)
        verify(pushSender, timeout(2000).times(2)).send(any(), any());
    }

    @Test
    void 예외_발생해도_다음_기기로_계속_발송된다() throws Exception {
        // 두 기기 등록
        mockMvc.perform(post("/me/devices").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-a\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/me/devices").with(asUser(USER_B))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"tok-b\"}"))
                .andExpect(status().isNoContent());

        // 첫 번째 호출은 예외, 두 번째는 OK
        when(pushSender.send(any(), any()))
                .thenThrow(new RuntimeException("Network error"))
                .thenReturn(PushSender.SendResult.OK);

        // 관리자가 공지 생성
        mockMvc.perform(post("/admin/notices").with(asUser(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"점검 안내\", \"content\": \"오늘 밤 점검합니다.\"}"))
                .andExpect(status().isCreated());

        // @Async — 두 기기 모두 send() 호출됨 (예외 발생해도 계속)
        verify(pushSender, timeout(2000).times(2)).send(any(), any());
    }
}
