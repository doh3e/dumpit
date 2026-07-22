package com.dumpit.service;

public interface MobileGoogleTokenVerifier {

    GoogleIdClaims verify(String idToken);

    record GoogleIdClaims(String sub, String email, String name, String picture) {}

    class InvalidMobileTokenException extends RuntimeException {
        public InvalidMobileTokenException(String message) { super(message); }
        public InvalidMobileTokenException(String message, Throwable cause) { super(message, cause); }
    }
}
