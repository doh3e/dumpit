import { settlePomodoro, startPomodoroPlan } from '../../api/pomodoro';
import { patchTask } from '../../api/tasks';
import { DEFAULT_SETTINGS, type Session } from '../engine';
import * as notifications from '../notifications';
import * as persistence from '../persistence';
import {
  getSession, initPomodoro, pauseSession, reconcile, resetSession,
  resetStoreForTest, resumeSession, startSession, takePendingSettleResult,
} from '../store';

jest.mock('../notifications');
jest.mock('../persistence');
jest.mock('../../api/pomodoro');
jest.mock('../../api/tasks');

const mockSettle = settlePomodoro as jest.MockedFunction<typeof settlePomodoro>;
const mockStart = startPomodoroPlan as jest.MockedFunction<typeof startPomodoroPlan>;
const mockPatch = patchTask as jest.MockedFunction<typeof patchTask>;
const mockLoad = persistence.loadSession as jest.MockedFunction<typeof persistence.loadSession>;
const mockSave = persistence.saveSession as jest.MockedFunction<typeof persistence.saveSession>;
const mockClear = persistence.clearSession as jest.MockedFunction<typeof persistence.clearSession>;

const MIN = 60_000;
const T0 = 10_000_000;

function sessionAt(overrides: Partial<Session> = {}): Session {
  return {
    settings: { ...DEFAULT_SETTINGS, setsTarget: 2 }, // 25/5/2세트
    anchor: T0, pausedAt: null, taskId: null, taskTitle: null, lastSettled: 0,
    ...overrides,
  };
}

let nowSpy: jest.SpyInstance<number, []>;
const setNow = (ms: number) => nowSpy.mockReturnValue(ms);

beforeEach(() => {
  jest.clearAllMocks();
  resetStoreForTest();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
  mockSettle.mockResolvedValue({ coins: 5, totalCoins: 5, settledSessions: 1 });
  mockLoad.mockResolvedValue(null);
});
afterEach(() => nowSpy.mockRestore());

describe('startSession', () => {
  it('계획 start → TODO 태스크 IN_PROGRESS → 저장 → 알림 적용', async () => {
    await startSession(DEFAULT_SETTINGS, { taskId: 't1', title: '그림', status: 'TODO' });
    expect(mockStart).toHaveBeenCalledWith({
      focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4, setsTarget: 1,
    });
    expect(mockPatch).toHaveBeenCalledWith('t1', { status: 'IN_PROGRESS' });
    expect(mockSave).toHaveBeenCalled();
    expect(notifications.applyPlan).toHaveBeenCalled();
    expect(getSession()?.taskTitle).toBe('그림');
  });

  it('TODO가 아니면 상태 패치 없음', async () => {
    await startSession(DEFAULT_SETTINGS, { taskId: 't1', title: '그림', status: 'IN_PROGRESS' });
    expect(mockPatch).not.toHaveBeenCalled();
  });
});

describe('reconcile', () => {
  it('완료 세트 델타 정산 후 lastSettled 갱신', async () => {
    mockLoad.mockResolvedValue(sessionAt({ lastSettled: 1 }));
    setNow(T0 + 56 * MIN); // 2세트 완료(DONE)
    mockSettle.mockResolvedValue({ coins: 5, totalCoins: 10, settledSessions: 1 });

    const result = await initPomodoro();
    expect(mockSettle).toHaveBeenCalledWith(2, true);
    expect(result).toEqual({ coins: 5, settledSessions: 1 });
    // DONE + 정산 성공 → 세션 제거·알림 취소
    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });

  it('진행 중이면 settle(finished=false) + 알림 재계획', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 27 * MIN); // 집중1 완료, 휴식 중
    await initPomodoro();
    expect(mockSettle).toHaveBeenCalledWith(1, false);
    expect(getSession()?.lastSettled).toBe(1);
    expect(notifications.applyPlan).toHaveBeenCalled();
  });

  it('정산 실패 시 lastSettled 유지·예외 없음, DONE이어도 세션 보존(재시도용)', async () => {
    mockLoad.mockResolvedValue(sessionAt());
    setNow(T0 + 56 * MIN);
    mockSettle.mockRejectedValue(new Error('offline'));

    const result = await initPomodoro();
    expect(result).toBeNull();
    expect(getSession()?.lastSettled).toBe(0);
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('새로 완료된 세트가 없으면 settle 호출 없음', async () => {
    mockLoad.mockResolvedValue(sessionAt({ lastSettled: 1 }));
    setNow(T0 + 27 * MIN);
    await initPomodoro();
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('코인 지급 결과는 보류됐다가 1회만 소비된다', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 27 * MIN);
    await initPomodoro();
    expect(takePendingSettleResult()).toEqual({ coins: 5, settledSessions: 1 });
    expect(takePendingSettleResult()).toBeNull();
  });

  it('동시 reconcile은 같은 promise를 공유해 settle이 1회만 나간다', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 27 * MIN);
    await initPomodoro();
    jest.clearAllMocks();
    setNow(T0 + 57 * MIN); // 2세트째 완료
    await Promise.all([reconcile(), reconcile()]);
    expect(mockSettle).toHaveBeenCalledTimes(1);
  });

  it('서버가 cap으로 깎으면 인정분만큼만 전진해 다음에 재청구한다', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 57 * MIN); // 클라 기준 2세트 완료
    mockSettle.mockResolvedValue({ coins: 5, totalCoins: 5, settledSessions: 1 }); // 서버는 1세트만 인정
    await initPomodoro();
    expect(getSession()?.lastSettled).toBe(1); // 2가 아니라 서버 인정분 1
  });
});

describe('pause/resume/reset', () => {
  it('일시정지·재개가 앵커를 밀고 저장한다', async () => {
    await startSession(DEFAULT_SETTINGS, null);
    setNow(T0 + 10 * MIN);
    await pauseSession();
    expect(getSession()?.pausedAt).toBe(T0 + 10 * MIN);

    setNow(T0 + 40 * MIN);
    await resumeSession();
    expect(getSession()?.pausedAt).toBeNull();
    expect(getSession()?.anchor).toBe(T0 + 30 * MIN); // 30분 밀림
  });

  it('리셋: 현재 완료 수로 finished 정산 + 알림 취소 + 세션 제거', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 }, lastSettled: 1 }));
    setNow(T0 + 27 * MIN);
    await initPomodoro();
    jest.clearAllMocks();

    await expect(resetSession()).resolves.toBe(true);
    expect(mockSettle).toHaveBeenCalledWith(1, true);
    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });

  it('오프라인 리셋: 미정산 세트가 있으면 세션 보존 + false', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 27 * MIN); // 1세트 완료, lastSettled 0
    mockSettle.mockRejectedValue(new Error('offline'));
    await initPomodoro();
    jest.clearAllMocks();
    mockSettle.mockRejectedValue(new Error('offline'));

    await expect(resetSession()).resolves.toBe(false);
    expect(mockClear).not.toHaveBeenCalled();
    expect(getSession()).not.toBeNull();
  });

  it('오프라인 리셋: 정산할 게 없으면 로컬 정리 진행 + true', async () => {
    mockLoad.mockResolvedValue(sessionAt({ settings: { ...DEFAULT_SETTINGS, setsTarget: 0 } }));
    setNow(T0 + 10 * MIN); // 완료 세트 없음
    await initPomodoro();
    jest.clearAllMocks();
    mockSettle.mockRejectedValue(new Error('offline'));

    await expect(resetSession()).resolves.toBe(true);
    expect(mockClear).toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });
});
