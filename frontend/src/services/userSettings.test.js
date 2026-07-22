// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))

import api from './api'
import {
  DEFAULT_SETTINGS,
  getUserSettings,
  loadUserSettings,
  resetUserSettings,
  saveUserSettings,
  subscribeUserSettings,
} from './userSettings'

describe('userSettings store', () => {
  beforeEach(() => {
    resetUserSettings()
    vi.clearAllMocks()
  })

  it('로드 성공 시 서버 값으로 갱신하고 구독자에 알린다', async () => {
    api.get.mockResolvedValue({ data: {
      routineStartHour: 22, routineEndHour: 6,
      notificationsEnabled: false, notificationThresholds: [30],
    } })
    const seen = []
    subscribeUserSettings((s) => seen.push(s))

    await loadUserSettings()

    expect(getUserSettings().routineStartHour).toBe(22)
    expect(getUserSettings().notificationsEnabled).toBe(false)
    expect(seen).toHaveLength(1)
  })

  it('로드 성공 시 레거시 localStorage 키를 제거한다', async () => {
    localStorage.setItem('dumpit_routine_start', '8')
    localStorage.setItem('dumpit_notifications_enabled', '0')
    api.get.mockResolvedValue({ data: { ...DEFAULT_SETTINGS } })

    await loadUserSettings()

    expect(localStorage.getItem('dumpit_routine_start')).toBeNull()
    expect(localStorage.getItem('dumpit_notifications_enabled')).toBeNull()
  })

  it('로드 실패 시 기본값을 유지한다', async () => {
    api.get.mockRejectedValue(new Error('down'))

    await loadUserSettings()

    expect(getUserSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('저장은 PATCH 응답 값으로 갱신한다', async () => {
    api.patch.mockResolvedValue({ data: { ...DEFAULT_SETTINGS, routineStartHour: 8 } })

    await saveUserSettings({ routineStartHour: 8 })

    expect(api.patch).toHaveBeenCalledWith('/me/settings', { routineStartHour: 8 })
    expect(getUserSettings().routineStartHour).toBe(8)
  })

  it('저장 실패는 그대로 던지고 값은 유지한다', async () => {
    api.patch.mockRejectedValue(new Error('bad request'))

    await expect(saveUserSettings({ routineStartHour: 24 })).rejects.toThrow()
    expect(getUserSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
