package com.dumpit.entity;

import com.dumpit.common.IntListJsonConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_settings")
@Getter
@NoArgsConstructor
public class UserSettings {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Integer routineStartHour = 9;

    @Column(nullable = false)
    private Integer routineEndHour = 22;

    @Column(nullable = false)
    private Boolean notificationsEnabled = true;

    @Convert(converter = IntListJsonConverter.class)
    @Column(nullable = false, length = 64)
    private List<Integer> notificationThresholds = List.of(60);

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static UserSettings of(User user) {
        UserSettings settings = new UserSettings();
        settings.user = user;
        return settings;
    }

    public void updateRoutineHours(int startHour, int endHour) {
        this.routineStartHour = startHour;
        this.routineEndHour = endHour;
    }

    public void updateNotificationsEnabled(boolean enabled) {
        this.notificationsEnabled = enabled;
    }

    public void updateNotificationThresholds(List<Integer> thresholds) {
        this.notificationThresholds = List.copyOf(thresholds);
    }
}
