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
 */
export function installSilentReauth(instance: AxiosInstance, reauth: () => Promise<boolean>): void {
  let pending: Promise<boolean> | null = null;
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const cfg = error.config as RetriableConfig | undefined;
    const url = cfg?.url ?? '';
    if (error.response?.status !== 401 || !cfg || cfg._reauthRetried || AUTH_PATHS.some((p) => url.includes(p))) {
      throw error;
    }
    pending ??= reauth().finally(() => { pending = null; });
    const ok = await pending;
    if (!ok) throw error;
    cfg._reauthRetried = true;
    return instance.request(cfg);
  });
}
