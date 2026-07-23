import { deriveState, phasesFrom, type Phase, type Session } from './engine';

export const LIVE_ID = 'pomodoro-live';

export type PlannedNotification = {
  id: string;
  at: number | null;               // null = 즉시 표시, 숫자 = TimestampTrigger epoch ms
  channel: 'pomodoro-ongoing' | 'pomodoro-alert';
  title: string;
  body: string;
  ongoing: boolean;
  countdownTo: number | null;      // OS 크로노미터 목표 epoch ms
};

const ROLLING_PHASES = 6;          // 무한 세트 예약 창 — 소진 시 앱 복귀에서 재예약 (스펙 §9 한계)

function liveContent(phase: Phase, session: Session): { title: string; body: string } {
  if (phase.kind === 'FOCUS') {
    return {
      title: `🍅 집중 중${session.taskTitle ? ` · ${session.taskTitle}` : ''}`,
      body: '끝나면 알려드릴게요',
    };
  }
  return { title: `☕ ${phase.long ? '긴 ' : ''}휴식 중`, body: '다음 집중까지 쉬어요' };
}

function boundaryAlert(phase: Phase, next: Phase | null, session: Session): { title: string; body: string } {
  if (phase.kind === 'FOCUS') {
    if (!next) return { title: '🎉 뽀모도로 완료', body: '모든 세트 완료! 수고했어요' };
    const breakMin = next.long ? session.settings.longBreakMin : session.settings.breakMin;
    return { title: '🍅 집중 끝!', body: `${breakMin}분 ${next.long ? '긴 ' : ''}휴식 시작` };
  }
  return { title: '☕ 휴식 끝!', body: '다시 집중할 시간이에요' };
}

/**
 * 세션 상태 → 표시·예약할 알림 목록 (순수 함수 — notify-kit 호출은 notifications.ts가 담당).
 * 상시 알림은 같은 LIVE_ID 교체 예약으로 OS가 페이즈마다 크로노미터를 갈아끼운다.
 */
export function buildNotificationPlan(session: Session, now: number): PlannedNotification[] {
  if (session.pausedAt != null) {
    return [{
      id: LIVE_ID, at: null, channel: 'pomodoro-ongoing',
      title: '⏸️ 뽀모도로 일시정지됨',
      body: session.taskTitle ? `${session.taskTitle} — 앱에서 재개하세요` : '앱에서 재개하세요',
      ongoing: true, countdownTo: null,
    }];
  }

  const derived = deriveState(session, now);
  if (derived.phase === 'DONE') return [];

  const finite = session.settings.setsTarget >= 1;
  const horizon = finite ? session.settings.setsTarget * 2 : ROLLING_PHASES;
  const phases = phasesFrom(session, now, horizon);
  const plan: PlannedNotification[] = [];

  phases.forEach((phase, i) => {
    const next = phases[i + 1] ?? null;
    const live = liveContent(phase, session);
    if (i === 0) {
      // 현재 진행 중 페이즈 — 즉시 표시
      plan.push({ id: LIVE_ID, at: null, channel: 'pomodoro-ongoing', ...live, ongoing: true, countdownTo: phase.endsAt });
    }
    // 페이즈 종료 경계: 소리 나는 alert
    const alert = boundaryAlert(phase, next, session);
    // 유한 세트의 마지막 경계만 "완료"로 확정 — 무한 롤링의 마지막 경계는 창이 잘린 것이므로
    // 완료도 전환도 아니다 → alert 자체를 생략(앱 복귀 재예약이 창을 밀어준다)
    const isFinalBoundary = finite && !next;
    if (!(next == null && !finite)) {
      plan.push({
        id: `pomodoro-alert-${phase.kind}-${phase.index}`,
        at: phase.endsAt, channel: 'pomodoro-alert',
        title: isFinalBoundary ? '🎉 뽀모도로 완료' : alert.title,
        body: isFinalBoundary ? '모든 세트 완료! 수고했어요' : alert.body,
        ongoing: false, countdownTo: null,
      });
    }
    if (next) {
      // 경계에서 live를 다음 페이즈 크로노미터로 교체
      const nextLive = liveContent(next, session);
      plan.push({ id: LIVE_ID, at: phase.endsAt, channel: 'pomodoro-ongoing', ...nextLive, ongoing: true, countdownTo: next.endsAt });
    } else if (isFinalBoundary) {
      // 상시 알림을 해제 가능한 완료 알림으로 치환
      plan.push({
        id: LIVE_ID, at: phase.endsAt, channel: 'pomodoro-ongoing',
        title: '🎉 뽀모도로 완료', body: '모든 세트를 끝냈어요',
        ongoing: false, countdownTo: null,
      });
    }
  });

  return plan;
}
