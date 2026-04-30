package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notice_reads",
        uniqueConstraints = @UniqueConstraint(columnNames = {"notice_id", "user_id"}))
@Getter
@NoArgsConstructor
public class NoticeRead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notice_read_id")
    private UUID noticeReadId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id", nullable = false)
    private Notice notice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    private LocalDateTime readAt;

    public static NoticeRead of(Notice notice, User user) {
        NoticeRead read = new NoticeRead();
        read.notice = notice;
        read.user = user;
        return read;
    }
}
