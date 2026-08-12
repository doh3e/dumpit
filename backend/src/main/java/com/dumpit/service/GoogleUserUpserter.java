package com.dumpit.service;

import com.dumpit.entity.User;

/** 구글 프로필 → users upsert. 웹 OAuth 로그인과 모바일 로그인이 공유한다. */
public interface GoogleUserUpserter {

    /**
     * @param restored 탈퇴 유예 기간 안에 돌아와 계정이 되살아났는지 — 로그인 화면에서 안내한다
     */
    record UpsertResult(User user, boolean restored) {}

    /**
     * @param allowRestore 이용자가 직접 누른 로그인인지. 탈퇴 유예 중인 계정은 이 값이 true일 때만
     *   되살아난다. 앱의 자동 재로그인처럼 이용자 의사가 실리지 않은 로그인은 반드시 false로 보낸다 —
     *   탈퇴 철회는 되돌리기 어려운 결정이라 "로그인이 들어왔다"는 사실만으로 추론하면 안 된다.
     * @throws AccountInactiveException 밴 계정, 유예가 끝나 복구할 수 없는 탈퇴 계정,
     *   또는 복구가 허용되지 않은 로그인으로 들어온 탈퇴 계정
     */
    UpsertResult upsert(String providerId, String email, String name, String picture, boolean allowRestore);

    class AccountInactiveException extends RuntimeException {
        public AccountInactiveException(String message) { super(message); }
    }
}
