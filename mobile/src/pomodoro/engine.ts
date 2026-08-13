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

const MAX_SETS = 1000; // 무한 세트 폭주 방지 — 서버 정산 상한(claimedSessions 1000)과 정렬

/** anchor부터의 페이즈 시퀀스 — DONE에 닿으면 멈춘다 */
function* timeline(session: Session): Generator<Phase> {
  const { focusMin, breakMin, setsTarget, longBreakMin, longBreakEvery } = session.settings;
  let cursor = session.anchor;
  for (let i = 1; i <= MAX_SETS; i++) {
    const focusEnd = cursor + focusMin * 60_000;
    yield { kind: 'FOCUS', index: i, long: false, startsAt: cursor, endsAt: focusEnd };
    cursor = focusEnd;
    if (setsTarget === 1) return;
    if (setsTarget >= 2 && i >= setsTarget) return;
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

export type PhaseProgress = {
  done: number;         // 완료된 전체 페이즈(FOCUS+BREAK) 수 — 일시정지면 pausedAt 기준 고정
  total: number | null; // 세션 전체 페이즈 수. 무한 세션(setsTarget=0)은 null(고정 총량이 없음)
  focusDone: number;    // 완료된 FOCUS 세트 수(도트 표시용)
  focusTotal: number | null; // 전체 FOCUS 세트 수. 무한 세션은 null
};

/**
 * 위젯 링·세트 도트 진행률의 데이터 원천 — phasesFrom()이 돌려주는 phases는 "남은" 타임라인만
 * 담고(이미 끝난 페이즈는 mirror 작성 시점에 이미 걸러짐), 매 재미러(일시정지·재개·포그라운드
 * reconcile)마다 그 시점의 effectiveNow 기준으로 다시 생성된다. 그래서 phases만으로 "완료 수"를
 * 셈하면 재미러 직후 항상 0으로 보이고, 분모(phases.length)도 세션이 진행될수록 줄어든다 — 완료
 * 수·전체 수를 이 함수가 별도로 실어보내 위젯이 그 두 값 위에 얹어 계산하게 한다.
 * 무한 세션(setsTarget=0)은 total을 계산할 방법이 없으므로(timeline이 MAX_SETS까지 유한하게
 * 끊기긴 하지만 그건 안전장치일 뿐 "세션 전체 수"가 아니다) null로 둔다 — 위젯은 굴러가는(rolling)
 * 근사치로 대체한다.
 */
export function phaseProgress(session: Session, now: number): PhaseProgress {
  const effectiveNow = session.pausedAt ?? now;
  const infinite = session.settings.setsTarget === 0;
  let done = 0;
  let focusDone = 0;
  let total = 0;
  let focusTotal = 0;
  for (const phase of timeline(session)) {
    const isDone = phase.endsAt <= effectiveNow;
    if (isDone) {
      done += 1;
      if (phase.kind === 'FOCUS') focusDone += 1;
    } else if (infinite) {
      // 무한 세션은 done까지만 필요하다 — 현재(미완료) 페이즈에 닿으면 더 셀 필요가 없다
      // (timeline은 MAX_SETS=1000까지 계속 돌아 여기서 안 끊으면 낭비다).
      break;
    }
    if (!infinite) {
      total += 1;
      if (phase.kind === 'FOCUS') focusTotal += 1;
    }
  }
  return {
    done,
    total: infinite ? null : total,
    focusDone,
    focusTotal: infinite ? null : focusTotal,
  };
}

export function pause(session: Session, now: number): Session {
  if (session.pausedAt != null) return session;
  return { ...session, pausedAt: now };
}

export function resume(session: Session, now: number): Session {
  if (session.pausedAt == null) return session;
  return { ...session, anchor: session.anchor + (now - session.pausedAt), pausedAt: null };
}
