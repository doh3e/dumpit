import { buildHeroMirror, buildPomodoroMirror, buildThemeMirror, clearWidgetMirrors } from '../mirror';
import { widgetNative } from '../native';
import { pause, resume, type Session } from '../../pomodoro/engine';
import type { PlanningResponse } from '../../api/types';

jest.mock('../native', () => ({
  widgetNative: {
    mirrorConfig: jest.fn(async () => {}),
    mirrorTodayTasks: jest.fn(async () => {}),
    mirrorPomodoro: jest.fn(async () => {}),
    mirrorTheme: jest.fn(async () => {}),
  },
}));

test('buildThemeMirror가 장착 코드를 접미사로 변환한다', () => {
  const json = JSON.parse(buildThemeMirror('dark', {
    BACKGROUND: 'bg.galaxy', POMODORO: 'pomo.candy', PLANET: 'planet.earth',
  }));
  expect(json).toEqual({ mode: 'dark', bgSkin: 'galaxy', pomoSkin: 'candy', planet: 'earth' });
});

test('buildThemeMirror가 미장착을 null로 둔다', () => {
  const json = JSON.parse(buildThemeMirror('system', null));
  expect(json).toEqual({ mode: 'system', bgSkin: null, pomoSkin: null, planet: null });
});

const NOW = 1_753_776_000_000;

const session: Session = {
  settings: { focusMin: 25, breakMin: 5, setsTarget: 2, longBreakMin: 15, longBreakEvery: 4 },
  anchor: NOW,
  pausedAt: null,
  taskId: null,
  taskTitle: null,
  lastSettled: 0,
};

describe('buildPomodoroMirror', () => {
  it('세션 없음 → null', () => {
    expect(buildPomodoroMirror(null, NOW)).toBeNull();
  });

  it('실행 중 세션은 페이즈 타임라인을 담는다', () => {
    const json = JSON.parse(buildPomodoroMirror(session, NOW)!);
    expect(json.pausedAt).toBeNull();
    expect(json.phases.length).toBeGreaterThan(0);
    expect(json.phases[0]).toMatchObject({ kind: 'FOCUS', startsAt: NOW });
    expect(json.phases[0].endsAt).toBe(NOW + 25 * 60_000);
  });

  it('일시정지면 남은 초를 고정해 담는다', () => {
    const paused: Session = { ...session, pausedAt: NOW + 60_000 };
    const json = JSON.parse(buildPomodoroMirror(paused, NOW + 120_000)!);
    expect(json.pausedAt).toBe(NOW + 60_000);
    expect(json.remainingSecAtPause).toBe(24 * 60); // 25분 중 1분 경과 시점에 정지
  });

  // --- phaseDone/phaseTotal(+focus 변형) 데이터 계약 — phasesFrom()은 "남은" 타임라인만 담고
  // 재미러(일시정지·재개·reconcile)마다 그 시점 기준으로 재생성되므로, "이미 끝난 페이즈 수"를
  // 이 필드들이 별도로 실어보내야 위젯 세션 링·세트 도트가 재미러마다 리셋되지 않는다.
  const at = (min: number) => NOW + min * 60_000;

  it('세션 시작 시점엔 phaseDone 0, phaseTotal은 세션 전체 수로 고정된다(2세트=3페이즈)', () => {
    const json = JSON.parse(buildPomodoroMirror(session, NOW)!);
    expect(json).toMatchObject({ phaseDone: 0, phaseTotal: 3, focusDone: 0, focusTotal: 2 });
  });

  it('R1: 일시정지 중엔 pausedAt 시점으로 진행률이 고정된다(now가 흘러도 불변)', () => {
    const paused: Session = { ...session, pausedAt: at(26) }; // 집중1 완료 + 휴식1 진행 중 시점에 정지
    const soon = JSON.parse(buildPomodoroMirror(paused, at(27))!);
    const muchLater = JSON.parse(buildPomodoroMirror(paused, at(999))!);
    expect(soon).toMatchObject({ phaseDone: 1, focusDone: 1 });
    expect(muchLater).toMatchObject({ phaseDone: 1, focusDone: 1 }); // now가 흘러도 그대로
  });

  it('R2: 실행 중엔 세션 객체가 그대로여도 now만 흐르면 진행률이 전진한다(틱 재구성 전제)', () => {
    const t0 = JSON.parse(buildPomodoroMirror(session, at(10))!); // 집중1 진행 중
    const t1 = JSON.parse(buildPomodoroMirror(session, at(26))!); // 집중1 완료, 휴식1 진행 중
    const t2 = JSON.parse(buildPomodoroMirror(session, at(56))!); // 세션 종료
    expect(t0).toMatchObject({ phaseDone: 0, done: false });
    expect(t1).toMatchObject({ phaseDone: 1, focusDone: 1, done: false });
    expect(t2).toMatchObject({ phaseDone: 3, focusDone: 2, done: true });
  });

  it('R3: 일시정지→재개(재미러)해도 이미 완료한 만큼이 리셋되지 않는다', () => {
    const before = JSON.parse(buildPomodoroMirror(session, at(26))!);
    const pausedSession = pause(session, at(26));
    const resumedSession = resume(pausedSession, at(34)); // 8분 정지 후 재개(앵커 이동)
    const after = JSON.parse(buildPomodoroMirror(resumedSession, at(34))!);
    expect(after.phaseDone).toBe(before.phaseDone);
    expect(after.focusDone).toBe(before.focusDone);
    expect(after.phaseDone).toBeGreaterThan(0); // 둘 다 0인 자명한 비교가 아님을 보장
  });

  it('R4: 무한 세션(setsTarget=0)은 크래시 없이 phaseTotal/focusTotal이 null이다', () => {
    const infinite: Session = { ...session, settings: { ...session.settings, setsTarget: 0 } };
    expect(() => buildPomodoroMirror(infinite, at(130))).not.toThrow();
    const json = JSON.parse(buildPomodoroMirror(infinite, at(130))!);
    expect(json.phaseTotal).toBeNull();
    expect(json.focusTotal).toBeNull();
    expect(json.phaseDone).toBeGreaterThan(0);
    expect(json.phases.length).toBeGreaterThan(0);
  });
});

