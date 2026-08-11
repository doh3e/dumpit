package com.dumpit.service;

import com.dumpit.entity.User;

/** 구글 프로필 → users upsert. 웹 OAuth 로그인과 모바일 로그인이 공유한다. */
public interface GoogleUserUpserter {

    /**
     * @param restored 탈퇴 유예 기간 안에 돌아와 계정이 되살아났는지 — 로그인 화면에서 안내한다
     */
    record UpsertResult(User user, boolean restored) {}

    /** @throws AccountInactiveException 밴 계정, 또는 유예가 끝나 복구할 수 없는 탈퇴 계정 */
    UpsertResult upsert(String providerId, String email, String name, String picture);

    class AccountInactiveException extends RuntimeException {
        public AccountInactiveException(String message) { super(message); }
    }
}
