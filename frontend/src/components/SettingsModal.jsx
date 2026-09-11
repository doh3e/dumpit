import { useId, useState, useEffect } from 'react'
import { getNotificationPermission, showBrowserNotification } from '../utils/notifications'
import { applyTheme, getThemePref } from '../utils/theme'
import { applyFontScale, getFontScalePref, FONT_SCALES } from '../utils/fontScale'
import { applyContrast, getContrastPref, applyBoldText, getBoldTextPref, CONTRAST_OPTIONS } from '../utils/a11y'
import { getUserSettings, saveUserSettings } from '../services/userSettings'
import Dialog from './Dialog'

const THRESHOLDS = [
  { min: 720, label: '12시간 전' },
  { min: 360, label: '6시간 전' },
  { min: 180, label: '3시간 전' },
  { min: 60,  label: '1시간 전' },
  { min: 30,  label: '30분 전' },
  { min: 10,  label: '10분 전' },
]

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}


export default function SettingsModal({ onClose }) {
  const routineStartId = useId()
  const routineEndId = useId()
  const isDesktop = typeof window !== 'undefined' && Boolean(window.dumpitDesktop)
  const [appInfo, setAppInfo] = useState(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const serverSettings = getUserSettings()
  const [routineStart, setRoutineStart] = useState(serverSettings.routineStartHour)
  const [routineEnd, setRoutineEnd] = useState(serverSettings.routineEndHour)
  const [confirmWrap, setConfirmWrap] = useState(false)
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [themePref, setThemePref] = useState(getThemePref)
  const [fontScale, setFontScale] = useState(getFontScalePref)
  const [contrastPref, setContrastPref] = useState(getContrastPref)
  const [boldText, setBoldText] = useState(getBoldTextPref)
  const [permission, setPermission] = useState(getNotificationPermission)
  const [notificationsEnabled, setNotificationsEnabled] = useState(serverSettings.notificationsEnabled)
  const [selectedThresholds, setSelectedThresholds] = useState(serverSettings.notificationThresholds)
  const [testSent, setTestSent] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const isIOS = isIOSDevice()
  const isStandalone = isStandaloneWebApp()
  const notificationNote = isIOS && !isStandalone
    ? '아이폰/아이패드에서는 홈 화면에 추가한 앱에서만 백그라운드 웹 푸시가 가능해요. 현재 알림은 Dumpit!을 열어둔 상태에서 동작해요.'
    : '현재 알림은 Dumpit! 탭이나 앱이 열려 있을 때 마감 정보를 확인해 띄워요.'

  const persistNotifications = (patch, rollback) => {
    setSaveError(null)
    saveUserSettings(patch).catch((error) => {
      rollback()
      setSaveError(error.userMessage || '설정 저장에 실패했어요.')
    })
  }

  const handleNotificationToggle = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    if (permission === 'default') {
      const result = await window.Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setNotificationsEnabled(true)
        persistNotifications({ notificationsEnabled: true }, () => setNotificationsEnabled(false))
      }
      return
    }

    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    persistNotifications({ notificationsEnabled: next }, () => setNotificationsEnabled(!next))
  }

  const toggleThreshold = (min) => {
    const prev = selectedThresholds
    const next = prev.includes(min) ? prev.filter((t) => t !== min) : [...prev, min]
    setSelectedThresholds(next)
    persistNotifications({ notificationThresholds: next }, () => setSelectedThresholds(prev))
  }

  const sendTestNotification = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    let currentPermission = permission
    if (currentPermission === 'default') {
      currentPermission = await window.Notification.requestPermission()
      setPermission(currentPermission)
    }
    if (currentPermission !== 'granted') return

    if (!notificationsEnabled) {
      setNotificationsEnabled(true)
      persistNotifications({ notificationsEnabled: true }, () => setNotificationsEnabled(false))
    }
    void showBrowserNotification('Dumpit! 테스트 알림', {
      body: '알림 설정이 정상이에요.',
      icon: '/favicon-48x48.png',
      tag: 'dumpit-test-notification',
    }, '/dashboard')
    setTestSent(true)
    window.setTimeout(() => setTestSent(false), 2500)
  }

  useEffect(() => {
    if (!isDesktop) return
    window.dumpitDesktop.getAppInfo?.()
      .then((info) => setAppInfo(info))
      .catch(() => setAppInfo(null))
  }, [isDesktop])

  // 시작프로그램 등록 상태 — 브리지가 없는 구 데스크톱 빌드에서는 토글 자체를 숨긴다
  const hasLaunchAtLoginBridge = isDesktop && Boolean(window.dumpitDesktop.getLaunchAtLogin)
  const [launchAtLogin, setLaunchAtLogin] = useState(null)
  useEffect(() => {
    if (!hasLaunchAtLoginBridge) return
    window.dumpitDesktop.getLaunchAtLogin()
      .then((res) => setLaunchAtLogin(Boolean(res?.enabled)))
      .catch(() => setLaunchAtLogin(null))
  }, [hasLaunchAtLoginBridge])

  const toggleLaunchAtLogin = async () => {
    if (launchAtLogin === null) return
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    setSaveError(null)
    try {
      await window.dumpitDesktop.setLaunchAtLogin(next)
    } catch {
      setLaunchAtLogin(!next)
      setSaveError('시작프로그램 설정을 바꾸지 못했어요.')
    }
  }

  const checkForUpdates = async () => {
    if (!window.dumpitDesktop?.checkForUpdates) return
    setCheckingUpdate(true)
    try {
      const info = await window.dumpitDesktop.checkForUpdates()
      if (info) setAppInfo(info)
    } finally {
      window.setTimeout(() => setCheckingUpdate(false), 800)
    }
  }

  const isWrap = routineStart > routineEnd
  const saveRoutine = async () => {
    if (routineStart === routineEnd) return
    if (isWrap && !confirmWrap) {
      setConfirmWrap(true)
      return
    }
    setSavingRoutine(true)
    setSaveError(null)
    try {
      await saveUserSettings({ routineStartHour: routineStart, routineEndHour: routineEnd })
      onClose()
    } catch (error) {
      setSaveError(error.userMessage || '일과 시간 저장에 실패했어요.')
    } finally {
      setSavingRoutine(false)
    }
  }

  return (
    <Dialog onClose={onClose} title="설정" variant="refined" className="w-full max-w-md p-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-refined-heading text-xl">설정</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="btn-refined btn-refined-text !h-11 !w-11 !p-0 text-sm text-dark"
        >
          X
        </button>
      </div>

      {saveError && (
        <p role="alert" className="surface-refined tone-danger mb-4 border p-3 text-xs font-bold text-danger">{saveError}</p>
      )}

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">테마</h3>
        <div className="flex gap-2">
          {[
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
            { value: 'system', label: '시스템' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={themePref === value}
              onClick={() => { applyTheme(value); setThemePref(value) }}
              className={`btn-refined flex-1 text-xs ${themePref === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-line mb-6" />

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">글자 크기</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(FONT_SCALES).map(([value, { label }]) => (
            <button
              key={value}
              type="button"
              aria-pressed={fontScale === value}
              onClick={() => { applyFontScale(value); setFontScale(value) }}
              className={`btn-refined text-xs ${fontScale === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-line mb-6" />

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">보기 편하게</h3>
        <p className="text-xs text-sub font-medium mb-2">대비</p>
        <div className="flex gap-2 mb-4">
          {CONTRAST_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={contrastPref === value}
              onClick={() => { applyContrast(value); setContrastPref(value) }}
              className={`btn-refined flex-1 text-xs ${contrastPref === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={boldText}
          onClick={() => { applyBoldText(!boldText); setBoldText(!boldText) }}
          className={`btn-refined w-full text-xs ${boldText ? 'btn-refined-selected' : ''}`}
        >
          굵은 글자 {boldText ? '켬' : '끔'}
        </button>
        <p className="mt-2 text-xs text-sub font-medium">
          '시스템'은 기기의 고대비 설정을 따라요. 이 설정은 이 기기에만 저장돼요.
        </p>
      </section>

      <hr className="border-line mb-6" />

      {/* 일과 시간: 서버 저장(user_settings) — AI 시간 배정·nowSuggestion 추천이 이 창을 기준으로 동작 */}
      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">일과 시간</h3>
        <p className="text-xs text-sub font-medium mb-3">
          AI 시간 배정과 '지금 뭐할까' 추천이 이 시간대를 기준으로 동작해요
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor={routineStartId} className="text-xs font-bold text-sub">시작</label>
            <select
              id={routineStartId}
              value={routineStart}
              onChange={(e) => { setRoutineStart(Number(e.target.value)); setConfirmWrap(false) }}
              className="input-refined min-w-0 flex-1 !px-2 !py-2 text-sm font-bold"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h}시</option>
              ))}
            </select>
          </div>
          <span className="hidden font-bold text-sub sm:inline">~</span>
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor={routineEndId} className="text-xs font-bold text-sub">종료</label>
            <select
              id={routineEndId}
              value={routineEnd}
              onChange={(e) => { setRoutineEnd(Number(e.target.value)); setConfirmWrap(false) }}
              className="input-refined min-w-0 flex-1 !px-2 !py-2 text-sm font-bold"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h}시</option>
              ))}
            </select>
          </div>
        </div>
        {routineStart === routineEnd && (
          <p role="alert" className="mt-2 text-xs font-bold text-warn">시작과 종료 시각은 서로 달라야 해요.</p>
        )}
        {confirmWrap && (
          <div className="surface-refined tone-urgent-soon mt-3 border p-3">
            <p className="text-xs font-bold text-dark">
              {routineStart}시부터 다음날 새벽 {routineEnd}시까지로 설정돼요.
            </p>
            <p className="mt-1 text-xs font-semibold text-sub">
              AI 시간 배정과 추천이 이 기준으로 동작해요. 저장을 한 번 더 누르면 확정돼요.
            </p>
          </div>
        )}
      </section>

      <hr className="border-line mb-6" />

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">알림</h3>
        <div className="surface-refined flex items-center justify-between gap-4 border border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-dark">마감 임박 알림</p>
            <p className="mt-0.5 text-xs font-medium text-sub">
              {permission === 'unsupported' && '이 브라우저에서는 지원하지 않아요.'}
              {permission === 'denied' && '브라우저 설정에서 알림 차단을 해제해야 해요.'}
              {permission === 'default' && '허용하면 마감 24시간 전에 팝업으로 알려드려요.'}
              {permission === 'granted' && (notificationsEnabled ? '켜져 있어요.' : '꺼져 있어요.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNotificationToggle}
            disabled={permission === 'unsupported' || permission === 'denied'}
            aria-pressed={permission === 'granted' && notificationsEnabled}
            className="btn-refined btn-refined-text group !h-11 !w-11 flex-shrink-0 !p-0"
            aria-label="마감 임박 알림 토글"
          >
            <span className={`relative h-6 w-11 rounded-full border-2 transition-colors ${
              permission === 'granted' && notificationsEnabled
                ? 'border-primary bg-primary'
                : 'border-line bg-chip'
            }`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full border border-line bg-card transition-all ${
                permission === 'granted' && notificationsEnabled ? 'left-[18px]' : 'left-0.5'
              }`} />
            </span>
          </button>
        </div>

        <div className="surface-refined mt-3 border border-line px-4 py-3">
          <p className="text-[0.6875rem] font-medium text-sub leading-relaxed">
            {notificationNote}
          </p>
          <button
            type="button"
            onClick={sendTestNotification}
            disabled={permission === 'unsupported' || permission === 'denied'}
            className="btn-refined mt-3 w-full px-3 text-xs"
          >
            {testSent ? '테스트 알림을 보냈어요' : '테스트 알림 보내기'}
          </button>
        </div>

        {permission !== 'unsupported' && (
          <div className="surface-refined mt-3 border border-line px-4 py-3">
            <p className="text-xs font-bold text-dark mb-2">알림 시점</p>
            <p className="text-[0.6875rem] font-medium text-sub mb-3">
              처음 감지 시는 항상 알려드려요. 추가로 받을 시점을 선택하세요.
            </p>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
              {THRESHOLDS.map(({ min, label }) => (
                <label key={min} className="flex min-h-[max(44px,2.75rem)] cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedThresholds.includes(min)}
                    onChange={() => toggleThreshold(min)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-xs font-semibold text-sub">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {isDesktop && (
        <>
          <hr className="border-line mb-6" />

          <section className="mb-6">
            <h3 className="font-galmuri font-bold text-dark text-sm mb-3">데스크톱</h3>
            {hasLaunchAtLoginBridge && (
              <div className="surface-refined mb-3 flex items-center justify-between gap-4 border border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-dark">시작프로그램 등록</p>
                  <p className="mt-0.5 text-xs font-medium text-sub">
                    {launchAtLogin === null && '상태를 확인하지 못했어요.'}
                    {launchAtLogin === true && '컴퓨터를 켜면 트레이에서 조용히 시작해요.'}
                    {launchAtLogin === false && '꺼져 있어요. 켜면 부팅 시 자동으로 시작해요.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleLaunchAtLogin}
                  disabled={launchAtLogin === null}
                  aria-pressed={launchAtLogin === true}
                  className="btn-refined btn-refined-text group !h-11 !w-11 flex-shrink-0 !p-0"
                  aria-label="시작프로그램 등록 토글"
                >
                  <span className={`relative h-6 w-11 rounded-full border-2 transition-colors ${
                    launchAtLogin ? 'border-primary bg-primary' : 'border-line bg-chip'
                  }`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full border border-line bg-card transition-all ${
                      launchAtLogin ? 'left-[18px]' : 'left-0.5'
                    }`} />
                  </span>
                </button>
              </div>
            )}
            <div className="surface-refined border border-line px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-dark">덤핏 데스크탑</p>
                  <p className="mt-0.5 text-xs font-semibold text-sub">
                    v{appInfo?.version || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className="btn-refined px-3 text-xs"
                >
                  {checkingUpdate ? '확인 중...' : '업데이트 확인'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="btn-refined flex-1 text-sm"
        >
          취소
        </button>
        <button
          onClick={saveRoutine}
          disabled={routineStart === routineEnd || savingRoutine}
          className="btn-refined btn-refined-primary flex-1 text-sm"
        >
          저장
        </button>
      </div>
    </Dialog>
  )
}
