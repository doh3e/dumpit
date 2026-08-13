package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor
public class User {

    public enum Status { ACTIVE, BANNED, WITHDRAWN }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private UUID userId;

    @Column(unique = true, nullable = false)
    private String email;

    private String nickname;

    private String picture;

    @Column(length = 500)
    private String bio;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String providerId;

    @Column(nullable = false)
    private Integer coinBalance = 0;

    @Column(nullable = false)
    private Boolean isAdmin = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    private LocalDateTime bannedAt;

    @Column(length = 500)
    private String banReason;

    private LocalDateTime withdrawnAt;

    // 완전 삭제 예정 시각 — 이 시각이 지나야 purge 스케줄러가 계정과 콘텐츠를 실제로 지운다.
    private LocalDateTime purgeAfter;

    // 탈퇴가 콘텐츠에 찍은 소프트 삭제 시각 — 복구 대상을 이 값으로 식별한다.
    // 사용자가 탈퇴 전에 직접 지운 행은 deletedAt이 다르므로 부활하지 않는다.
    private LocalDateTime withdrawalMarkedAt;

    // 진행 중인 뽀모도로 집중 세션 시작 시각 — 완료 시 경과시간 검증 후 소거 (동시 1세션)
    private LocalDateTime pomodoroStartedAt;

    // 검증 통과한 집중 세션만 누적 — 마이페이지 통계용 (코인 지급과 동일 기준이라 파밍으로 못 불림)
    @Column(nullable = false)
    private Integer pomodoroTotalMinutes = 0;

    @Column(nullable = false)
    private Integer pomodoroTotalSessions = 0;

    // 진행 중인 세션 계획 (settle 일괄 정산용) — 계획 없는 레거시 세션은 전부 null
    private Integer pomodoroPlanFocusMinutes;
    private Integer pomodoroPlanBreakMinutes;
    private Integer pomodoroPlanLongBreakMinutes;
    private Integer pomodoroPlanLongBreakEvery;
    private Integer pomodoroPlanSetsTarget;

    // 이번 계획에서 이미 정산(지급)한 집중 세트 수 — settle은 이 값 초과분만 델타 지급
    @Column(nullable = false)
    private Integer pomodoroSettledSessions = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static User of(String email, String nickname, String provider, String providerId) {
        User user = new User();
        user.email = email;
        user.nickname = nickname;
        user.provider = provider;
        user.providerId = providerId;
        return user;
    }

    public void updatePicture(String picture) {
        this.picture = picture;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void updateBio(String bio) {
        this.bio = bio;
    }

    public void addCoins(int coins) {
        this.coinBalance += coins;
    }

    public boolean spendCoins(int coins) {
        if (this.coinBalance < coins) return false;
        this.coinBalance -= coins;
        return true;
    }

    // 회수(완료 해제·오늘 완료분 삭제)용: 잔액이 모자라도 그대로 차감한다 — 음수 허용.
    // spendCoins처럼 부족하면 포기하거나 0에서 클램프하면
    // "벌고 → 상점에서 쓰고 → 해제 → 재완료" 사이클로 무한 증식이 가능하다.
    public void reclaimCoins(int coins) {
        this.coinBalance -= Math.max(0, coins);
    }

    public void startPomodoro(LocalDateTime startedAt) {
        // 레거시(계획 없는) 시작 — 이전 미완료 세션·계획 흔적을 모두 덮는다
        this.pomodoroStartedAt = startedAt;
        clearPomodoroPlan();
    }

    public void startPomodoroPlan(LocalDateTime startedAt, int focusMinutes, int breakMinutes,
                                  int longBreakMinutes, int longBreakEvery, int setsTarget) {
        this.pomodoroStartedAt = startedAt;
        this.pomodoroPlanFocusMinutes = focusMinutes;
        this.pomodoroPlanBreakMinutes = breakMinutes;
        this.pomodoroPlanLongBreakMinutes = longBreakMinutes;
        this.pomodoroPlanLongBreakEvery = longBreakEvery;
        this.pomodoroPlanSetsTarget = setsTarget;
        this.pomodoroSettledSessions = 0;
    }

    public void clearPomodoro() {
        this.pomodoroStartedAt = null;
        clearPomodoroPlan();
    }

    private void clearPomodoroPlan() {
        this.pomodoroPlanFocusMinutes = null;
        this.pomodoroPlanBreakMinutes = null;
        this.pomodoroPlanLongBreakMinutes = null;
        this.pomodoroPlanLongBreakEvery = null;
        this.pomodoroPlanSetsTarget = null;
        this.pomodoroSettledSessions = 0;
    }

    public boolean hasPomodoroPlan() {
        return pomodoroPlanFocusMinutes != null;
    }

    public void addSettledSessions(int count) {
        this.pomodoroSettledSessions += count;
    }

    public void recordPomodoroFocus(int minutes) {
        recordPomodoroFocusSessions(minutes, 1);
    }

    public void recordPomodoroFocusSessions(int minutesPerSession, int sessions) {
        this.pomodoroTotalMinutes += minutesPerSession * sessions;
        this.pomodoroTotalSessions += sessions;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public void ban(String reason) {
        if (Boolean.TRUE.equals(this.isAdmin)) {
            throw new IllegalStateException("Admin users cannot be banned.");
        }
        this.status = Status.BANNED;
        this.bannedAt = LocalDateTime.now();
        this.banReason = normalizeReason(reason);
    }

    public void unban() {
        if (this.status == Status.BANNED) {
            this.status = Status.ACTIVE;
            this.bannedAt = null;
            this.banReason = null;
        }
    }

    /**
     * 탈퇴 1단계 — 계정을 잠그고 완전 삭제 예정일을 건다.
     * <p>
     * 이메일·구글 sub·코인·뽀모도로 누적은 그대로 둔다. 유예 기간에 같은 구글 계정으로
     * 다시 로그인하면 원래 계정을 그대로 되살려야 하는데, 여기서 덮어쓰면 복구할 원본이
     * 사라지기 때문이다. 실제 파기는 purgeAfter가 지난 뒤 행 삭제로 이뤄진다.
     * 유예 중 서비스 접근은 status가 ACTIVE가 아니라는 사실만으로 이미 차단된다.
     */
    public void blockForGrace(LocalDateTime purgeAfter, LocalDateTime withdrawalMarkedAt) {
        if (Boolean.TRUE.equals(this.isAdmin)) {
            throw new IllegalStateException("Admin users cannot withdraw through this flow.");
        }
        this.status = Status.WITHDRAWN;
        this.withdrawnAt = LocalDateTime.now();
        this.purgeAfter = purgeAfter;
        this.withdrawalMarkedAt = withdrawalMarkedAt;
        this.bannedAt = null;
        this.banReason = null;
    }

    /** 콘텐츠 복구는 서비스가 따로 처리한다. */
    public void restoreFromWithdrawal() {
        this.status = Status.ACTIVE;
        this.withdrawnAt = null;
        this.purgeAfter = null;
        this.withdrawalMarkedAt = null;
    }

    /** 경계값은 포함하지 않는다(지정 시각이 지나야 삭제). */
    public boolean isPurgeDue(LocalDateTime now) {
        return this.status == Status.WITHDRAWN
                && this.purgeAfter != null
                && this.purgeAfter.isBefore(now);
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() > 500 ? trimmed.substring(0, 500) : trimmed;
    }
}
