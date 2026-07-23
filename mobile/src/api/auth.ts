import type { AxiosRequestConfig } from 'axios';
import { api } from './client';

export type MeResponse = {
  email: string;
  name: string;
  picture: string | null;
  coins: number;
  isAdmin: boolean;
};

/** 백엔드 /auth/me 응답 그대로 (equipments 등 추가 필드는 Phase 1에서 확장) */
export async function fetchMe(config?: AxiosRequestConfig): Promise<MeResponse> {
  const { data } = await api.get('/auth/me', config);
  return data;
}

export async function loginWithGoogleIdToken(idToken: string, meConfig?: AxiosRequestConfig): Promise<MeResponse> {
  await api.post('/auth/mobile/google', { idToken });
  return fetchMe(meConfig);
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
