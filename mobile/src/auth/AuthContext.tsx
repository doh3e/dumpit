import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginWithGoogleIdToken, type MeResponse } from '../api/auth';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

type AuthState = {
  me: MeResponse | null;
  loading: boolean;
  signInWithGoogle(): Promise<void>;
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
    const idToken = result.data?.idToken;
    if (!idToken) throw new Error('구글에서 ID 토큰을 받지 못했어요.');
    setMe(await loginWithGoogleIdToken(idToken));
  }, []);

  const value = useMemo(
    () => ({ me, loading, signInWithGoogle, refresh }),
    [me, loading, signInWithGoogle, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용');
  return ctx;
}
