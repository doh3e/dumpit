package com.dumpit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "brain_dumps")
@Getter
@NoArgsConstructor
public class BrainDump {

    public enum Status { PENDING, ANALYZED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "dump_id")
    private UUID dumpId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String rawText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public static BrainDump of(User user, String rawText) {
        BrainDump dump = new BrainDump();
        dump.user = user;
        dump.rawText = rawText;
        return dump;
    }

    public void markAnalyzed() {
        this.status = Status.ANALYZED;
    }

    public void markFailed() {
        this.status = Status.FAILED;
    }
}
