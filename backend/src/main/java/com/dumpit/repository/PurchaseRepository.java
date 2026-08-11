package com.dumpit.repository;

import com.dumpit.entity.User;
import com.dumpit.entity.UserPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<UserPurchase, UUID> {

    List<UserPurchase> findByUser(User user);

    boolean existsByUserAndItemCode(User user, String itemCode);

    @Modifying
    @Query("DELETE FROM UserPurchase p WHERE p.user = :user")
    int hardDeleteByUser(@Param("user") User user);
}
