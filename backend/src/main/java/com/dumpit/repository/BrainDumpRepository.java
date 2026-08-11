package com.dumpit.repository;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // 원문(rawText)은 건드리지 않는다 — 유예 기간 안에 복구하면 그대로 돌려줘야 한다.
    @Modifying
    @Query("""
        UPDATE BrainDump b
        SET b.deletedAt = :deletedAt
        WHERE b.user = :user
          AND b.deletedAt IS NULL
    """)
    int softDeleteByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);

    @Modifying
    @Query("""
        UPDATE BrainDump b
        SET b.deletedAt = NULL
        WHERE b.user = :user
          AND b.deletedAt = :deletedAt
    """)
    int restoreByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);

    // tasks보다 반드시 나중에 지워야 한다 — tasks.dump_id가 brain_dumps를 NO ACTION으로 참조한다.
    @Modifying
    @Query("DELETE FROM BrainDump b WHERE b.user = :user")
    int hardDeleteByUser(@Param("user") User user);
}
