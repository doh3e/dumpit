import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampSettings, type PomodoroSettings, type Session } from './engine';

const SESSION_KEY = 'dumpit_pomodoro_session';
const SETTINGS_KEY = 'dumpit_pomodoro_settings';

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (typeof parsed.anchor !== 'number') return null;
    return { ...parsed, settings: clampSettings(parsed.settings ?? {}) };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function saveSettings(s: PomodoroSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export async function loadSettings(): Promise<PomodoroSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return clampSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return clampSettings({});
  }
}
