package com.dumpit.repository;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface BrainDumpRepository extends JpaRepository<BrainDump, UUID> {

    long countByUser(User user);

    long countByUserAndDeletedAtIsNull(User user);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    List<BrainDump> findByUserAndDeletedAtIsNull(User user);

    // Admin 유저 목록에서 유저당 1쿼리씩 도는 N+1을 피하기 위한 집계 쿼리 — AdminUserController 참고
    @Query("""
        SELECT b.user.userId, COUNT(b) FROM BrainDump b
        WHERE b.deletedAt IS NULL
        GROUP BY b.user.userId
    """)
    List<Object[]> countActiveGroupedByUser();
}
