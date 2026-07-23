import { DEFAULT_SETTINGS, pause, type Session } from '../engine';
import { LIVE_ID, buildNotificationPlan } from '../notificationPlan';

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

describe('buildNotificationPlan', () => {
  it('실행 중: 현재 live + 경계마다 alert·live 교체, 마지막은 완료 치환', () => {
    const plan = buildNotificationPlan(base, at(10));
    // live(즉시) + [집중1끝: alert+live교체] + [휴식1끝: alert+live교체] + [집중2끝: alert+완료치환] = 7
    expect(plan).toHaveLength(7);

    const immediate = plan[0];
    expect(immediate).toMatchObject({ id: LIVE_ID, at: null, ongoing: true, countdownTo: at(25) });
    expect(immediate.title).toContain('집중');
    expect(immediate.title).toContain('그림 연습');

    const focusEndAlert = plan.find((n) => n.channel === 'pomodoro-alert' && n.at === at(25));
    expect(focusEndAlert?.body).toContain('5분 휴식');

    const breakLive = plan.find((n) => n.id === LIVE_ID && n.at === at(25));
    expect(breakLive).toMatchObject({ ongoing: true, countdownTo: at(30) });
    expect(breakLive?.title).toContain('휴식');

    const doneAlert = plan.find((n) => n.channel === 'pomodoro-alert' && n.at === at(55));
    expect(doneAlert?.body).toContain('모든 세트 완료');

    const doneLive = plan.find((n) => n.id === LIVE_ID && n.at === at(55));
    expect(doneLive).toMatchObject({ ongoing: false, countdownTo: null });
  });

  it('무한 세트는 6페이즈 롤링', () => {
    const s = { ...base, settings: { ...base.settings, setsTarget: 0 } };
    const plan = buildNotificationPlan(s, at(10));
    // 페이즈 6개 창: 마지막 페이즈의 끝 경계는 잘린 창이라 alert·live 모두 생략 → 경계 5개만
    expect(plan.filter((n) => n.id === LIVE_ID && n.at !== null)).toHaveLength(5);
    expect(plan.filter((n) => n.channel === 'pomodoro-alert')).toHaveLength(5);
  });

  it('일시정지: 정적 live 1개', () => {
    const plan = buildNotificationPlan(pause(base, at(10)), at(10));
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ id: LIVE_ID, at: null, ongoing: true, countdownTo: null });
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
