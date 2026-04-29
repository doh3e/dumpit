package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "routines")
@Getter
@NoArgsConstructor
public class Routine {

    public enum RepeatType { DAILY, WEEKLY, MONTHLY }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "routine_id")
    private UUID routineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    @Setter
    private String name;

    @Setter
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Setter
    private Boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private RepeatType repeatType = RepeatType.DAILY;

    @Column(length = 40)
    @Setter
    private String daysOfWeek;

    @Column(length = 100)
    @Setter
    private String daysOfMonth;

    @Column(nullable = false)
    @Setter
    private LocalTime createTime = LocalTime.of(6, 0);

    @Column(nullable = false)
    @Setter
    private LocalDate startDate;

    @Setter
    private LocalDate endDate;

    @Setter
    private LocalDate lastGeneratedDate;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static Routine of(User user, String name) {
        Routine routine = new Routine();
        routine.user = user;
        routine.name = name;
        routine.startDate = LocalDate.now();
        return routine;
    }

    public Set<Integer> dayOfWeekSet() {
        return parseIntSet(daysOfWeek);
    }

    public Set<Integer> dayOfMonthSet() {
        return parseIntSet(daysOfMonth);
    }

    private Set<Integer> parseIntSet(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter((value) -> !value.isBlank())
                .map(Integer::parseInt)
                .collect(Collectors.toSet());
    }
}
