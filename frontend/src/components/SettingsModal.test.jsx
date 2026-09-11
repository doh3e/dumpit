// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SettingsModal from './SettingsModal'

const notificationState = vi.hoisted(() => ({ permission: 'unsupported' }))
const applyTheme = vi.fn()
const applyFontScale = vi.fn()
const applyContrast = vi.fn()
const applyBoldText = vi.fn()
const saveUserSettings = vi.fn()

vi.mock('../utils/notifications', () => ({
  getNotificationPermission: () => notificationState.permission,
  showBrowserNotification: vi.fn(),
}))
vi.mock('../utils/theme', () => ({
  applyTheme: (...args) => applyTheme(...args),
  getThemePref: () => 'system',
}))
vi.mock('../utils/fontScale', () => ({
  applyFontScale: (...args) => applyFontScale(...args),
  getFontScalePref: () => 'base',
  FONT_SCALES: {
    sm: { label: '작게', size: '90%' },
    base: { label: '기본', size: '100%' },
    lg: { label: '크게', size: '112.5%' },
    xl: { label: '아주 크게', size: '125%' },
  },
}))
vi.mock('../utils/a11y', () => ({
  applyContrast: (...args) => applyContrast(...args),
  getContrastPref: () => 'system',
  applyBoldText: (...args) => applyBoldText(...args),
  getBoldTextPref: () => false,
  CONTRAST_OPTIONS: [
    { value: 'system', label: '시스템' },
    { value: 'high', label: '고대비' },
    { value: 'normal', label: '기본' },
  ],
}))
vi.mock('../services/userSettings', () => ({
  getUserSettings: () => ({
    routineStartHour: 9,
    routineEndHour: 22,
    notificationsEnabled: true,
    notificationThresholds: [60],
  }),
  saveUserSettings: (...args) => saveUserSettings(...args),
}))

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

describe('SettingsModal', () => {
  beforeEach(() => {
    notificationState.permission = 'unsupported'
    delete window.dumpitDesktop
    saveUserSettings.mockResolvedValue({ routineStartHour: 10, routineEndHour: 21 })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('기기 설정은 즉시 적용하고 서버 설정 저장과 섞지 않는다', () => {
    render(<SettingsModal onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '라이트' }))

    expect(applyTheme).toHaveBeenCalledWith('light')
    expect(saveUserSettings).not.toHaveBeenCalled()
  })

  it('일과 시간은 저장 버튼을 눌렀을 때만 서버에 저장한다', async () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('종료'), { target: { value: '21' } })
    expect(saveUserSettings).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(saveUserSettings).toHaveBeenCalledWith({ routineStartHour: 10, routineEndHour: 21 })
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('서버 저장 실패를 닫지 않고 refined 오류 표면에 유지한다', async () => {
    const onClose = vi.fn()
    saveUserSettings.mockRejectedValueOnce({ userMessage: '설정 저장 실패' })
    render(<SettingsModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('설정 저장 실패')
    expect(alert).toHaveClass('surface-refined', 'tone-danger', 'text-danger')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('refined 표면과 44px 조작 영역을 사용하면서 닫기 동작을 유지한다', () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '설정' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByLabelText('시작')).toHaveClass('input-refined')
    expect(screen.getByRole('button', { name: '마감 임박 알림 토글' })).toHaveClass('!h-11', '!w-11')

    const close = screen.getByRole('button', { name: '닫기', exact: true })
    expect(close).toHaveClass('btn-refined', 'btn-refined-text', '!h-11', '!w-11')
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('알림 켜짐/꺼짐을 aria-pressed와 서버 저장에 함께 반영한다', async () => {
    notificationState.permission = 'granted'
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '마감 임박 알림 토글' })

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(saveUserSettings).toHaveBeenCalledWith({ notificationsEnabled: false })

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(saveUserSettings).toHaveBeenCalledWith({ notificationsEnabled: true })
    await waitFor(() => expect(saveUserSettings).toHaveBeenCalledTimes(2))
  })

  it('알림 저장 실패 시 aria-pressed를 이전 켜짐 상태로 롤백한다', async () => {
    notificationState.permission = 'granted'
    saveUserSettings.mockRejectedValueOnce({ userMessage: '알림 저장 실패' })
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '마감 임박 알림 토글' })

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('alert')).toHaveTextContent('알림 저장 실패')
  })

  it.each(['unsupported', 'denied'])('%s 알림 권한에서는 비활성 상태 의미를 유지한다', (permission) => {
    notificationState.permission = permission
    render(<SettingsModal onClose={() => {}} />)

    const toggle = screen.getByRole('button', { name: '마감 임박 알림 토글' })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('시작프로그램 켜짐/꺼짐을 aria-pressed와 데스크톱 브리지에 함께 반영한다', async () => {
    const setLaunchAtLogin = vi.fn().mockResolvedValue(undefined)
    window.dumpitDesktop = {
      getAppInfo: vi.fn().mockResolvedValue(null),
      getLaunchAtLogin: vi.fn().mockResolvedValue({ enabled: true }),
      setLaunchAtLogin,
    }
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '시작프로그램 등록 토글' })
    await waitFor(() => expect(toggle).toBeEnabled())

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(setLaunchAtLogin).toHaveBeenCalledWith(false)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(setLaunchAtLogin).toHaveBeenCalledWith(true)
  })

  it('시작프로그램 브리지 실패 시 aria-pressed를 이전 켜짐 상태로 롤백한다', async () => {
    window.dumpitDesktop = {
      getAppInfo: vi.fn().mockResolvedValue(null),
      getLaunchAtLogin: vi.fn().mockResolvedValue({ enabled: true }),
      setLaunchAtLogin: vi.fn().mockRejectedValue(new Error('bridge failed')),
    }
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '시작프로그램 등록 토글' })
    await waitFor(() => expect(toggle).toBeEnabled())

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('alert')).toHaveTextContent('시작프로그램 설정을 바꾸지 못했어요.')
  })

  it('시작프로그램 초기 확인 중에는 비활성·꺼짐 상태 의미를 유지한다', () => {
    window.dumpitDesktop = {
      getAppInfo: vi.fn().mockResolvedValue(null),
      getLaunchAtLogin: vi.fn(() => new Promise(() => {})),
      setLaunchAtLogin: vi.fn(),
    }
    render(<SettingsModal onClose={() => {}} />)

    const toggle = screen.getByRole('button', { name: '시작프로그램 등록 토글' })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })
})
