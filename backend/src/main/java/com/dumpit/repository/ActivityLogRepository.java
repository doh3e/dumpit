package com.dumpit.repository;

import com.dumpit.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    @Modifying
    @Query("DELETE FROM ActivityLog l WHERE l.user.withdrawnAt < :cutoff")
    long deleteWithdrawnUserLogsBefore(@Param("cutoff") LocalDateTime cutoff);
}
