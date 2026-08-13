import axios from 'axios';
import Constants from 'expo-constants';
import { hostFrom, resolveBaseUrl } from './devHost';

const PROD_API_URL = 'https://api.dumpit.kr/api';

/** 개발 중에만 Metro 서버 호스트를 읽는다 — 프로덕션 빌드에는 없다 */
function metroHost(): string | null {
  if (!__DEV__) return null;
  const expoConfig = Constants.expoConfig as { hostUri?: string } | null;
  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
  return hostFrom(expoConfig?.hostUri ?? expoGo?.debuggerHost);
}

/**
 * EXPO_PUBLIC_API_URL 미설정 시 프로드. 로컬 개발은 mobile/.env에서 http://<LAN-IP>:8080/api.
 * 개발 중 설정값이 사설망 주소면 PC의 LAN IP가 바뀌어도 Metro 호스트로 자동 보정된다.
 */
export const API_BASE_URL = resolveBaseUrl(
  process.env.EXPO_PUBLIC_API_URL,
  metroHost(),
  PROD_API_URL,
);

if (__DEV__ && API_BASE_URL !== process.env.EXPO_PUBLIC_API_URL) {
  console.log(`[api] Metro 호스트 기준으로 보정: ${API_BASE_URL}`);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  timeout: 15_000,
});

export function getApiErrorMessage(
  error: unknown,
  fallback = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.',
): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { error?: string; message?: string } | undefined;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;

  const status = error.response?.status;
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '접근 권한이 없습니다.';
  if (status === 404) return '요청한 대상을 찾을 수 없습니다.';
  if (status === 429) return '사용 가능 횟수를 모두 사용했어요.';
  if (status && status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return fallback;
}
