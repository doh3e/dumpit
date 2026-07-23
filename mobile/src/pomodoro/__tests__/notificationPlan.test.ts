import { DEFAULT_SETTINGS, pause, type Session } from '../engine';
import { LIVE_PREFIX, buildNotificationPlan } from '../notificationPlan';

const MIN = 60_000;
const base: Session = {
  settings: { ...DEFAULT_SETTINGS, setsTarget: 2 }, // 25/5/2세트
  anchor: 1_000_000,
  pausedAt: null,
  taskId: 't1',
  taskTitle: '그림 연습',
  lastSettled: 0,
};
const at = (min: number) => base.anchor + min * MIN;
const lives = (plan: ReturnType<typeof buildNotificationPlan>) =>
  plan.filter((n) => n.id.startsWith(LIVE_PREFIX));

describe('buildNotificationPlan', () => {
  it('실행 중: 현재 live + 경계마다 alert·다음 live, 마지막은 완료 치환', () => {
    const plan = buildNotificationPlan(base, at(10));
    // live(F1) + [집중1끝: alert+live(B1)] + [휴식1끝: alert+live(F2)] + [집중2끝: alert+완료치환] = 7
    expect(plan).toHaveLength(7);

    const immediate = plan[0];
    expect(immediate).toMatchObject({
      id: 'pomodoro-live-FOCUS-1', at: null, ongoing: true,
      countdownTo: at(25), timeoutAfterMs: 15 * MIN,
    });
    expect(immediate.title).toContain('집중');
    expect(immediate.title).toContain('그림 연습');

    const focusEndAlert = plan.find((n) => n.channel === 'pomodoro-alert' && n.at === at(25));
    expect(focusEndAlert?.body).toContain('5분 휴식');

    // live는 페이즈별 유니크 id — 같은 id 트리거가 AlarmManager에서 덮어써지는 문제(C1) 방지
    const breakLive = plan.find((n) => n.id === 'pomodoro-live-BREAK-1');
    expect(breakLive).toMatchObject({ at: at(25), ongoing: true, countdownTo: at(30), timeoutAfterMs: 5 * MIN });
    expect(breakLive?.title).toContain('휴식');

    const liveIds = lives(plan).map((n) => n.id);
    expect(new Set(liveIds).size).toBe(liveIds.length); // 전부 유니크

    const doneAlert = plan.find((n) => n.channel === 'pomodoro-alert' && n.at === at(55));
    expect(doneAlert?.body).toContain('모든 세트 완료');

    const doneLive = plan.find((n) => n.id === `${LIVE_PREFIX}-done`);
    expect(doneLive).toMatchObject({ at: at(55), ongoing: false, countdownTo: null });
  });

  it('무한 세트는 6페이즈 롤링 — 잘린 창의 마지막 경계는 alert·live 생략', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0 } };
    const plan = buildNotificationPlan(s, at(10));
    expect(lives(plan).filter((n) => n.at !== null)).toHaveLength(5);
    expect(plan.filter((n) => n.channel === 'pomodoro-alert')).toHaveLength(5);
  });

  it('일시정지: 정적 live 1개', () => {
    const plan = buildNotificationPlan(pause(base, at(10)), at(10));
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      id: `${LIVE_PREFIX}-paused`, at: null, ongoing: true, countdownTo: null, timeoutAfterMs: null,
    });
    expect(plan[0].title).toContain('일시정지');
  });

  it('DONE: 빈 계획', () => {
    expect(buildNotificationPlan(base, at(60))).toHaveLength(0);
  });

  it('긴휴식 라벨', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0, longBreakEvery: 1 } };
    const plan = buildNotificationPlan(s, at(26)); // 긴휴식 진행 중
    expect(plan[0].title).toContain('긴 휴식');
  });
});
