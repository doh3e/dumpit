import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginWithGoogleIdToken, logout, type MeResponse } from '../api/auth';
import { api } from '../api/client';
import { bypassReauth, installSilentReauth } from '../api/reauth';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/** 세션 만료 시(24h) 저장된 구글 계정으로 조용히 재로그인 — 성공하면 원요청이 재시도된다 */
async function silentReauth(): Promise<boolean> {
  try {
    const result = await GoogleSignin.signInSilently();
    const idToken = result.type === 'success' ? result.data?.idToken : null;
    if (!idToken) return false;
    // 내부 /auth/me가 다시 401이어도 인터셉터의 pending(자기 자신)을 기다리지 않도록 우회
    await loginWithGoogleIdToken(idToken, bypassReauth());
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
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMe(await fetchMe()); // 세션 쿠키가 살아있으면 자동 로그인
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
    setMe(await loginWithGoogleIdToken(idToken));
  }, []);

  const signOut = useCallback(async () => {
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
