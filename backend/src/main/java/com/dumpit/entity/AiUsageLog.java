package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_usage_logs")
@Getter
@NoArgsConstructor
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "ai_usage_log_id")
    private UUID aiUsageLogId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String usageType;

    @Column(nullable = false)
    private Integer cost;

    @Column(nullable = false)
    private Integer usedAfter;

    @Column(nullable = false)
    private Integer limitValue;

    @Column(nullable = false)
    private Integer remaining;

    @Column(nullable = false)
    private Boolean allowed;

    @Column(length = 100)
    private String note;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public static AiUsageLog of(User user, String usageType, int cost, int usedAfter,
                                int limitValue, int remaining, boolean allowed, String note) {
        AiUsageLog log = new AiUsageLog();
        log.user = user;
        log.usageType = usageType;
        log.cost = cost;
        log.usedAfter = usedAfter;
        log.limitValue = limitValue;
        log.remaining = remaining;
        log.allowed = allowed;
        log.note = note;
        return log;
    }
}
