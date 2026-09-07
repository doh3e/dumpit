import { AccessibilityInfo } from 'react-native';

/** TalkBack 발화 — 화면에 보이는 토스트·상태 변화는 반드시 이 함수로도 알린다 */
export function announce(text: string): void {
  if (!text) return;
  AccessibilityInfo.announceForAccessibility(text);
}
