package com.dumpit.repository;

import com.dumpit.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    @Query("""
        SELECT COALESCE(SUM(l.cost), 0) FROM AiUsageLog l
        WHERE l.createdAt >= :since
          AND l.allowed = true
    """)
    long sumAllowedCostSince(@Param("since") LocalDateTime since);
}
