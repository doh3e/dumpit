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

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private UUID userId;

    @Column(unique = true, nullable = false)
    private String email;

    private String nickname;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String providerId;

    @Column(nullable = false)
    private Integer coinBalance = 0;

    @Column(nullable = false)
    private Boolean isAdmin = false;

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

    public void addCoins(int coins) {
        this.coinBalance += coins;
    }

    public boolean spendCoins(int coins) {
        if (this.coinBalance < coins) return false;
        this.coinBalance -= coins;
        return true;
    }
}
