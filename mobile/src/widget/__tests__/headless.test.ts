import { runPomodoroCommand } from '../headless';
import * as store from '../../pomodoro/store';
import * as persistence from '../../pomodoro/persistence';

jest.mock('../../pomodoro/store', () => ({
  initPomodoro: jest.fn(async () => null),
  getSession: jest.fn(() => null),
  startSession: jest.fn(async () => {}),
  pauseSession: jest.fn(async () => {}),
  resumeSession: jest.fn(async () => {}),
  resetSession: jest.fn(async () => true),
}));
jest.mock('../../pomodoro/persistence', () => ({
  loadSettings: jest.fn(async () => ({ focusMin: 25, breakMin: 5, setsTarget: 2, longBreakMin: 15, longBreakEvery: 4 })),
}));

describe('runPomodoroCommand', () => {
  beforeEach(() => jest.clearAllMocks());

  it('start: 세션 없으면 마지막 설정·태스크 없이 시작', async () => {
    await runPomodoroCommand({ command: 'start' });
    expect(store.initPomodoro).toHaveBeenCalled();
    expect(store.startSession).toHaveBeenCalledWith(await (persistence.loadSettings as jest.Mock)(), null);
  });

  it('start: 세션이 이미 있으면 중복 시작하지 않는다', async () => {
    (store.getSession as jest.Mock).mockReturnValue({ anchor: 1 });
    await runPomodoroCommand({ command: 'start' });
    expect(store.startSession).not.toHaveBeenCalled();
  });

  it('pause/resume 위임', async () => {
    await runPomodoroCommand({ command: 'pause' });
    expect(store.pauseSession).toHaveBeenCalled();
    await runPomodoroCommand({ command: 'resume' });
    expect(store.resumeSession).toHaveBeenCalled();
  });

  it('reset 위임 — 위젯 초기화 버튼이 정산 포함 리셋을 태운다', async () => {
    await runPomodoroCommand({ command: 'reset' });
    expect(store.resetSession).toHaveBeenCalled();
  });
});
