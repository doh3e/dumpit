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

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "new@a.b", "새유저", "https://pic", true);

        assertThat(result.user().getEmail()).isEqualTo("new@a.b");
        assertThat(result.user().getProvider()).isEqualTo("GOOGLE");
        assertThat(result.restored()).isFalse();
    }

    @Test
    void 기존_유저는_사진만_갱신한다() {
        User existing = User.of("old@a.b", "기존", "GOOGLE", "sub-1");
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(existing));
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "new@a.b", "새이름", "https://pic2", true);

        assertThat(result.user().getEmail()).isEqualTo("old@a.b"); // 이메일·닉네임은 유지
        assertThat(result.user().getPicture()).isEqualTo("https://pic2");
        assertThat(result.restored()).isFalse();
    }

    @Test
    void 활성_유저는_복구불가_로그인이어도_그대로_로그인된다() {
        User existing = User.of("old@a.b", "기존", "GOOGLE", "sub-1");
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(existing));
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        // allowRestore=false는 탈퇴 철회만 막는다 — 세션 만료 후 자동 재로그인이 깨지면 안 된다
        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "old@a.b", "기존", null, false);

        assertThat(result.user().getStatus()).isEqualTo(User.Status.ACTIVE);
        assertThat(result.restored()).isFalse();
    }

    @Test
    void 밴_유저는_예외() {
        User banned = User.of("ban@a.b", "밴", "GOOGLE", "sub-1");
        banned.ban("test"); // User.ban(String reason) — isActive()가 false가 된다
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(banned));

        assertThatThrownBy(() -> upserter.upsert("sub-1", "ban@a.b", "밴", null, true))
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

        GoogleUserUpserter.UpsertResult result = upserter.upsert("sub-1", "back@a.b", "복귀", "https://pic", true);

        assertThat(result.restored()).isTrue();
        assertThat(result.user().getStatus()).isEqualTo(User.Status.ACTIVE);
        verify(accountRestoreService).restore(withdrawn);
    }

    @Test
    void 복구의사가_없는_로그인은_탈퇴계정을_되살리지_않고_복구가능_신호를_준다() {
        // 자동 재로그인이 탈퇴를 조용히 철회하던 사고의 서버측 방어 + 이용자가 직접 누른 첫 시도도
        // 이 신호(WithdrawalPending)를 받아 "복구하시겠습니까?"를 물은 뒤 true로 재시도한다
        User withdrawn = User.of("back@a.b", "복귀", "GOOGLE", "sub-1");
        LocalDateTime markedAt = LocalDateTime.now();
        withdrawn.blockForGrace(markedAt.plusDays(30), markedAt);
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(withdrawn));

        assertThatThrownBy(() -> upserter.upsert("sub-1", "back@a.b", "복귀", null, false))
                .isInstanceOf(GoogleUserUpserter.WithdrawalPendingException.class);
        verify(accountRestoreService, never()).restore(any());
        assertThat(withdrawn.getStatus()).isEqualTo(User.Status.WITHDRAWN);
    }

    @Test
    void 유예가_끝난_탈퇴계정은_복구하지_않고_예외() {
        User withdrawn = User.of("gone@a.b", "만료", "GOOGLE", "sub-1");
        LocalDateTime markedAt = LocalDateTime.now().minusDays(40);
        withdrawn.blockForGrace(markedAt.plusDays(30), markedAt); // purgeAfter가 이미 지났다
        given(userRepository.findByProviderAndProviderId("GOOGLE", "sub-1")).willReturn(Optional.of(withdrawn));

        // 복구 확인을 띄우라는 신호(WithdrawalPending)가 아니어야 한다 — 되살릴 수 없는 계정이다
        assertThatThrownBy(() -> upserter.upsert("sub-1", "gone@a.b", "만료", null, true))
                .isInstanceOf(AccountInactiveException.class)
                .isNotInstanceOf(GoogleUserUpserter.WithdrawalPendingException.class);
        verify(accountRestoreService, never()).restore(any());
    }
}
