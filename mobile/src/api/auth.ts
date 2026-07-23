import { api } from './client';

export type MeResponse = {
  email: string;
  name: string;
  picture: string | null;
  coins: number;
  isAdmin: boolean;
};

/** 백엔드 /auth/me 응답 그대로 (equipments 등 추가 필드는 Phase 1에서 확장) */
export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function loginWithGoogleIdToken(idToken: string): Promise<MeResponse> {
  await api.post('/auth/mobile/google', { idToken });
  return fetchMe();
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
