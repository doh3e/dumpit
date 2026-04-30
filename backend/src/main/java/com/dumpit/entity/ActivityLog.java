package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "activity_logs")
@Getter
@NoArgsConstructor
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "activity_log_id")
    private UUID activityLogId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(nullable = false, length = 40)
    private String targetType;

    @Column(nullable = false)
    private UUID targetId;

    @Column(columnDefinition = "TEXT")
    private String beforeJson;

    @Column(columnDefinition = "TEXT")
    private String afterJson;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public static ActivityLog of(User user, String action, String targetType, UUID targetId,
                                 String beforeJson, String afterJson) {
        ActivityLog log = new ActivityLog();
        log.user = user;
        log.action = action;
        log.targetType = targetType;
        log.targetId = targetId;
        log.beforeJson = beforeJson;
        log.afterJson = afterJson;
        return log;
    }
}
