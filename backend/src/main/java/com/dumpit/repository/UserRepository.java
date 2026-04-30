package com.dumpit.repository;

import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
}
