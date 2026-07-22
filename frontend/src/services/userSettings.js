import api from './api'

export const DEFAULT_SETTINGS = {
  routineStartHour: 9,
  routineEndHour: 22,
  notificationsEnabled: true,
  notificationThresholds: [60],
}

// 서버 저장 전환 전에 쓰던 로컬 키 — 이관 없이 제거만 한다
const LEGACY_KEYS = [
  'dumpit_routine_start',
  'dumpit_routine_end',
  'dumpit_notification_thresholds',
  'dumpit_notifications_enabled',
]

let settings = { ...DEFAULT_SETTINGS }
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener(settings))
}

export function getUserSettings() {
  return settings
}

export function subscribeUserSettings(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 로그인 직후 호출 — 실패해도 기본값으로 동작한다 */
export async function loadUserSettings() {
  try {
    const res = await api.get('/me/settings')
    settings = { ...DEFAULT_SETTINGS, ...res.data }
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
    emit()
  } catch {
    /* 네트워크 오류 등 — 기본값 유지 */
  }
  return settings
}

export async function saveUserSettings(patch) {
  const res = await api.patch('/me/settings', patch)
  settings = { ...DEFAULT_SETTINGS, ...res.data }
  emit()
  return settings
}

export function resetUserSettings() {
  settings = { ...DEFAULT_SETTINGS }
  emit()
}
