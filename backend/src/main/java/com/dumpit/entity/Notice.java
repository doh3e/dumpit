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
@Table(name = "notices")
@Getter
@NoArgsConstructor
public class Notice {

    public enum Status { DRAFT, PUBLISHED, ARCHIVED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notice_id")
    private UUID noticeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 200)
    @Setter
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Setter
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Setter
    private Status status = Status.DRAFT;

    @Column(nullable = false)
    @Setter
    private LocalDateTime publishAt;

    @Column(nullable = false)
    @Setter
    private boolean pinned = false;

    @Column(nullable = false)
    @Setter
    private boolean popup = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static Notice of(
            User author,
            String title,
            String content,
            LocalDateTime publishAt,
            Status status,
            boolean pinned,
            boolean popup) {
        Notice notice = new Notice();
        notice.author = author;
        notice.title = title;
        notice.content = content;
        notice.publishAt = publishAt;
        notice.status = status;
        notice.pinned = pinned;
        notice.popup = popup;
        return notice;
    }

    public void archive() {
        this.status = Status.ARCHIVED;
    }
}
