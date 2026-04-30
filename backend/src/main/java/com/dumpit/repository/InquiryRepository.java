package com.dumpit.repository;

import com.dumpit.entity.Inquiry;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InquiryRepository extends JpaRepository<Inquiry, UUID> {
    List<Inquiry> findAllByOrderByCreatedAtDesc();

    List<Inquiry> findByUserOrderByCreatedAtDesc(User user);

    List<Inquiry> findByUser(User user);
}
