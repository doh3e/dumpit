import type { AxiosRequestConfig } from 'axios';
import { api } from './client';

export type MeResponse = {
  email: string;
  name: string;
  picture: string | null;
  coins: number;
  isAdmin: boolean;
  equipments: Record<string, string>;   // slot → 장착 아이템 코드 (서버가 항상 내려줌)
};

/** 백엔드 /auth/me 응답 그대로 */
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
