import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, type Session } from '../engine';
import { clearSession, loadSession, loadSettings, saveSession, saveSettings } from '../persistence';

const session: Session = {
  settings: DEFAULT_SETTINGS,
  anchor: 1_000_000,
  pausedAt: null,
  taskId: 't1',
  taskTitle: '그림 연습',
  lastSettled: 1,
};

beforeEach(() => AsyncStorage.clear());

describe('세션 persistence', () => {
  it('저장·로드 라운드트립', async () => {
    await saveSession(session);
    expect(await loadSession()).toEqual(session);
  });
  it('없으면 null, clear 후 null', async () => {
    expect(await loadSession()).toBeNull();
    await saveSession(session);
    await clearSession();
    expect(await loadSession()).toBeNull();
  });
  it('깨진 JSON은 null', async () => {
    await AsyncStorage.setItem('dumpit_pomodoro_session', '{깨짐');
    expect(await loadSession()).toBeNull();
  });
});

describe('설정 persistence', () => {
  it('저장·로드, 없으면 기본값', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, focusMin: 50 });
    expect((await loadSettings()).focusMin).toBe(50);
  });
  it('범위 밖 저장값은 클램프', async () => {
    await AsyncStorage.setItem('dumpit_pomodoro_settings', JSON.stringify({ focusMin: 999 }));
    expect((await loadSettings()).focusMin).toBe(120);
  });
});
