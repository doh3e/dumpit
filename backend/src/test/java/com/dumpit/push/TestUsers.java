package com.dumpit.push;

import com.dumpit.entity.User;

import java.util.UUID;

public class TestUsers {

    /**
     * Create a test User with the given email.
     * Sets a random UUID as userId via reflection (required for mocking).
     */
    public static User withEmail(String email) throws Exception {
        User user = new User();
        var idField = User.class.getDeclaredField("userId");
        idField.setAccessible(true);
        idField.set(user, UUID.randomUUID());
        var emailField = User.class.getDeclaredField("email");
        emailField.setAccessible(true);
        emailField.set(user, email);
        return user;
    }

    /**
     * Create a test User with the given email and userId.
     */
    public static User withId(UUID userId, String email) throws Exception {
        User user = new User();
        var idField = User.class.getDeclaredField("userId");
        idField.setAccessible(true);
        idField.set(user, userId);
        var emailField = User.class.getDeclaredField("email");
        emailField.setAccessible(true);
        emailField.set(user, email);
        return user;
    }
}
