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

export type LoginResult = MeResponse & {
  /** 탈퇴 유예 기간 안에 돌아와 계정이 복구됐는지 — 서버 로그인 응답이 알려준다 */
  restored: boolean;
};

export async function loginWithGoogleIdToken(idToken: string, meConfig?: AxiosRequestConfig): Promise<LoginResult> {
  const { data } = await api.post('/auth/mobile/google', { idToken });
  const me = await fetchMe(meConfig);
  return { ...me, restored: data?.restored === true };
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
