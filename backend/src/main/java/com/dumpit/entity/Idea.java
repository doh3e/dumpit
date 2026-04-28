package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ideas")
@Getter
@NoArgsConstructor
public class Idea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "idea_id")
    private UUID ideaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_idea_id")
    private Idea parentIdea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_task_id")
    private Task convertedTask;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Task.Category category = Task.Category.OTHER;

    @Column(nullable = false)
    private Boolean pinned = false;

    private LocalDateTime convertedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static Idea of(User user, String title, String content) {
        Idea idea = new Idea();
        idea.user = user;
        idea.title = title;
        idea.content = content;
        return idea;
    }

    public void update(String title, String content, Boolean pinned, Task.Category category, Idea parentIdea) {
        if (title != null) this.title = title;
        if (content != null) this.content = content;
        if (pinned != null) this.pinned = pinned;
        if (category != null) this.category = category;
        this.parentIdea = parentIdea;
    }

    public void markConverted(Task task) {
        this.convertedTask = task;
        this.convertedAt = LocalDateTime.now();
    }
}
