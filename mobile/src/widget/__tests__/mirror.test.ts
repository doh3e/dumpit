import { buildHeroMirror, buildPomodoroMirror, buildThemeMirror, clearWidgetMirrors } from '../mirror';
import { widgetNative } from '../native';
import type { Session } from '../../pomodoro/engine';
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
