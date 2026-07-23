import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginWithGoogleIdToken, logout, type MeResponse } from '../api/auth';
import { api } from '../api/client';
import { installSilentReauth } from '../api/reauth';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/** 세션 만료 시(24h) 저장된 구글 계정으로 조용히 재로그인 — 성공하면 원요청이 재시도된다 */
async function silentReauth(): Promise<boolean> {
  try {
    const result = await GoogleSignin.signInSilently();
    const idToken = result.type === 'success' ? result.data?.idToken : null;
    if (!idToken) return false;
    await loginWithGoogleIdToken(idToken);
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
    } catch {
      setMe(null);
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
