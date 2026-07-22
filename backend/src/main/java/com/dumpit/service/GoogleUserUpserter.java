package com.dumpit.service;

import com.dumpit.entity.User;

/** 구글 프로필 → users upsert. 웹 OAuth 로그인과 모바일 로그인이 공유한다. */
public interface GoogleUserUpserter {

    /** @throws AccountInactiveException 밴/탈퇴 계정 */
    User upsert(String providerId, String email, String name, String picture);

    class AccountInactiveException extends RuntimeException {
        public AccountInactiveException(String message) { super(message); }
    }
}
