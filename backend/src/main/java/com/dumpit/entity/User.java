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

    public void withdraw() {
        if (Boolean.TRUE.equals(this.isAdmin)) {
            throw new IllegalStateException("Admin users cannot withdraw through this flow.");
        }
        LocalDateTime now = LocalDateTime.now();
        String suffix = this.userId != null ? this.userId.toString() : UUID.randomUUID().toString();
        this.status = Status.WITHDRAWN;
        this.withdrawnAt = now;
        this.email = "withdrawn+" + suffix + "@deleted.dumpit.local";
        this.nickname = "탈퇴한 사용자";
        this.picture = null;
        this.bio = null;
        this.providerId = "withdrawn:" + suffix;
        this.coinBalance = 0;
        this.bannedAt = null;
        this.banReason = null;
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() > 500 ? trimmed.substring(0, 500) : trimmed;
    }
}
