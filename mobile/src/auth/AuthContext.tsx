import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { fetchMe, loginWithGoogleIdToken, logout, type MeResponse } from '../api/auth';
import { api } from '../api/client';
import { bypassReauth, installSilentReauth } from '../api/reauth';
import { registerPushDevice, unregisterPushDevice } from '../push/fcm';
import { clearWidgetMirrors } from '../widget/mirror';

/** 웹 클라이언트 ID는 공개 식별자 — .env 없이 빌드되는 EAS preview/production에서도 로그인이 되도록 프로드 값을 폴백으로 둔다(api/client.ts의 PROD_API_URL과 같은 패턴) */
const PROD_GOOGLE_WEB_CLIENT_ID =
  '372628852315-pnrv63va69uf2daq101t7utjh93h1abo.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? PROD_GOOGLE_WEB_CLIENT_ID,
});

/** 세션 만료 시(24h) 저장된 구글 계정으로 조용히 재로그인 — 성공하면 원요청이 재시도된다 */
async function silentReauth(): Promise<boolean> {
  try {
    const result = await GoogleSignin.signInSilently();
    const idToken = result.type === 'success' ? result.data?.idToken : null;
    if (!idToken) return false;
    // 이용자가 누른 로그인이 아니므로 탈퇴 철회는 금지(allowRestore=false).
    // 내부 /auth/me가 다시 401이어도 인터셉터의 pending(자기 자신)을 기다리지 않도록 우회.
    await loginWithGoogleIdToken(idToken, { allowRestore: false, meConfig: bypassReauth() });
    return true;
  } catch {
    return false;
  }
}

// 모듈 로드 시 1회 설치 (Provider 리렌더와 무관)
installSilentReauth(api, silentReauth);

type AuthState = {
  me: MeResponse | null;
  loading: boolean;
  signInWithGoogle(): Promise<void>;
  signOut(opts?: { afterWithdrawal?: boolean }): Promise<void>;
  refresh(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await fetchMe()); // 세션 쿠키가 살아있으면 자동 로그인
      void registerPushDevice();
    } catch (e) {
      // 인증 거부(401/403)만 로그아웃 처리 — 타임아웃·5xx 같은 일시 오류로 쫓아내지 않는다
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401 || status === 403) setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signInWithGoogle = useCallback(async () => {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type === 'cancelled') return;
    const idToken = result.data?.idToken;
    if (!idToken) throw new Error('구글에서 ID 토큰을 받지 못했어요.');
    // 이용자가 직접 누른 로그인 — 탈퇴 유예 중이면 여기서만 되살아난다
    const { restored, ...me } = await loginWithGoogleIdToken(idToken, { allowRestore: true });
    setMe(me);
    void registerPushDevice();
    // 탈퇴 유예 중 다시 들어온 경우 — 서버가 계정과 기록을 이미 되살렸다
    if (restored) {
      Alert.alert('다시 오셨네요!', '탈퇴 신청이 취소되었어요.\n할 일과 아이디어, 루틴까지 예전 기록이 모두 그대로 돌아왔습니다.');
    }
  }, []);

  /**
   * @param afterWithdrawal 탈퇴 직후 호출 — 서버가 탈퇴 처리에서 이미 기기 토큰을 지웠고 계정도
   *   비활성이라, 기기 토큰 해제 요청은 어차피 401로 막힌다. 헛되이 보내지 않는다.
   */
  const signOut = useCallback(async ({ afterWithdrawal = false } = {}) => {
    // 세션이 살아있는 동안 서버에서 기기 토큰을 지운다
    if (!afterWithdrawal) await unregisterPushDevice();
    void clearWidgetMirrors(); // 위젯 미러도 함께 비운다 — 다음 401까지 이전 유저 목록이 남지 않도록
    try { await logout(); } catch { /* 서버 실패해도 로컬은 정리 */ }
    try { await GoogleSignin.signOut(); } catch { /* noop */ }
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ me, loading, signInWithGoogle, signOut, refresh }),
    [me, loading, signInWithGoogle, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용');
  return ctx;
}
