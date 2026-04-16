package com.dumpit.repository;

import com.dumpit.entity.User;
import com.dumpit.entity.UserPurchase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<UserPurchase, UUID> {

    List<UserPurchase> findByUser(User user);

    boolean existsByUserAndItemId(User user, int itemId);
}
