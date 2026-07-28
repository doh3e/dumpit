/** 서버 푸시 payload의 data.link → expo-router 경로 (백엔드 PushSender 계약: 'home' | 'notices') */
export function routeForLink(link: string | undefined): string | null {
  switch (link) {
    case 'home': return '/(tabs)';
    case 'notices': return '/notices';
    default: return null;
  }
}
