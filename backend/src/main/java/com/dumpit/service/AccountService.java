package com.dumpit.service;

import com.dumpit.entity.User;

import java.util.List;
import java.util.UUID;

public interface AccountService {

    User withdraw(String email);

    List<User> getUsersForAdmin();

    User banUser(UUID userId, String reason);

    User unbanUser(UUID userId);
}