const today = new Date();
const iso = (h: number) => `${today.toISOString().slice(0, 10)}T${String(h).padStart(2, '0')}:00:00`;

function makePlanning(): PlanningResponse {
  return {
    now: iso(9), availableFocusMinutes: 60,
    tasks: [
      { taskId: 'a', title: '히어로', status: 'TODO', deadline: iso(18) } as any,
      { taskId: 'b', title: '완료됨', status: 'DONE', deadline: iso(12) } as any,
      { taskId: 'c', title: '취소됨', status: 'CANCELLED', deadline: iso(13) } as any,
    ],
    nowSuggestion: { type: 'OPEN_SLOT', title: '집중 타임', message: '몰입!', task: { taskId: 'a', title: '히어로', status: 'TODO', deadline: iso(18) } as any, focusMinutes: 25 },
    focusRecommendations: [
      { task: { taskId: 'q1', title: '다음1' } as any, score: 1, bucket: 'TODAY', reasons: [] },
      { task: { taskId: 'q2', title: '다음2' } as any, score: 1, bucket: 'LATER', reasons: [] },
    ],
    sections: { overdue: [], today: [], tomorrow: [], next7Days: [], later: [], someday: [], recentDone: [] },
  };
}

test('buildHeroMirror가 히어로·큐·진행률을 담는다', () => {
  const s = JSON.parse(buildHeroMirror(makePlanning(), 1234));
  expect(s.updatedAt).toBe(1234);
  expect(s.hero).toMatchObject({ taskId: 'a', title: '히어로' });
  expect(s.hero.deadlineLabel).toContain('마감');
  expect(s.todayDone).toBe(1);       // DONE 1
  expect(s.todayTotal).toBe(2);      // CANCELLED 제외
  expect(s.allDone).toBe(false);
  expect(s.queue).toHaveLength(2);
  expect(s.queue[0]).toEqual({ taskId: 'q1', title: '다음1', bucket: 'TODAY', done: false });
});

describe('clearWidgetMirrors', () => {
  it('로그아웃 형태로 히어로 미러를 비운다', async () => {
    await clearWidgetMirrors();
    expect(widgetNative!.mirrorTodayTasks).toHaveBeenCalledWith(
      JSON.stringify({ updatedAt: 0, loggedIn: false, allDone: false, todayDone: 0, todayTotal: 0, hero: null, suggestion: null, queue: [] }),
    );
    expect(widgetNative!.mirrorPomodoro).toHaveBeenCalledWith(null);
  });

  it('장착 스킨 유출 방지를 위해 테마도 비운다 (mode는 system 고정 — 기기 설정이라 초기화 무관)', async () => {
    await clearWidgetMirrors();
    expect(widgetNative!.mirrorTheme).toHaveBeenCalledWith(
      JSON.stringify({ mode: 'system', bgSkin: null, pomoSkin: null, planet: null }),
    );
  });
});
