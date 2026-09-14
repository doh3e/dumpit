// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SettingsModal from './SettingsModal'

const notificationState = vi.hoisted(() => ({ permission: 'unsupported' }))
const localPrefs = vi.hoisted(() => ({
  theme: 'system',
  fontScale: 'base',
  contrast: 'system',
  boldText: false,
}))
const serverSettingsState = vi.hoisted(() => ({ current: null }))
const applyTheme = vi.fn()
const applyFontScale = vi.fn()
const applyContrast = vi.fn()
const applyBoldText = vi.fn()
const saveUserSettings = vi.fn()
const showBrowserNotification = vi.fn()
const settingsListeners = new Set()

vi.mock('../utils/notifications', () => ({
  getNotificationPermission: () => notificationState.permission,
  showBrowserNotification: (...args) => showBrowserNotification(...args),
}))
vi.mock('../utils/theme', () => ({
  applyTheme: (...args) => applyTheme(...args),
  getThemePref: () => {
    if (localPrefs.theme instanceof Error) throw localPrefs.theme
    return localPrefs.theme
  },
}))
vi.mock('../utils/fontScale', () => ({
  applyFontScale: (...args) => applyFontScale(...args),
  getFontScalePref: () => {
    if (localPrefs.fontScale instanceof Error) throw localPrefs.fontScale
    return localPrefs.fontScale
  },
  FONT_SCALES: {
    sm: { label: '작게', size: '90%' },
    base: { label: '기본', size: '100%' },
    lg: { label: '크게', size: '112.5%' },
    xl: { label: '아주 크게', size: '125%' },
  },
}))
vi.mock('../utils/a11y', () => ({
  applyContrast: (...args) => applyContrast(...args),
  getContrastPref: () => {
    if (localPrefs.contrast instanceof Error) throw localPrefs.contrast
    return localPrefs.contrast
  },
  applyBoldText: (...args) => applyBoldText(...args),
  getBoldTextPref: () => {
    if (localPrefs.boldText instanceof Error) throw localPrefs.boldText
    return localPrefs.boldText
  },
  CONTRAST_OPTIONS: [
    { value: 'system', label: '시스템' },
    { value: 'high', label: '고대비' },
    { value: 'normal', label: '기본' },
  ],
}))
vi.mock('../services/userSettings', () => ({
  getUserSettings: () => serverSettingsState.current,
  saveUserSettings: (...args) => saveUserSettings(...args),
  subscribeUserSettings: (listener) => {
    settingsListeners.add(listener)
    return () => settingsListeners.delete(listener)
  },
}))

