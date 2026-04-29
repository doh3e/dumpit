package com.dumpit.repository;

import com.dumpit.entity.Routine;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

    List<Routine> findByUserOrderByEnabledDescCreatedAtDesc(User user);

    List<Routine> findByEnabledTrueAndCreateTimeLessThanEqual(LocalTime createTime);
}
