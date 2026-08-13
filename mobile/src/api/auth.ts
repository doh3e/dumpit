import axios, { type AxiosRequestConfig } from 'axios';
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

type LoginOptions = {
  /**
   * 이용자가 직접 로그인 버튼을 눌렀는지. 탈퇴 유예 중인 계정은 이 값이 true일 때만 서버가
   * 되살린다 — 자동 재로그인은 false로 보내야 탈퇴가 조용히 철회되지 않는다. 필수 인자로 둬서
   * 새 호출부가 의사를 반드시 밝히게 한다.
   */
  allowRestore: boolean;
  /** 뒤따르는 /auth/me 요청에만 붙는 config */
  meConfig?: AxiosRequestConfig;
};

export async function loginWithGoogleIdToken(
  idToken: string,
  { allowRestore, meConfig }: LoginOptions,
): Promise<LoginResult> {
  const { data } = await api.post('/auth/mobile/google', { idToken, allowRestore });
  const me = await fetchMe(meConfig);
  return { ...me, restored: data?.restored === true };
}

/** 서버가 "유예 중 탈퇴 계정 — 복구 의사 확인 필요"라고 알린 로그인 실패(409)인지 */
export function isWithdrawalPendingError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 409 &&
    (error.response.data as { code?: string } | undefined)?.code === 'WITHDRAWAL_PENDING'
  );
}

/**
 * 이용자가 직접 누른 로그인의 2단계 흐름. 일단 복구 의사 없이 시도하고, 서버가
 * "유예 중 탈퇴 계정" 신호를 주면 confirmRestore로 의사를 물어 동의할 때만 복구 재시도.
 * 거절하면 null — 로그아웃 상태 그대로 남는다.
 */
export async function loginWithRestoreConfirm(
  idToken: string,
  confirmRestore: () => Promise<boolean>,
): Promise<LoginResult | null> {
  try {
    return await loginWithGoogleIdToken(idToken, { allowRestore: false });
  } catch (error) {
    if (!isWithdrawalPendingError(error)) throw error;
    if (!(await confirmRestore())) return null;
    return loginWithGoogleIdToken(idToken, { allowRestore: true });
  }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
