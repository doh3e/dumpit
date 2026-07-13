package com.dumpit.repository;

import com.dumpit.entity.User;
import com.dumpit.entity.UserEquipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserEquipmentRepository extends JpaRepository<UserEquipment, UUID> {
    List<UserEquipment> findByUser(User user);
    Optional<UserEquipment> findByUserAndSlot(User user, String slot);
    void deleteByUserAndSlot(User user, String slot);
}
