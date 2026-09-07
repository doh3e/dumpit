import axios from 'axios';
import Constants from 'expo-constants';
import { hostFrom, resolveBaseUrl } from './devHost';
import { DEFAULT_ERROR_MESSAGE, describeError, withErrorCode } from './errors';

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

/** 실패 문구. 예상 밖 실패(네트워크·5xx·문구 없는 4xx·앱 예외)에는 진단 코드가 붙는다 — 정책은 errors.ts */
export function getApiErrorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  const info = describeError(error, fallback);
  return info.tagged ? withErrorCode(info.message, info.code) : info.message;
}
