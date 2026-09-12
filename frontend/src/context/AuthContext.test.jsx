/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'

const mocks = vi.hoisted(() => ({
  applySkins: vi.fn(),
  clearDraft: vi.fn(),
  clearSkins: vi.fn(),
  get: vi.fn(),
  loadUserSettings: vi.fn(),
  post: vi.fn(),
  pruneExpiredDrafts: vi.fn(),
  resetUserSettings: vi.fn(),
  startUserSettingsSession: vi.fn(),
}))

vi.mock('../services/api', () => ({ default: { get: mocks.get, post: mocks.post } }))
vi.mock('../shop/applySkins.js', () => ({
  applySkins: (...args) => mocks.applySkins(...args),
  clearSkins: (...args) => mocks.clearSkins(...args),
}))
vi.mock('../services/brainDumpDraft', () => ({
  clearDraft: (...args) => mocks.clearDraft(...args),
  pruneExpiredDrafts: (...args) => mocks.pruneExpiredDrafts(...args),
}))
vi.mock('../services/userSettings', () => ({
  loadUserSettings: (...args) => mocks.loadUserSettings(...args),
  resetUserSettings: (...args) => mocks.resetUserSettings(...args),
  startUserSettingsSession: (...args) => mocks.startUserSettingsSession(...args),
}))

let auth

function Probe() {
  auth = useAuth()
  return <p>{auth.user?.email ?? 'anonymous'}</p>
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

async function renderProvider() {
  await act(async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await Promise.resolve()
  })
}

describe('AuthProvider 계정 수명', () => {
  beforeEach(() => {
    mocks.applySkins.mockReset()
    mocks.clearDraft.mockReset()
    mocks.clearSkins.mockReset()
    mocks.get.mockReset()
    mocks.loadUserSettings.mockReset().mockResolvedValue(undefined)
    mocks.post.mockReset().mockResolvedValue({ data: {} })
    mocks.pruneExpiredDrafts.mockReset()
    mocks.resetUserSettings.mockReset()
    mocks.startUserSettingsSession.mockReset()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('startup 정리는 현재 시각 인자 없이 실행하고 자동 인증 만료는 초안을 지우지 않는다', async () => {
    mocks.get.mockRejectedValueOnce(new Error('expired'))

    await renderProvider()

    expect(mocks.pruneExpiredDrafts).toHaveBeenCalledWith()
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(mocks.clearDraft).not.toHaveBeenCalled()
  })

  it('늦은 startup A 응답이 최신 refresh B 계정과 설정 세션을 덮지 않는다', async () => {
    const startupA = deferred()
    const refreshB = deferred()
    mocks.get.mockReturnValueOnce(startupA.promise).mockReturnValueOnce(refreshB.promise)
    await renderProvider()

    let refresh
    await act(async () => {
      refresh = auth.refreshCoins()
      refreshB.resolve({ data: { email: 'b@example.com', equipments: {} } })
      await refresh
    })
    startupA.resolve({ data: { email: 'a@example.com', equipments: {} } })
    await act(async () => { await startupA.promise })

    expect(screen.getByText('b@example.com')).toBeInTheDocument()
    expect(mocks.startUserSettingsSession).toHaveBeenCalledTimes(1)
    expect(mocks.startUserSettingsSession).toHaveBeenCalledWith('b@example.com')
  })

  it('명시적 로그아웃은 기존 서버 오류 계약을 유지하면서 해당 계정 초안을 마지막으로 정리한다', async () => {
    mocks.get.mockResolvedValueOnce({ data: { email: 'a@example.com', equipments: {} } })
    await renderProvider()
    mocks.post.mockRejectedValueOnce(new Error('server down'))

    await act(async () => { await expect(auth.logout()).rejects.toThrow('server down') })

    expect(mocks.clearDraft).toHaveBeenCalledWith('a@example.com')
    expect(mocks.resetUserSettings).toHaveBeenCalled()
    expect(screen.getByText('anonymous')).toBeInTheDocument()
  })

  it('로그아웃 초안 삭제 실패를 인증 실패로 바꾸지 않고 reload 전에 알린다', async () => {
    mocks.get.mockResolvedValueOnce({ data: { email: 'a@example.com', equipments: {} } })
    mocks.clearDraft.mockImplementationOnce(() => { throw new Error('민감한 저장 오류') })
    await renderProvider()

    await act(async () => { await auth.logout() })

    expect(screen.getByText('anonymous')).toBeInTheDocument()
    expect(window.alert).toHaveBeenCalledWith('로그아웃했지만 이 기기의 원문 초안을 지우지 못했어요.')
    expect(window.alert.mock.calls.flat().join(' ')).not.toContain('민감한 저장 오류')
  })
})
