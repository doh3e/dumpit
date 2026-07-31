import { buildPomodoroMirror, buildThemeMirror, buildTodayMirror, clearWidgetMirrors } from '../mirror';
import { widgetNative } from '../native';
import type { Session } from '../../pomodoro/engine';

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

describe('buildTodayMirror', () => {
  it('표시용 필드만 추려 담는다', () => {
    const json = JSON.parse(buildTodayMirror([
      { taskId: 't1', title: '리포트', deadline: '2026-07-29T14:30:00', status: 'TODO' },
    ] as never, NOW));
    expect(json.loggedIn).toBe(true);
    expect(json.tasks[0]).toEqual({ taskId: 't1', title: '리포트', deadline: '14:30', status: 'TODO' });
  });
});

describe('clearWidgetMirrors', () => {
  it('로그아웃 형태로 두 미러를 모두 비운다', async () => {
    await clearWidgetMirrors();
    expect(widgetNative!.mirrorTodayTasks).toHaveBeenCalledWith(
      JSON.stringify({ updatedAt: 0, loggedIn: false, tasks: [] }),
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
