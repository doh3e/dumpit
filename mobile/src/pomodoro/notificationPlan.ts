import { deriveState, phasesFrom, type Phase, type Session } from './engine';

/**
 * 상시(live) 알림 id 접두사. 페이즈마다 **유니크 id**를 쓴다 — 같은 id로 여러 트리거를 예약하면
 * AlarmManager PendingIntent(requestCode = id.hashCode())가 서로 덮어써 마지막 1개만 남기 때문
 * (2026-07-24 리뷰 C1). 이전 페이즈의 live는 timeoutAfterMs로 자기 페이즈 끝에 자동 소멸한다.
 */
export const LIVE_PREFIX = 'pomodoro-live';

export type PlannedNotification = {
  id: string;
  at: number | null;               // null = 즉시 표시, 숫자 = TimestampTrigger epoch ms
  channel: 'pomodoro-ongoing' | 'pomodoro-alert';
  title: string;
  body: string;
  ongoing: boolean;
  countdownTo: number | null;      // OS 크로노미터 목표 epoch ms
  timeoutAfterMs: number | null;   // 표시 후 자동 소멸까지 ms (다음 live가 이어받는다)
};

const ROLLING_PHASES = 6;          // 무한 세트 예약 창 — 소진 시 앱 복귀에서 재예약 (스펙 §9 한계)

function liveId(phase: Phase): string {
  return `${LIVE_PREFIX}-${phase.kind}-${phase.index}`;
}

// 크로노미터는 제조사 스킨에 따라 접힌 알림에서 안 보일 수 있어(스펙 §9),
// 어느 기종에서든 보이도록 종료 시각을 본문에 함께 박는다 (고정값이라 틱 없이도 정확)
function fmtClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function liveContent(phase: Phase, session: Session): { title: string; body: string } {
  if (phase.kind === 'FOCUS') {
    return {
      title: `🍅 집중 중${session.taskTitle ? ` · ${session.taskTitle}` : ''}`,
      body: `${fmtClock(phase.endsAt)}까지 집중 — 끝나면 알려드릴게요`,
    };
  }
  return {
    title: `☕ ${phase.long ? '긴 ' : ''}휴식 중`,
    body: `${fmtClock(phase.endsAt)}까지 쉬어요`,
  };
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
 * live는 페이즈별 유니크 id로 예약하고 timeoutAfterMs로 릴레이한다.
 */
export function buildNotificationPlan(session: Session, now: number): PlannedNotification[] {
  if (session.pausedAt != null) {
    return [{
      id: `${LIVE_PREFIX}-paused`, at: null, channel: 'pomodoro-ongoing',
      title: '⏸️ 뽀모도로 일시정지됨',
      body: session.taskTitle ? `${session.taskTitle} — 앱에서 재개하세요` : '앱에서 재개하세요',
      ongoing: true, countdownTo: null, timeoutAfterMs: null,
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
      // 현재 진행 중 페이즈 — 즉시 표시, 페이즈 끝에 자동 소멸(다음 live가 트리거로 이어받음)
      plan.push({
        id: liveId(phase), at: null, channel: 'pomodoro-ongoing', ...live,
        ongoing: true, countdownTo: phase.endsAt, timeoutAfterMs: Math.max(1000, phase.endsAt - now),
      });
    }
    // 페이즈 종료 경계: 소리 나는 alert.
    // 무한 롤링 창의 마지막 경계는 잘린 창이라 완료도 전환도 아님 — alert 생략(복귀 재예약이 창을 민다)
    const alert = boundaryAlert(phase, next, session);
    const isFinalBoundary = finite && !next;
    if (!(next == null && !finite)) {
      plan.push({
        id: `pomodoro-alert-${phase.kind}-${phase.index}`,
        at: phase.endsAt, channel: 'pomodoro-alert',
        title: isFinalBoundary ? '🎉 뽀모도로 완료' : alert.title,
        body: isFinalBoundary ? '모든 세트 완료! 수고했어요' : alert.body,
        ongoing: false, countdownTo: null, timeoutAfterMs: null,
      });
    }
    if (next) {
      // 다음 페이즈의 live — 유니크 id 트리거, 자기 페이즈 길이만큼 살고 소멸
      const nextLive = liveContent(next, session);
      plan.push({
        id: liveId(next), at: phase.endsAt, channel: 'pomodoro-ongoing', ...nextLive,
        ongoing: true, countdownTo: next.endsAt, timeoutAfterMs: next.endsAt - next.startsAt,
      });
    } else if (isFinalBoundary) {
      // 마지막 live 소멸 후 해제 가능한 완료 알림으로 마무리
      plan.push({
        id: `${LIVE_PREFIX}-done`, at: phase.endsAt, channel: 'pomodoro-ongoing',
        title: '🎉 뽀모도로 완료', body: '모든 세트를 끝냈어요',
        ongoing: false, countdownTo: null, timeoutAfterMs: null,
      });
    }
  });

  return plan;
}
