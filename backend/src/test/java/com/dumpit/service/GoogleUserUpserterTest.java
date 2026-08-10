package com.dumpit.service;

import com.dumpit.entity.User;
import com.dumpit.repository.UserRepository;
import com.dumpit.service.GoogleUserUpserter.AccountInactiveException;
import com.dumpit.service.impl.GoogleUserUpserterImpl;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class GoogleUserUpserterTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AccountRestoreService accountRestoreService = mock(AccountRestoreService.class);
    private final GoogleUserUpserter upserter =
            new GoogleUserUpserterImpl(userRepository, accountRestoreService);

    @Test
    void 신규_유저를_생성한다() {
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "new@a.b", "새유저", "https://pic");

        assertThat(result.user().getEmail()).isEqualTo("new@a.b");
        assertThat(result.user().getProvider()).isEqualTo("GOOGLE");
        assertThat(result.restored()).isFalse();
    }

    @Test
    void 기존_유저는_사진만_갱신한다() {
        User existing = User.of("old@a.b", "기존", "GOOGLE", "sub-1");
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(existing));
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "new@a.b", "새이름", "https://pic2");

        assertThat(result.user().getEmail()).isEqualTo("old@a.b"); // 이메일·닉네임은 유지
        assertThat(result.user().getPicture()).isEqualTo("https://pic2");
        assertThat(result.restored()).isFalse();
    }

    @Test
    void 밴_유저는_예외() {
        User banned = User.of("ban@a.b", "밴", "GOOGLE", "sub-1");
        banned.ban("test"); // User.ban(String reason) — isActive()가 false가 된다
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(banned));

        assertThatThrownBy(() -> upserter.upsert("sub-1", "ban@a.b", "밴", null))
                .isInstanceOf(AccountInactiveException.class);
    }

    @Test
    void 유예_안에_돌아온_탈퇴계정은_복구한다() {
        User withdrawn = User.of("back@a.b", "복귀", "GOOGLE", "sub-1");
        LocalDateTime markedAt = LocalDateTime.now();
        withdrawn.blockForGrace(markedAt.plusDays(30), markedAt);
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(withdrawn));
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));
        given(accountRestoreService.restore(withdrawn)).willAnswer(inv -> {
            withdrawn.restoreFromWithdrawal();
            return withdrawn;
        });

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "back@a.b", "복귀", "https://pic");

        assertThat(result.restored()).isTrue();
        assertThat(result.user().getStatus()).isEqualTo(User.Status.ACTIVE);
        verify(accountRestoreService).restore(withdrawn);
    }

    @Test
    void 유예가_끝난_탈퇴계정은_복구하지_않고_예외() {
        User withdrawn = User.of("gone@a.b", "만료", "GOOGLE", "sub-1");
        LocalDateTime markedAt = LocalDateTime.now().minusDays(40);
        withdrawn.blockForGrace(markedAt.plusDays(30), markedAt); // purgeAfter가 이미 지났다
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(withdrawn));

        assertThatThrownBy(() -> upserter.upsert("sub-1", "gone@a.b", "만료", null))
                .isInstanceOf(AccountInactiveException.class);
        verify(accountRestoreService, never()).restore(any());
    }
}
