/**
 * 뽀모도로 타임라인 — 단일 앵커(epoch ms)에서 전부 재계산한다.
 * 세트 전환 규칙은 웹 pomodoroCycle.js·서버 PomodoroSettleCalculator와 삼자 일치 필수:
 * 집중 후 (완료수 % longBreakEvery === 0 ? 긴휴식 : 휴식), setsTarget 1 = 휴식 없이 종료,
 * setsTarget >= 2 && 완료수 >= setsTarget = 종료, setsTarget 0 = 무한.
 */
export type PomodoroSettings = {
  focusMin: number;
  breakMin: number;
  setsTarget: number;
  longBreakMin: number;
  longBreakEvery: number;
};

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25, breakMin: 5, setsTarget: 1, longBreakMin: 15, longBreakEvery: 4,
};

const clampInt = (v: number | undefined, min: number, max: number, fallback: number) =>
  v == null || Number.isNaN(v) ? fallback : Math.max(min, Math.min(max, Math.round(v)));

export function clampSettings(s: Partial<PomodoroSettings>): PomodoroSettings {
  return {
    focusMin: clampInt(s.focusMin, 1, 120, 25),
    breakMin: clampInt(s.breakMin, 1, 120, 5),
    setsTarget: clampInt(s.setsTarget, 0, 12, 1),
    longBreakMin: clampInt(s.longBreakMin, 1, 120, 15),
    longBreakEvery: clampInt(s.longBreakEvery, 1, 12, 4),
  };
}

export type Session = {
  settings: PomodoroSettings;
  anchor: number;           // 계획 시작 epoch ms — 일시정지 재개 시 뒤로 밀린다
  pausedAt: number | null;
  taskId: string | null;
  taskTitle: string | null;
  lastSettled: number;      // 서버 정산 완료된 집중 세트 수
};

export type Phase = {
  kind: 'FOCUS' | 'BREAK';
  index: number;            // FOCUS면 몇 번째 집중(1부터), BREAK면 직전 집중 번호
  long: boolean;
  startsAt: number;
  endsAt: number;
};

export type DerivedState = {
  phase: 'FOCUS' | 'BREAK' | 'DONE';
  long: boolean;
  remainingSec: number;
  phaseEndAt: number;
  completedFocusCount: number;
};

const MAX_PHASES = 2001; // 무한 세트 폭주 방지 (서버 정산 상한 1000세트 × 2)

/** anchor부터의 페이즈 시퀀스 — DONE에 닿으면 멈춘다 */
function* timeline(session: Session): Generator<Phase> {
  const { focusMin, breakMin, setsTarget, longBreakMin, longBreakEvery } = session.settings;
  let cursor = session.anchor;
  for (let i = 1; i <= MAX_PHASES; i++) {
    const focusEnd = cursor + focusMin * 60_000;
    yield { kind: 'FOCUS', index: i, long: false, startsAt: cursor, endsAt: focusEnd };
    cursor = focusEnd;
    if (setsTarget === 1) return;                     // 단일 세트: 휴식 없이 종료
    if (setsTarget >= 2 && i >= setsTarget) return;   // 유한 세트 완주
    const long = i % longBreakEvery === 0;
    const breakEnd = cursor + (long ? longBreakMin : breakMin) * 60_000;
    yield { kind: 'BREAK', index: i, long, startsAt: cursor, endsAt: breakEnd };
    cursor = breakEnd;
  }
}

export function deriveState(session: Session, now: number): DerivedState {
  const effectiveNow = session.pausedAt ?? now;
  let completed = 0;
  let last: Phase | null = null;
  for (const phase of timeline(session)) {
    last = phase;
    if (effectiveNow < phase.endsAt) {
      return {
        phase: phase.kind,
        long: phase.kind === 'BREAK' ? phase.long : false,
        remainingSec: Math.ceil((phase.endsAt - effectiveNow) / 1000),
        phaseEndAt: phase.endsAt,
        completedFocusCount: completed,
      };
    }
    if (phase.kind === 'FOCUS') completed += 1;
  }
  return { phase: 'DONE', long: false, remainingSec: 0, phaseEndAt: last?.endsAt ?? effectiveNow, completedFocusCount: completed };
}

/** 현재(진행 중) 페이즈부터 최대 count개 — 알림 계획용. DONE에 닿으면 거기서 끝 */
export function phasesFrom(session: Session, now: number, count: number): Phase[] {
  const effectiveNow = session.pausedAt ?? now;
  const result: Phase[] = [];
  for (const phase of timeline(session)) {
    if (phase.endsAt <= effectiveNow) continue;
    result.push(phase);
    if (result.length >= count) break;
  }
  return result;
}

export function pause(session: Session, now: number): Session {
  if (session.pausedAt != null) return session;
  return { ...session, pausedAt: now };
}

export function resume(session: Session, now: number): Session {
  if (session.pausedAt == null) return session;
  return { ...session, anchor: session.anchor + (now - session.pausedAt), pausedAt: null };
}