const DEFAULT_SERVER_SETTINGS = {
  routineStartHour: 9,
  routineEndHour: 22,
  notificationsEnabled: true,
  notificationThresholds: [60],
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

function emitServerSettings(patch) {
  serverSettingsState.current = { ...serverSettingsState.current, ...patch }
  settingsListeners.forEach((listener) => listener(serverSettingsState.current))
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

describe('SettingsModal', () => {
  beforeEach(() => {
    notificationState.permission = 'unsupported'
    Object.assign(localPrefs, { theme: 'system', fontScale: 'base', contrast: 'system', boldText: false })
    serverSettingsState.current = { ...DEFAULT_SERVER_SETTINGS }
    delete window.dumpitDesktop
    delete window.Notification
    applyTheme.mockReset()
    applyFontScale.mockReset()
    applyContrast.mockReset()
    applyBoldText.mockReset()
    showBrowserNotification.mockReset().mockResolvedValue(true)
    settingsListeners.clear()
    saveUserSettings.mockReset().mockImplementation(async (patch) => {
      emitServerSettings(patch)
      return serverSettingsState.current
    })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('기기 설정은 저장 성공 뒤 이 기기 저장 상태를 알리고 닫아도 되돌리지 않는다', () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '라이트' }))

    expect(applyTheme).toHaveBeenCalledWith('light')
    expect(saveUserSettings).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('이 기기에 저장했어요.')
    fireEvent.click(screen.getByRole('button', { name: '설정 닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('기기 설정 저장 실패는 선택을 바꾸지 않고 해당 섹션 가까이에 알린다', () => {
    applyTheme.mockImplementationOnce(() => { throw new Error('storage full') })
    render(<SettingsModal onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '라이트' }))

    const section = screen.getByRole('heading', { name: '테마' }).closest('section')
    expect(within(section).getByRole('button', { name: '시스템', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(within(section).getByRole('alert'))
      .toHaveTextContent('이 기기에 저장하지 못했어요.')
  })

  it('기기 설정 초기 읽기 실패에도 안전한 기본값과 오류 안내를 표시한다', () => {
    Object.assign(localPrefs, {
      theme: new Error('read failed'),
      fontScale: new Error('read failed'),
      contrast: new Error('read failed'),
      boldText: new Error('read failed'),
    })

    render(<SettingsModal onClose={() => {}} />)

    const themeSection = screen.getByRole('heading', { name: '테마' }).closest('section')
    const fontSection = screen.getByRole('heading', { name: '글자 크기' }).closest('section')
    expect(within(themeSection).getByRole('button', { name: '시스템', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(within(fontSection).getByRole('button', { name: '기본', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('기기 설정을 불러오지 못했어요.')).toHaveAttribute('role', 'alert')
  })

  it('글자 크기만 읽지 못해도 테마 오류로 지목하지 않고 공통 기기 설정 안내를 표시한다', () => {
    localPrefs.fontScale = new Error('read failed')

    render(<SettingsModal onClose={() => {}} />)

    const alert = screen.getByRole('alert')
    const themeSection = screen.getByRole('heading', { name: '테마' }).closest('section')
    const fontSection = screen.getByRole('heading', { name: '글자 크기' }).closest('section')
    expect(alert).toHaveTextContent('기기 설정을 불러오지 못했어요.')
    expect(themeSection).not.toContainElement(alert)
    expect(fontSection).not.toContainElement(alert)
  })

  it('활동 시간은 저장 성공값을 새 기준으로 삼고 모달을 닫지 않는다', async () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('종료'), { target: { value: '21' } })
    expect(saveUserSettings).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '활동 시간 저장' }))

    expect(saveUserSettings).toHaveBeenCalledWith({ routineStartHour: 10, routineEndHour: 21 })
    await screen.findByText('활동 시간을 계정에 저장했어요.')
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '닫기', exact: true }))
    expect(onClose).toHaveBeenCalledOnce()

    cleanup()
    render(<SettingsModal onClose={() => {}} />)
    expect(screen.getByLabelText('시작')).toHaveValue('10')
    expect(screen.getByLabelText('종료')).toHaveValue('21')
  })

  it('활동 시간 취소는 마지막 성공값으로만 복원하고 저장 요청을 보내지 않는다', () => {
    render(<SettingsModal onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('종료'), { target: { value: '21' } })
    fireEvent.click(screen.getByRole('button', { name: '활동 시간 취소' }))

    expect(screen.getByLabelText('시작')).toHaveValue('9')
    expect(screen.getByLabelText('종료')).toHaveValue('22')
    expect(saveUserSettings).not.toHaveBeenCalled()
  })

  it('늦은 서버 설정은 pristine 초안을 갱신하지만 dirty 활동 시간 입력은 덮지 않는다', async () => {
    render(<SettingsModal onClose={() => {}} />)

    emitServerSettings({ routineStartHour: 7, routineEndHour: 20 })
    await waitFor(() => expect(screen.getByLabelText('시작')).toHaveValue('7'))
    expect(screen.getByLabelText('종료')).toHaveValue('20')

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '8' } })
    emitServerSettings({ routineStartHour: 6, routineEndHour: 19 })
    expect(screen.getByLabelText('시작')).toHaveValue('8')
    expect(screen.getByLabelText('종료')).toHaveValue('20')

    fireEvent.click(screen.getByRole('button', { name: '활동 시간 취소' }))
    expect(screen.getByLabelText('시작')).toHaveValue('6')
    expect(screen.getByLabelText('종료')).toHaveValue('19')
  })

  it('활동 시간 저장 실패는 초안을 유지하고 섹션 가까이에 알린다', async () => {
    const onClose = vi.fn()
    saveUserSettings.mockRejectedValueOnce({ userMessage: '설정 저장 실패' })
    render(<SettingsModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '활동 시간 저장' }))

    const section = screen.getByRole('heading', { name: '활동 시간' }).closest('section')
    const alert = await within(section).findByRole('alert')
    expect(alert).toHaveTextContent('설정 저장 실패')
    expect(screen.getByLabelText('시작')).toHaveValue('10')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('활동 시간 저장 중에는 중복 저장과 닫기 충돌을 막는다', async () => {
    const onClose = vi.fn()
    const saving = deferred()
    saveUserSettings.mockReturnValueOnce(saving.promise)
    render(<SettingsModal onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    const save = screen.getByRole('button', { name: '활동 시간 저장' })
    fireEvent.click(save)
    fireEvent.click(save)
    fireEvent.click(screen.getByRole('button', { name: '설정 닫기' }))

    expect(saveUserSettings).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(save).toBeDisabled()
    expect(screen.getByLabelText('시작')).toBeDisabled()
    expect(screen.getByLabelText('종료')).toBeDisabled()

    saving.resolve({ ...DEFAULT_SERVER_SETTINGS, routineStartHour: 10 })
    await waitFor(() => expect(save).toHaveTextContent('활동 시간 저장'))
    expect(save).toBeDisabled()
  })

  it('X·하단 닫기·Esc·배경 클릭은 같은 중첩 확인창으로 처리하고 안쪽 Esc는 부모를 닫지 않는다', () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } })
    const outerDialog = screen.getByRole('dialog', { name: '설정' })

    const expectDiscardDialogThenContinue = () => {
      expect(screen.getByRole('dialog', { name: '활동 시간 변경 버리기' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '계속 수정' }))
    }

    fireEvent.click(screen.getByRole('button', { name: '설정 닫기' }))
    const discardDialog = screen.getByRole('dialog', { name: '활동 시간 변경 버리기' })
    fireEvent(discardDialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '활동 시간 변경 버리기' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '닫기', exact: true }))
    expectDiscardDialogThenContinue()
    fireEvent(outerDialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expectDiscardDialogThenContinue()
    fireEvent.mouseDown(outerDialog)
    fireEvent.click(outerDialog)

    fireEvent.click(screen.getByRole('button', { name: '변경 버리고 닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('refined 표면과 44px 조작 영역을 사용하면서 닫기 동작을 유지한다', () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '설정' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByLabelText('시작')).toHaveClass('input-refined')
    expect(screen.getByRole('button', { name: '마감 임박 알림 토글' })).toHaveClass('!h-11', '!w-11')

    const close = screen.getByRole('button', { name: '설정 닫기' })
    expect(close).toHaveClass('btn-refined', 'btn-refined-text', '!h-11', '!w-11')
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('테마와 대비의 짧은 레이블은 큰 글자에서도 음절로 나뉘지 않는 배치 제약을 갖는다', () => {
    render(<SettingsModal onClose={() => {}} />)

    const themeSection = screen.getByRole('heading', { name: '테마' }).closest('section')
    const a11ySection = screen.getByRole('heading', { name: '보기 편하게' }).closest('section')
    const optionNames = ['라이트', '다크', '시스템', '고대비', '기본']
    for (const name of optionNames) {
      const scope = name === '라이트' || name === '다크' ? themeSection : name === '고대비' || name === '기본' ? a11ySection : null
      const buttons = scope
        ? [within(scope).getByRole('button', { name, exact: true })]
        : [
            within(themeSection).getByRole('button', { name, exact: true }),
            within(a11ySection).getByRole('button', { name, exact: true }),
          ]
      buttons.forEach((button) => expect(button).toHaveClass('min-w-0', 'whitespace-nowrap', '!px-1'))
    }
  })

  it('알림 요청 중에는 연속 클릭과 닫기를 막고 성공 뒤 계정 저장을 알린다', async () => {
    notificationState.permission = 'granted'
    const onClose = vi.fn()
    const saving = deferred()
    saveUserSettings.mockReturnValueOnce(saving.promise)
    render(<SettingsModal onClose={onClose} />)
    const toggle = screen.getByRole('button', { name: '마감 임박 알림 토글' })

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: '닫기', exact: true }))
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toBeDisabled()
    expect(saveUserSettings).toHaveBeenCalledWith({ notificationsEnabled: false })
    expect(saveUserSettings).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    saving.resolve({ ...DEFAULT_SERVER_SETTINGS, notificationsEnabled: false })
    await waitFor(() => expect(toggle).toBeEnabled())
    expect(screen.getByText('알림 설정을 계정에 저장했어요.')).toHaveAttribute('role', 'status')
  })

  it('알림 저장 실패 시 aria-pressed를 이전 켜짐 상태로 롤백한다', async () => {
    notificationState.permission = 'granted'
    saveUserSettings.mockRejectedValueOnce({ userMessage: '알림 저장 실패' })
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '마감 임박 알림 토글' })

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    const section = screen.getByRole('heading', { name: '알림' }).closest('section')
    expect(within(section).getByRole('alert')).toHaveTextContent('알림 저장 실패')
  })

  it.each([
    ['표시 불가', false],
    ['호출 거부', new Error('notification failed')],
  ])('테스트 알림 %s는 성공으로 표시하지 않고 섹션 가까이에 알린다', async (_label, outcome) => {
    notificationState.permission = 'granted'
    if (outcome instanceof Error) showBrowserNotification.mockRejectedValueOnce(outcome)
    else showBrowserNotification.mockResolvedValueOnce(outcome)
    render(<SettingsModal onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '테스트 알림 보내기' }))

    const section = screen.getByRole('heading', { name: '알림' }).closest('section')
    expect(await within(section).findByRole('alert')).toHaveTextContent('테스트 알림을 표시하지 못했어요.')
    expect(screen.queryByRole('button', { name: '테스트 알림을 보냈어요' })).not.toBeInTheDocument()
  })

  it('알림 권한 요청 거부는 unhandled rejection 없이 섹션 가까이에 알린다', async () => {
    notificationState.permission = 'default'
    window.Notification = { requestPermission: vi.fn().mockRejectedValue(new Error('permission failed')) }
    render(<SettingsModal onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: '마감 임박 알림 토글' }))

    const section = screen.getByRole('heading', { name: '알림' }).closest('section')
    expect(await within(section).findByRole('alert')).toHaveTextContent('알림 작업을 완료하지 못했어요.')
    expect(screen.getByRole('button', { name: '마감 임박 알림 토글' })).toBeEnabled()
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

    await waitFor(() => expect(toggle).toBeEnabled())
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(setLaunchAtLogin).toHaveBeenCalledWith(true)
  })

  it('시작프로그램 저장 중 연속 조작을 막고 승인 뒤 다시 허용한다', async () => {
    const saving = deferred()
    const setLaunchAtLogin = vi.fn().mockReturnValueOnce(saving.promise)
    window.dumpitDesktop = {
      getAppInfo: vi.fn().mockResolvedValue(null),
      getLaunchAtLogin: vi.fn().mockResolvedValue({ enabled: true }),
      setLaunchAtLogin,
    }
    render(<SettingsModal onClose={() => {}} />)
    const toggle = screen.getByRole('button', { name: '시작프로그램 등록 토글' })
    await waitFor(() => expect(toggle).toBeEnabled())

    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(setLaunchAtLogin).toHaveBeenCalledTimes(1)
    expect(toggle).toBeDisabled()

    saving.resolve()
    await waitFor(() => expect(toggle).toBeEnabled())
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

  it('업데이트 확인 실패를 섹션 가까이에 알리고 다시 확인할 수 있게 한다', async () => {
    window.dumpitDesktop = {
      getAppInfo: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      checkForUpdates: vi.fn().mockRejectedValue(new Error('update failed')),
    }
    render(<SettingsModal onClose={() => {}} />)
    const update = screen.getByRole('button', { name: '업데이트 확인' })

    fireEvent.click(update)

    expect(await screen.findByText('업데이트를 확인하지 못했어요.')).toHaveAttribute('role', 'alert')
    await waitFor(() => expect(update).toBeEnabled(), { timeout: 1500 })
  })
})
