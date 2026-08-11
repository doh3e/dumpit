package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_tokens")
@Getter
@NoArgsConstructor
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, columnDefinition = "text")
    private String token;

    @Column(nullable = false)
    private String platform = "android";

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    public static DeviceToken of(User user, String token, String platform) {
        DeviceToken dt = new DeviceToken();
        dt.user = user;
        dt.token = token;
        dt.platform = platform;
        return dt;
    }

    /** 같은 토큰 재등록 — 기기 주인이 바뀌었을 수 있으므로 user까지 갱신한다 */
    public void touch(User user, String platform) {
        this.user = user;
        this.platform = platform;
        this.lastSeenAt = LocalDateTime.now();
    }
}
