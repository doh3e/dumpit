package com.dumpit.repository;

import com.dumpit.entity.BrainDump;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BrainDumpRepository extends JpaRepository<BrainDump, UUID> {

    long countByUser(User user);
}
