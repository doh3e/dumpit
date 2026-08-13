import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 이 요청의 401에 silent re-auth를 개입시키지 않음 (재시도 요청·reauth 내부 요청) */
    _reauthRetried?: boolean;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _reauthRetried?: boolean };

const AUTH_PATHS = ['/auth/mobile/google'];

/**
 * 계정 자체를 더 못 쓰는 상태(탈퇴·밴)에서 서버가 주는 401 코드.
 * 진짜 세션 만료는 authenticationEntryPoint가 UNAUTHORIZED로 따로 내려주므로 둘은 구분된다.
 */
const ACCOUNT_INACTIVE_CODE = 'SESSION_INVALIDATED';

/**
 * 탈퇴 직후의 401을 세션 만료로 오해해 조용히 재로그인하면, 서버는 그걸 "유예 기간 안에
 * 돌아온 이용자"로 보고 탈퇴를 철회해 버린다 — 이용자가 탈퇴를 눌렀는데 계정이 그대로
 * 되살아난다. 밴도 마찬가지로 재로그인해서 풀릴 성질이 아니므로 둘 다 개입하지 않는다.
 */
function isAccountInactive(data: unknown): boolean {
  return typeof data === 'object' && data !== null
    && (data as { code?: unknown }).code === ACCOUNT_INACTIVE_CODE;
}

/**
 * reauth 플로우 내부에서 같은 인스턴스로 보내는 요청에 붙일 config.
 * 이 플래그가 없으면 reauth 내부의 401이 자기 자신(pending)을 기다리는 순환 대기가 된다.
 */
export function bypassReauth(): AxiosRequestConfig {
  return { _reauthRetried: true };
}

/**
 * 세션 만료(401) → silent re-auth 1회 → 원요청 재시도.
 * - 재시도한 요청의 401은 그대로 실패 (무한루프 방지 플래그)
 * - 동시 401 여러 건은 reauth 프라미스를 공유해 한 번만 재로그인
 * - 로그인 엔드포인트 자체의 401은 개입하지 않음
 * - 탈퇴·밴 계정의 401(SESSION_INVALIDATED)도 개입하지 않음 — 재로그인이 탈퇴를 되돌린다
 */
export function installSilentReauth(instance: AxiosInstance, reauth: () => Promise<boolean>): void {
  let pending: Promise<boolean> | null = null;
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const cfg = error.config as RetriableConfig | undefined;
    const url = cfg?.url ?? '';
    if (error.response?.status !== 401 || !cfg || cfg._reauthRetried
        || AUTH_PATHS.some((p) => url.includes(p))
        || isAccountInactive(error.response.data)) {
      throw error;
    }
    pending ??= reauth().finally(() => { pending = null; });
    const ok = await pending;
    if (!ok) throw error;
    cfg._reauthRetried = true;
    return instance.request(cfg);
  });
}
