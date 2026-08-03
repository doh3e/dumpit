import { DEFAULT_SETTINGS, clampSettings, deriveState, pause, phaseProgress, phasesFrom, resume, type Session } from '../engine';

const MIN = 60_000;
const base: Session = {
  settings: { ...DEFAULT_SETTINGS, setsTarget: 2 }, // 25/5/2세트/15/4
  anchor: 1_000_000,
  pausedAt: null,
  taskId: null,
  taskTitle: null,
  lastSettled: 0,
};
const at = (min: number) => base.anchor + min * MIN;

describe('deriveState', () => {
  it('집중 중', () => {
    const d = deriveState(base, at(10));
    expect(d).toMatchObject({ phase: 'FOCUS', completedFocusCount: 0 });
    expect(d.remainingSec).toBe(15 * 60);
    expect(d.phaseEndAt).toBe(at(25));
  });

  it('휴식 중 (집중1 완료)', () => {
    const d = deriveState(base, at(27));
    expect(d).toMatchObject({ phase: 'BREAK', long: false, completedFocusCount: 1 });
    expect(d.phaseEndAt).toBe(at(30));
  });

  it('2세트 완료 후 DONE', () => {
    const d = deriveState(base, at(56)); // 25+5+25=55분
    expect(d).toMatchObject({ phase: 'DONE', completedFocusCount: 2 });
  });

  it('세트 1은 휴식 없이 DONE', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 1 } };
    expect(deriveState(s, at(26)).phase).toBe('DONE');
  });

  it('긴휴식 주기 (every=2, 무한)', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0, longBreakEvery: 2 } };
    const d = deriveState(s, at(25 + 5 + 25 + 1)); // 집중2 완료 직후 → 긴휴식
    expect(d).toMatchObject({ phase: 'BREAK', long: true, completedFocusCount: 2 });
  });

  it('일시정지 중에는 pausedAt 기준으로 멈춘다', () => {
    const p = pause(base, at(10));
    expect(deriveState(p, at(100)).remainingSec).toBe(15 * 60);
  });

  it('재개하면 앵커가 밀려 이어진다', () => {
    const p = pause(base, at(10));
    const r = resume(p, at(40)); // 30분 정지
    expect(deriveState(r, at(40)).remainingSec).toBe(15 * 60);
    expect(deriveState(r, at(54)).remainingSec).toBe(60); // 밀린 경계(55분)의 1분 전
  });
});

describe('phasesFrom', () => {
  it('현재 페이즈부터 롤링', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0 } };
    const phases = phasesFrom(s, at(10), 3);
    expect(phases.map((p) => p.kind)).toEqual(['FOCUS', 'BREAK', 'FOCUS']);
    expect(phases[0]).toMatchObject({ index: 1, startsAt: at(0), endsAt: at(25) });
    expect(phases[1]).toMatchObject({ index: 1, endsAt: at(30) });
  });

  it('유한 세트는 DONE에서 끝난다', () => {
    const phases = phasesFrom(base, at(0), 10); // 2세트: F,B,F = 3개
    expect(phases).toHaveLength(3);
    expect(phases[2]).toMatchObject({ kind: 'FOCUS', index: 2, endsAt: at(55) });
  });
});

describe('phaseProgress', () => {
  // 위젯 세션 링·세트 도트가 재미러(일시정지·재개·reconcile)마다 완료 수를 잃던 버그의 데이터
  // 원천 수정 — phasesFrom()과 달리 "이미 끝난 페이즈 수"·"세션 전체 수"를 그대로 실어보낸다.
  it('세션 시작 시점엔 완료 0, 전체는 고정(2세트=페이즈 3개·FOCUS 2개)', () => {
    expect(phaseProgress(base, at(0))).toEqual({ done: 0, total: 3, focusDone: 0, focusTotal: 2 });
  });

  it('집중1 완료 후(휴식1 진행 중)', () => {
    expect(phaseProgress(base, at(26))).toEqual({ done: 1, total: 3, focusDone: 1, focusTotal: 2 });
  });

  it('세션 종료(DONE) 시점엔 done===total', () => {
    expect(phaseProgress(base, at(56))).toEqual({ done: 3, total: 3, focusDone: 2, focusTotal: 2 });
  });

  it('일시정지 중엔 pausedAt 기준으로 고정된다(now가 흘러도 안 변함)', () => {
    const p = pause(base, at(10));
    expect(phaseProgress(p, at(1000))).toEqual(phaseProgress(p, at(10)));
    expect(phaseProgress(p, at(10))).toEqual({ done: 0, total: 3, focusDone: 0, focusTotal: 2 });
  });

  it('재개해도 이미 완료한 만큼은 유지된다 — 리셋되지 않는다', () => {
    const before = phaseProgress(base, at(26));
    const paused = pause(base, at(26));
    const resumed = resume(paused, at(34)); // 8분 정지 후 재개
    const after = phaseProgress(resumed, at(34));
    expect(after).toEqual(before);
    expect(after.done).toBeGreaterThan(0); // 자명하게 둘 다 0인 비교가 아님을 보장
  });

  it('무한 세션(setsTarget=0)은 total/focusTotal이 null이고 크래시하지 않는다', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0 } };
    expect(() => phaseProgress(s, at(1000))).not.toThrow();
    const p = phaseProgress(s, at(130)); // 여러 세트 지난 시점
    expect(p.total).toBeNull();
    expect(p.focusTotal).toBeNull();
    expect(p.done).toBeGreaterThan(0);
    expect(p.focusDone).toBeGreaterThan(0);
  });
});

describe('clampSettings', () => {
  it('범위 밖·누락 값을 클램프한다', () => {
    expect(clampSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(clampSettings({ focusMin: 999, setsTarget: -1 })).toMatchObject({ focusMin: 120, setsTarget: 0 });
  });
});
