/**
 * 개발 중 API 주소를 Metro 서버의 호스트로 맞춘다.
 *
 * 폰과 PC가 같은 Wi-Fi에 있어야 하는 구조라 .env에 PC의 LAN IP를 적어왔는데,
 * 공유기가 DHCP로 IP를 바꿀 때마다 앱이 죽은 주소를 보게 된다(2026-07-27에만 두 번).
 * 앱은 Metro에 붙어서 번들을 받으므로 Metro의 호스트 = 백엔드가 도는 PC다. 그걸 재사용한다.
 *
 * 프로덕션 빌드에는 Metro가 없으므로 이 경로를 타지 않는다 — 설정값(.env)이 그대로 원본.
 */

/** 사설망·루프백 대역 — 이 대역일 때만 Metro 호스트로 갈아끼운다 */
const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

const URL_PARTS = /^(https?:\/\/)([^/:]+)(:\d+)?(\/.*)?$/;

/** `172.30.1.5:8081` · `172.30.1.5` · `exp://172.30.1.5:8081` → `172.30.1.5` */
export function hostFrom(hostUri: string | null | undefined): string | null {
  if (!hostUri) return null;
  const withoutScheme = hostUri.replace(/^[a-z+]+:\/\//i, '');
  const host = withoutScheme.split('/')[0].split(':')[0];
  return host || null;
}

/**
 * @param configured  EXPO_PUBLIC_API_URL (없을 수 있음)
 * @param metroHost   Metro 서버 호스트 (프로덕션이면 null)
 * @param prodFallback 설정도 Metro도 없을 때 쓸 주소
 */
export function resolveBaseUrl(
  configured: string | undefined,
  metroHost: string | null,
  prodFallback: string,
): string {
  if (!metroHost) return configured || prodFallback;

  if (!configured) return `http://${metroHost}:8080/api`;

  const parts = configured.match(URL_PARTS);
  if (!parts) return configured;

  const [, scheme, host, port = '', path = ''] = parts;
  // 설정값이 공개 도메인이면 개발 중에도 존중한다 (dev에서 프로드를 겨냥하는 경우)
  if (!PRIVATE_HOST.test(host)) return configured;
  if (host === metroHost) return configured;

  return `${scheme}${metroHost}${port}${path}`;
}
