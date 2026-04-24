package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tasks")
@Getter
@NoArgsConstructor
public class Task {

    public enum Status { TODO, IN_PROGRESS, DONE, CANCELLED }
    public enum SyncSource { LOCAL, GOOGLE }
    public enum Category { WORK, STUDY, APPOINTMENT, CHORE, ROUTINE, HEALTH, HOBBY, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "task_id")
    private UUID taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    private Task parentTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dump_id")
    @Setter
    private BrainDump brainDump;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Setter
    private String title;

    @Setter
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private Status status = Status.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private Category category = Category.OTHER;

    @Setter
    private LocalDateTime deadline;

    @Setter
    private LocalDateTime startTime;

    @Setter
    private LocalDateTime endTime;

    @Setter
    private Integer estimatedMinutes;

    @Column(nullable = false)
    @Setter
    private Integer bufferMinutes = 0;

    @Column(nullable = false)
    @Setter
    private Boolean isLocked = false;

    @Setter
    private Double aiPriorityScore;

    // null이면 AI 점수 사용
    @Setter
    private Double userPriorityScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private SyncSource syncSource = SyncSource.LOCAL;

    @Setter
    private String externalEventId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public Double getEffectivePriority() {
        return userPriorityScore != null ? userPriorityScore : aiPriorityScore;
    }

    public static Task of(User user, String title, String description,
                           LocalDateTime deadline, Integer estimatedMinutes) {
        Task task = new Task();
        task.user = user;
        task.title = title;
        task.description = description;
        task.deadline = deadline;
        task.estimatedMinutes = estimatedMinutes;
        return task;
    }
}
