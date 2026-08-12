package com.dumpit.service;

import com.dumpit.entity.User;

/** 구글 프로필 → users upsert. 웹 OAuth 로그인과 모바일 로그인이 공유한다. */
public interface GoogleUserUpserter {

    /**
     * @param restored 탈퇴 유예 기간 안에 돌아와 계정이 되살아났는지 — 로그인 화면에서 안내한다
     */
    record UpsertResult(User user, boolean restored) {}

    /**
     * @param allowRestore 이용자가 복구 의사를 밝힌 로그인인지. 탈퇴 유예 중인 계정은 이 값이 true일
     *   때만 되살아난다. 로그인 버튼을 눌렀다는 사실만으로는 복구 의사로 보지 않는다 — 클라이언트는
     *   일단 false로 시도하고, {@link WithdrawalPendingException} 신호를 받으면 이용자에게
     *   "복구하시겠습니까?"를 물은 뒤 true로 재시도한다.
     * @throws WithdrawalPendingException 유예 중이라 복구할 수 있는 탈퇴 계정인데 복구 의사가 없는 경우
     * @throws AccountInactiveException 밴 계정, 유예가 끝나 복구할 수 없는 탈퇴 계정
     */
    UpsertResult upsert(String providerId, String email, String name, String picture, boolean allowRestore);

    class AccountInactiveException extends RuntimeException {
        public AccountInactiveException(String message) { super(message); }
    }

    /**
     * 유예 기간 중이라 복구 가능한 탈퇴 계정인데 복구 의사 없이 로그인이 들어왔다.
     * AccountInactive의 하위 타입 — 구분하지 않는 호출부는 기존처럼 "로그인 불가"로 처리되고,
     * 구분하는 호출부만 복구 확인 UI를 띄운다.
     */
    class WithdrawalPendingException extends AccountInactiveException {
        public WithdrawalPendingException(String message) { super(message); }
    }
}
