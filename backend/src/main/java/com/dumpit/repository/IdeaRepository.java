package com.dumpit.repository;

import com.dumpit.entity.Idea;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    List<Idea> findByUserAndDeletedAtIsNullOrderByPinnedDescUpdatedAtDesc(User user);

    boolean existsByParentIdeaAndDeletedAtIsNull(Idea parentIdea);

    long countByUserAndDeletedAtIsNull(User user);

    // Admin 유저 목록에서 유저당 1쿼리씩 도는 N+1을 피하기 위한 집계 쿼리 — AdminUserController 참고
    @Query("""
        SELECT i.user.userId, COUNT(i) FROM Idea i
        WHERE i.deletedAt IS NULL
        GROUP BY i.user.userId
    """)
    List<Object[]> countActiveGroupedByUser();

    @Query("""
        SELECT i FROM Idea i
        WHERE i.ideaId = :ideaId
          AND i.deletedAt IS NULL
    """)
    Optional<Idea> findActiveById(@Param("ideaId") UUID ideaId);

    @Modifying
    @Query("""
        UPDATE Idea i
        SET i.deletedAt = :deletedAt
        WHERE i.user = :user
          AND i.deletedAt IS NULL
    """)
    int softDeleteByUser(@Param("user") User user, @Param("deletedAt") LocalDateTime deletedAt);

    // 스티커만 바꾸는 벌크 업데이트 — @UpdateTimestamp(updatedAt)를 우회해 목록 정렬 점프를 막는다.
    @Modifying(clearAutomatically = true)
    @Query("update Idea i set i.stickerCode = :code where i.ideaId = :ideaId")
    void updateStickerCode(@Param("ideaId") UUID ideaId, @Param("code") String code);
}
