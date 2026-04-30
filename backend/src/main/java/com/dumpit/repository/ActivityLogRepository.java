package com.dumpit.repository;

import com.dumpit.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
}
