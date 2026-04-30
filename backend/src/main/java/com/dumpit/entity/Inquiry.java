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
@Table(name = "inquiries")
@Getter
@NoArgsConstructor
public class Inquiry {

    public enum Status { PENDING, REPLIED, CLOSED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "inquiry_id")
    private UUID inquiryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Setter
    private Status status = Status.PENDING;

    @Column(columnDefinition = "TEXT")
    @Setter
    private String adminReply;

    @Setter
    private LocalDateTime repliedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public static Inquiry of(User user, String userEmail, String subject, String message) {
        Inquiry inquiry = new Inquiry();
        inquiry.user = user;
        inquiry.userEmail = userEmail;
        inquiry.subject = subject;
        inquiry.message = message;
        return inquiry;
    }

    public void anonymizeUser() {
        this.user = null;
        this.userEmail = "withdrawn@deleted.dumpit.local";
    }
}
