package com.dumpit.repository;

import com.dumpit.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    // 기준은 로그 자신의 생성 시각이다 — ActivityLogRepository와 같은 이유.
    @Modifying
    @Query("DELETE FROM AiUsageLog l WHERE l.createdAt < :cutoff")
    int deleteLogsCreatedBefore(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM AiUsageLog l WHERE l.user = :user")
    int hardDeleteByUser(@Param("user") com.dumpit.entity.User user);

    @Query("""
        SELECT COALESCE(SUM(l.cost), 0) FROM AiUsageLog l
        WHERE l.createdAt >= :since
          AND l.allowed = true
    """)
    long sumAllowedCostSince(@Param("since") LocalDateTime since);
}
