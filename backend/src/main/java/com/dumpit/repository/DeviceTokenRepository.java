package com.dumpit.repository;

import com.dumpit.entity.DeviceToken;
import com.dumpit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    Optional<DeviceToken> findByToken(String token);
    List<DeviceToken> findAllByUser(User user);
    void deleteByUserAndToken(User user, String token);

    @Query("select distinct dt.user from DeviceToken dt")
    List<User> findDistinctUsers();

    @Query("select dt from DeviceToken dt join fetch dt.user where dt.token = ?1")
    Optional<DeviceToken> findByTokenWithUser(String token);
}
