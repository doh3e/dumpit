package com.dumpit.api;

import com.dumpit.repository.DeviceTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DeviceApiTest extends ApiIntegrationTestBase {

    @Autowired DeviceTokenRepository deviceTokenRepository;

    private static final String TOKEN = "fcm-token-abc:APA91-def_ghi";

    private void register(String email, String token) throws Exception {
        mockMvc.perform(post("/me/devices").with(asUser(email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"" + token + "\", \"platform\": \"android\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void 등록하면_저장되고_재등록은_중복_없이_갱신된다() throws Exception {
        register(USER_A, TOKEN);
        register(USER_A, TOKEN);
        assertThat(deviceTokenRepository.findAll()).hasSize(1);
    }

    @Test
    void 같은_토큰을_다른_유저가_등록하면_소유가_이전된다() throws Exception {
        register(USER_A, TOKEN);
        register(USER_B, TOKEN);
        var token = deviceTokenRepository.findByTokenWithUser(TOKEN).orElseThrow();
        assertThat(deviceTokenRepository.findAll()).hasSize(1);
        assertThat(token.getUser().getEmail()).isEqualTo(USER_B);
    }

    @Test
    void 삭제는_본인_소유만_지운다() throws Exception {
        register(USER_A, TOKEN);
        mockMvc.perform(delete("/me/devices/{token}", TOKEN).with(asUser(USER_B)))
                .andExpect(status().isNoContent());
        assertThat(deviceTokenRepository.findAll()).hasSize(1);   // B가 지워도 A 것은 남는다

        mockMvc.perform(delete("/me/devices/{token}", TOKEN).with(asUser(USER_A)))
                .andExpect(status().isNoContent());
        assertThat(deviceTokenRepository.findAll()).isEmpty();
    }

    @Test
    void 빈_토큰은_400() throws Exception {
        mockMvc.perform(post("/me/devices").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"\"}"))
                .andExpect(status().isBadRequest());
    }
}
