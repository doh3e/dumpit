// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SettingsModal from './SettingsModal'

const applyTheme = vi.fn()
const applyFontScale = vi.fn()
const applyContrast = vi.fn()
const applyBoldText = vi.fn()
const saveUserSettings = vi.fn()

vi.mock('../utils/notifications', () => ({
  getNotificationPermission: () => 'unsupported',
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
})
