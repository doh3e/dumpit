package com.dumpit.repository;

import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    Optional<User> findByEmail(String email);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    @Query("""
        SELECT u FROM User u
        ORDER BY u.createdAt DESC
    """)
    List<User> findAllForAdmin();

    // 유예가 끝나 완전 삭제할 계정 — idx_users_purge_after(WITHDRAWN 부분 인덱스)를 탄다
    @Query("""
        SELECT u FROM User u
        WHERE u.status = com.dumpit.entity.User$Status.WITHDRAWN
          AND u.purgeAfter IS NOT NULL
          AND u.purgeAfter < :now
    """)
    List<User> findPurgeDue(@Param("now") LocalDateTime now);
}
