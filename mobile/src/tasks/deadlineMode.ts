import { toLocalDateString } from './dates';

export type DeadlineMode = 'AI' | 'TODAY' | 'NONE' | 'CUSTOM';

/**
 * 마감 4모드 → 서버 payload 조각.
 * 서버 규칙: noDeadline true + non-null deadline 동시 전송은 400 — 이 함수는 그 조합을 만들지 않는다.
 */
export function buildDeadlinePayload(
  mode: DeadlineMode, custom: string | null, now: Date = new Date(),
): { deadline: string | null; noDeadline: boolean } {
  if (mode === 'TODAY') return { deadline: `${toLocalDateString(now)}T23:59`, noDeadline: false };
  if (mode === 'NONE') return { deadline: null, noDeadline: true };
  if (mode === 'CUSTOM') return { deadline: custom, noDeadline: false };
  return { deadline: null, noDeadline: false }; // AI — 서버가 추론
}
