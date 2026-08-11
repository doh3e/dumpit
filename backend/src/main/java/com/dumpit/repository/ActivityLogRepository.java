package com.dumpit.repository;

import com.dumpit.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    // 기준은 로그 자신의 생성 시각이다. 예전에는 소유자의 withdrawnAt을 봤는데,
    // 활성 회원은 그 값이 NULL이라 비교가 성립하지 않아 로그가 영구 보존됐다.
    @Modifying
    @Query("DELETE FROM ActivityLog l WHERE l.createdAt < :cutoff")
    int deleteLogsCreatedBefore(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM ActivityLog l WHERE l.user = :user")
    int hardDeleteByUser(@Param("user") com.dumpit.entity.User user);
}
