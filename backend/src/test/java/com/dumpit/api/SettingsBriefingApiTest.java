package com.dumpit.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SettingsBriefingApiTest extends ApiIntegrationTestBase {

    @Test
    void 기본값은_브리핑_켜짐() throws Exception {
        mockMvc.perform(get("/me/settings").with(asUser(USER_A)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.briefingEnabled").value(true));
    }

    @Test
    void 브리핑을_끄면_저장되고_다른_설정은_유지된다() throws Exception {
        mockMvc.perform(patch("/me/settings").with(asUser(USER_A))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"briefingEnabled\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.briefingEnabled").value(false))
                .andExpect(jsonPath("$.notificationsEnabled").value(true));

        mockMvc.perform(get("/me/settings").with(asUser(USER_A)))
                .andExpect(jsonPath("$.briefingEnabled").value(false));
    }
}
