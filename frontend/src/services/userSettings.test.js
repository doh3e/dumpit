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
  startUserSettingsSession,
  subscribeUserSettings,
} from './userSettings'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

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

  it('AI 메모리 저장·비우기도 PATCH로 반영된다', async () => {
    api.patch.mockResolvedValue({ data: { ...DEFAULT_SETTINGS, aiMemory: '운동이 최우선' } })

    await saveUserSettings({ aiMemory: '운동이 최우선' })

    expect(api.patch).toHaveBeenCalledWith('/me/settings', { aiMemory: '운동이 최우선' })
    expect(getUserSettings().aiMemory).toBe('운동이 최우선')

    api.patch.mockResolvedValue({ data: { ...DEFAULT_SETTINGS, aiMemory: null } })
    await saveUserSettings({ aiMemory: '' })
    expect(getUserSettings().aiMemory).toBeNull()
  })

  it('저장 실패는 그대로 던지고 값은 유지한다', async () => {
    api.patch.mockRejectedValue(new Error('bad request'))

    await expect(saveUserSettings({ routineStartHour: 24 })).rejects.toThrow()
    expect(getUserSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('A 설정 로드가 늦게 끝나도 B 계정 설정을 덮지 않는다', async () => {
    const accountA = deferred()
    api.get.mockReturnValueOnce(accountA.promise)
    startUserSettingsSession('a@example.com')
    const loadA = loadUserSettings()

    startUserSettingsSession('b@example.com')
    api.get.mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 7 } })
    await loadUserSettings()
    accountA.resolve({ data: { ...DEFAULT_SETTINGS, routineStartHour: 23 } })
    await loadA

    expect(getUserSettings().routineStartHour).toBe(7)
  })

  it('A→B→A에서도 첫 A 세대의 늦은 저장 응답을 현재 A에 반영하지 않는다', async () => {
    const oldAccountA = deferred()
    api.patch.mockReturnValueOnce(oldAccountA.promise)
    startUserSettingsSession('a@example.com')
    const saveOldA = saveUserSettings({ routineStartHour: 23 })
    await vi.waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))

    startUserSettingsSession('b@example.com')
    startUserSettingsSession('a@example.com')
    api.patch.mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 8 } })
    await saveUserSettings({ routineStartHour: 8 })
    oldAccountA.resolve({ data: { ...DEFAULT_SETTINGS, routineStartHour: 23 } })
    await expect(saveOldA).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' })

    expect(getUserSettings().routineStartHour).toBe(8)
  })

  it('같은 계정에서도 최신 저장 뒤 늦은 로드 응답을 반영하지 않는다', async () => {
    const oldLoad = deferred()
    startUserSettingsSession('a@example.com')
    api.get.mockReturnValueOnce(oldLoad.promise)
    const loading = loadUserSettings()
    api.patch.mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 8 } })
    await saveUserSettings({ routineStartHour: 8 })

    oldLoad.resolve({ data: { ...DEFAULT_SETTINGS, routineStartHour: 23 } })
    await loading

    expect(getUserSettings().routineStartHour).toBe(8)
  })

  it('서로 다른 섹션의 저장을 순서대로 전송하고 마지막 서버 응답을 보존한다', async () => {
    const first = deferred()
    api.patch
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ data: {
        ...DEFAULT_SETTINGS,
        routineStartHour: 8,
        notificationsEnabled: false,
      } })
    startUserSettingsSession('a@example.com')

    const notificationSave = saveUserSettings({ notificationsEnabled: false })
    const routineSave = saveUserSettings({ routineStartHour: 8 })

    await vi.waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    first.resolve({ data: { ...DEFAULT_SETTINGS, notificationsEnabled: false } })
    await notificationSave
    await routineSave

    expect(api.patch.mock.calls).toEqual([
      ['/me/settings', { notificationsEnabled: false }],
      ['/me/settings', { routineStartHour: 8 }],
    ])
    expect(getUserSettings()).toEqual(expect.objectContaining({
      routineStartHour: 8,
      notificationsEnabled: false,
    }))
  })

  it('계정 전환 전에 대기하던 저장은 새 세션 쿠키로 전송하지 않고 거절한다', async () => {
    const first = deferred()
    api.patch.mockReturnValueOnce(first.promise)
    startUserSettingsSession('a@example.com')
    const sentFromA = saveUserSettings({ notificationsEnabled: false })
    const queuedFromA = saveUserSettings({ routineStartHour: 23 })
    await vi.waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))

    startUserSettingsSession('b@example.com')
    api.patch.mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 7 } })
    const saveFromB = saveUserSettings({ routineStartHour: 7 })
    first.resolve({ data: { ...DEFAULT_SETTINGS, notificationsEnabled: false } })

    await expect(sentFromA).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' })
    await expect(queuedFromA).rejects.toMatchObject({ code: 'SETTINGS_SESSION_CHANGED' })
    await expect(saveFromB).resolves.toEqual(expect.objectContaining({ routineStartHour: 7 }))
    expect(api.patch.mock.calls).toEqual([
      ['/me/settings', { notificationsEnabled: false }],
      ['/me/settings', { routineStartHour: 7 }],
    ])
    expect(getUserSettings().routineStartHour).toBe(7)
  })

  it('실패한 저장 뒤에도 다음 저장을 전송한다', async () => {
    startUserSettingsSession('a@example.com')
    api.patch
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 8 } })

    const failed = saveUserSettings({ notificationsEnabled: false })
    const succeeded = saveUserSettings({ routineStartHour: 8 })

    await expect(failed).rejects.toThrow('first failed')
    await expect(succeeded).resolves.toEqual(expect.objectContaining({ routineStartHour: 8 }))
    expect(api.patch).toHaveBeenCalledTimes(2)
  })

  it('저장 대기 중 시작한 새 로드는 사용자가 저장 중인 값을 덮지 않는다', async () => {
    const saving = deferred()
    startUserSettingsSession('a@example.com')
    api.patch.mockReturnValueOnce(saving.promise)
    const save = saveUserSettings({ routineStartHour: 8 })
    api.get.mockResolvedValueOnce({ data: { ...DEFAULT_SETTINGS, routineStartHour: 23 } })

    await loadUserSettings()
    expect(getUserSettings()).toEqual(DEFAULT_SETTINGS)

    saving.resolve({ data: { ...DEFAULT_SETTINGS, routineStartHour: 8 } })
    await save
    expect(getUserSettings().routineStartHour).toBe(8)
  })
})
