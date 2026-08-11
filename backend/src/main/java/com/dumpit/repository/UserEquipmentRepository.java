package com.dumpit.repository;

import com.dumpit.entity.User;
import com.dumpit.entity.UserEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserEquipmentRepository extends JpaRepository<UserEquipment, UUID> {
    List<UserEquipment> findByUser(User user);
    Optional<UserEquipment> findByUserAndSlot(User user, String slot);
    void deleteByUserAndSlot(User user, String slot);

    @Modifying
    @Query("DELETE FROM UserEquipment e WHERE e.user = :user")
    int hardDeleteByUser(@Param("user") User user);
}
