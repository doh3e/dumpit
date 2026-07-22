package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.GoogleUserUpserter.AccountInactiveException;
import com.dumpit.service.impl.GoogleUserUpserterImpl;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class GoogleUserUpserterTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final GoogleUserUpserter upserter = new GoogleUserUpserterImpl(userRepository);

    @Test
    void 신규_유저를_생성한다() {
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        User user = upserter.upsert("sub-1", "new@a.b", "새유저", "https://pic");

        assertThat(user.getEmail()).isEqualTo("new@a.b");
        assertThat(user.getProvider()).isEqualTo("GOOGLE");
    }

    @Test
    void 기존_유저는_사진만_갱신한다() {
        User existing = User.of("old@a.b", "기존", "GOOGLE", "sub-1");
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(existing));
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        User user = upserter.upsert("sub-1", "new@a.b", "새이름", "https://pic2");

        assertThat(user.getEmail()).isEqualTo("old@a.b"); // 이메일·닉네임은 유지
        assertThat(user.getPicture()).isEqualTo("https://pic2");
    }

    @Test
    void 비활성_유저는_예외() {
        User banned = User.of("ban@a.b", "밴", "GOOGLE", "sub-1");
        banned.ban("test"); // User.ban(String reason) — isActive()가 false가 된다
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(banned));

        assertThatThrownBy(() -> upserter.upsert("sub-1", "ban@a.b", "밴", null))
                .isInstanceOf(AccountInactiveException.class);
    }
}
