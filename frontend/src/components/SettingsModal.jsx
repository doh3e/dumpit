import { useId, useState, useEffect, useRef } from 'react'
import { getNotificationPermission, showBrowserNotification } from '../utils/notifications'
import { applyTheme, getThemePref } from '../utils/theme'
import { applyFontScale, getFontScalePref, FONT_SCALES } from '../utils/fontScale'
import { applyContrast, getContrastPref, applyBoldText, getBoldTextPref, CONTRAST_OPTIONS } from '../utils/a11y'
import { getUserSettings, saveUserSettings, subscribeUserSettings } from '../services/userSettings'
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

function readLocalPreferences() {
  let failed = false
  const read = (reader, fallback) => {
    try {
      return reader()
    } catch {
      failed = true
      return fallback
    }
  }
  return {
    theme: read(getThemePref, 'system'),
    fontScale: read(getFontScalePref, 'base'),
    contrast: read(getContrastPref, 'system'),
    boldText: read(getBoldTextPref, false),
    failed,
  }
}


export default function SettingsModal({ onClose }) {
  const routineStartId = useId()
  const routineEndId = useId()
  const isDesktop = typeof window !== 'undefined' && Boolean(window.dumpitDesktop)
  const [appInfo, setAppInfo] = useState(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const checkingUpdateRef = useRef(false)
  const [serverSettings] = useState(getUserSettings)
  const [initialLocalPrefs] = useState(readLocalPreferences)
  const [routineStart, setRoutineStart] = useState(serverSettings.routineStartHour)
  const [routineEnd, setRoutineEnd] = useState(serverSettings.routineEndHour)
  const [routineBaseline, setRoutineBaseline] = useState({
    start: serverSettings.routineStartHour,
    end: serverSettings.routineEndHour,
  })
  const routineBaselineRef = useRef({ start: serverSettings.routineStartHour, end: serverSettings.routineEndHour })
  const routineDraftRef = useRef({ start: serverSettings.routineStartHour, end: serverSettings.routineEndHour })
  const [confirmWrap, setConfirmWrap] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [savingRoutine, setSavingRoutine] = useState(false)
  const savingRoutineRef = useRef(false)
  const [themePref, setThemePref] = useState(initialLocalPrefs.theme)
  const [fontScale, setFontScale] = useState(initialLocalPrefs.fontScale)
  const [contrastPref, setContrastPref] = useState(initialLocalPrefs.contrast)
  const [boldText, setBoldText] = useState(initialLocalPrefs.boldText)
  const [localFeedback, setLocalFeedback] = useState(initialLocalPrefs.failed
    ? { section: 'device', type: 'error', message: '기기 설정을 불러오지 못했어요.' }
    : null)
  const [permission, setPermission] = useState(getNotificationPermission)
  const [notificationsEnabled, setNotificationsEnabled] = useState(serverSettings.notificationsEnabled)
  const [selectedThresholds, setSelectedThresholds] = useState(serverSettings.notificationThresholds)
  const [testSent, setTestSent] = useState(false)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const notificationBusyRef = useRef(false)
  const [notificationFeedback, setNotificationFeedback] = useState(null)
  const [routineFeedback, setRoutineFeedback] = useState(null)
  const [desktopError, setDesktopError] = useState(null)
  const isIOS = isIOSDevice()
  const isStandalone = isStandaloneWebApp()
  const notificationNote = isIOS && !isStandalone
    ? '아이폰/아이패드에서는 홈 화면에 추가한 앱에서만 백그라운드 웹 푸시가 가능해요. 현재 알림은 Dumpit!을 열어둔 상태에서 동작해요.'
    : '현재 알림은 Dumpit! 탭이나 앱이 열려 있을 때 마감 정보를 확인해 띄워요.'

  const persistNotifications = async (patch, rollback) => {
    setNotificationFeedback(null)
    try {
      const saved = await saveUserSettings(patch)
      setNotificationsEnabled(saved.notificationsEnabled)
      setSelectedThresholds(saved.notificationThresholds)
      setNotificationFeedback({ type: 'success', message: '알림 설정을 계정에 저장했어요.' })
      return true
    } catch (error) {
      rollback()
      setNotificationFeedback({ type: 'error', message: error.userMessage || '알림 설정을 저장하지 못했어요.' })
      return false
    }
  }

  const runNotificationAction = async (action) => {
    if (notificationBusyRef.current) return
    notificationBusyRef.current = true
    setNotificationBusy(true)
    try {
      await action()
    } catch {
      setNotificationFeedback({ type: 'error', message: '알림 작업을 완료하지 못했어요.' })
    } finally {
      notificationBusyRef.current = false
      setNotificationBusy(false)
    }
  }

  const handleNotificationToggle = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    await runNotificationAction(async () => {
      if (permission === 'default') {
        const result = await window.Notification.requestPermission()
        setPermission(result)
        if (result === 'granted') {
          setNotificationsEnabled(true)
          await persistNotifications({ notificationsEnabled: true }, () => setNotificationsEnabled(false))
        }
        return
      }

      const previous = notificationsEnabled
      const next = !previous
      setNotificationsEnabled(next)
      await persistNotifications({ notificationsEnabled: next }, () => setNotificationsEnabled(previous))
    })
  }

  const toggleThreshold = async (min) => {
    const prev = selectedThresholds
    const next = prev.includes(min) ? prev.filter((t) => t !== min) : [...prev, min]
    await runNotificationAction(async () => {
      setSelectedThresholds(next)
      await persistNotifications({ notificationThresholds: next }, () => setSelectedThresholds(prev))
    })
  }

  const sendTestNotification = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    await runNotificationAction(async () => {
      let currentPermission = permission
      if (currentPermission === 'default') {
        currentPermission = await window.Notification.requestPermission()
        setPermission(currentPermission)
      }
      if (currentPermission !== 'granted') return

      if (!notificationsEnabled) {
        setNotificationsEnabled(true)
        const saved = await persistNotifications({ notificationsEnabled: true }, () => setNotificationsEnabled(false))
        if (!saved) return
      }
      try {
        const displayed = await showBrowserNotification('Dumpit! 테스트 알림', {
          body: '알림 설정이 정상이에요.',
          icon: '/favicon-48x48.png',
          tag: 'dumpit-test-notification',
        }, '/dashboard')
        if (!displayed) {
          setNotificationFeedback({ type: 'error', message: '테스트 알림을 표시하지 못했어요.' })
          return
        }
        setTestSent(true)
        setNotificationFeedback({ type: 'success', message: '테스트 알림을 표시했어요.' })
        window.setTimeout(() => setTestSent(false), 2500)
      } catch {
        setNotificationFeedback({ type: 'error', message: '테스트 알림을 표시하지 못했어요.' })
      }
    })
  }

  const applyLocalPreference = (section, apply, next, commit) => {
    try {
      apply(next)
      commit(next)
      setLocalFeedback({ section, type: 'success', message: '이 기기에 저장했어요.' })
    } catch {
      setLocalFeedback({ section, type: 'error', message: '이 기기에 저장하지 못했어요.' })
    }
  }

  useEffect(() => subscribeUserSettings((nextSettings) => {
    const previousBaseline = routineBaselineRef.current
    const draft = routineDraftRef.current
    const wasDirty = draft.start !== previousBaseline.start || draft.end !== previousBaseline.end
    const nextBaseline = {
      start: nextSettings.routineStartHour,
      end: nextSettings.routineEndHour,
    }
    routineBaselineRef.current = nextBaseline
    setRoutineBaseline(nextBaseline)
    if (!wasDirty) {
      routineDraftRef.current = nextBaseline
      setRoutineStart(nextBaseline.start)
      setRoutineEnd(nextBaseline.end)
    }
    if (!notificationBusyRef.current) {
      setNotificationsEnabled(nextSettings.notificationsEnabled)
      setSelectedThresholds(nextSettings.notificationThresholds)
    }
  }), [])

  useEffect(() => {
    if (!isDesktop) return
    window.dumpitDesktop.getAppInfo?.()
      .then((info) => setAppInfo(info))
      .catch(() => setAppInfo(null))
  }, [isDesktop])

  // 시작프로그램 등록 상태 — 브리지가 없는 구 데스크톱 빌드에서는 토글 자체를 숨긴다
  const hasLaunchAtLoginBridge = isDesktop && Boolean(window.dumpitDesktop.getLaunchAtLogin)
  const [launchAtLogin, setLaunchAtLogin] = useState(null)
  const [launchAtLoginBusy, setLaunchAtLoginBusy] = useState(false)
  const launchAtLoginBusyRef = useRef(false)
  useEffect(() => {
    if (!hasLaunchAtLoginBridge) return
    window.dumpitDesktop.getLaunchAtLogin()
      .then((res) => setLaunchAtLogin(Boolean(res?.enabled)))
      .catch(() => setLaunchAtLogin(null))
  }, [hasLaunchAtLoginBridge])

  const toggleLaunchAtLogin = async () => {
    if (launchAtLogin === null || launchAtLoginBusyRef.current) return
    launchAtLoginBusyRef.current = true
    setLaunchAtLoginBusy(true)
    const next = !launchAtLogin
    setLaunchAtLogin(next)
    setDesktopError(null)
    try {
      await window.dumpitDesktop.setLaunchAtLogin(next)
    } catch {
      setLaunchAtLogin(!next)
      setDesktopError('시작프로그램 설정을 바꾸지 못했어요.')
    } finally {
      launchAtLoginBusyRef.current = false
      setLaunchAtLoginBusy(false)
    }
  }

  const checkForUpdates = async () => {
    if (!window.dumpitDesktop?.checkForUpdates || checkingUpdateRef.current) return
    checkingUpdateRef.current = true
    setCheckingUpdate(true)
    setDesktopError(null)
    try {
      const info = await window.dumpitDesktop.checkForUpdates()
      if (info) setAppInfo(info)
    } catch {
      setDesktopError('업데이트를 확인하지 못했어요.')
    } finally {
      window.setTimeout(() => {
        checkingUpdateRef.current = false
        setCheckingUpdate(false)
      }, 800)
    }
  }

  const isWrap = routineStart > routineEnd
  const routineDirty = routineStart !== routineBaseline.start || routineEnd !== routineBaseline.end

  const requestClose = () => {
    if (savingRoutineRef.current || notificationBusyRef.current) return
    if (routineDirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const cancelRoutine = () => {
    if (savingRoutineRef.current) return
    routineDraftRef.current = routineBaselineRef.current
    setRoutineStart(routineBaselineRef.current.start)
    setRoutineEnd(routineBaselineRef.current.end)
    setConfirmWrap(false)
    setRoutineFeedback(null)
  }

  const saveRoutine = async () => {
    if (savingRoutineRef.current || !routineDirty || routineStart === routineEnd) return
    if (isWrap && !confirmWrap) {
      setConfirmWrap(true)
      return
    }
    savingRoutineRef.current = true
    setSavingRoutine(true)
    setRoutineFeedback(null)
    try {
      const saved = await saveUserSettings({ routineStartHour: routineStart, routineEndHour: routineEnd })
      const next = {
        start: saved.routineStartHour,
        end: saved.routineEndHour,
      }
      routineBaselineRef.current = next
      routineDraftRef.current = next
      setRoutineBaseline(next)
      setRoutineStart(next.start)
      setRoutineEnd(next.end)
      setConfirmWrap(false)
      setRoutineFeedback({ type: 'success', message: '활동 시간을 계정에 저장했어요.' })
    } catch (error) {
      setRoutineFeedback({ type: 'error', message: error.userMessage || '활동 시간 저장에 실패했어요.' })
    } finally {
      savingRoutineRef.current = false
      setSavingRoutine(false)
    }
  }

  return (
    <Dialog onClose={requestClose} title="설정" variant="refined" className="w-full max-w-md p-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-refined-heading text-xl">설정</h2>
        <button
          onClick={requestClose}
          disabled={savingRoutine || notificationBusy}
          aria-label="설정 닫기"
          className="btn-refined btn-refined-text !h-11 !w-11 !p-0 text-sm text-dark"
        >
          X
        </button>
      </div>

      {localFeedback?.section === 'device' && (
        <p role="alert" className="mb-4 text-xs font-bold text-danger">
          {localFeedback.message}
        </p>
      )}

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">테마</h3>
        <p className="mb-3 text-xs font-medium text-sub">선택하면 바로 적용되고 이 기기에 저장돼요.</p>
        <div className="flex gap-1">
          {[
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
            { value: 'system', label: '시스템' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={themePref === value}
              onClick={() => applyLocalPreference('theme', applyTheme, value, setThemePref)}
              className={`btn-refined min-w-0 flex-1 whitespace-nowrap !px-1 text-xs ${themePref === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {localFeedback?.section === 'theme' && (
          <p role={localFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs font-bold ${localFeedback.type === 'error' ? 'text-danger' : 'text-sub'}`}>
            {localFeedback.message}
          </p>
        )}
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
              onClick={() => applyLocalPreference('font', applyFontScale, value, setFontScale)}
              className={`btn-refined text-xs ${fontScale === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {localFeedback?.section === 'font' && (
          <p role={localFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs font-bold ${localFeedback.type === 'error' ? 'text-danger' : 'text-sub'}`}>
            {localFeedback.message}
          </p>
        )}
      </section>

      <hr className="border-line mb-6" />

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">보기 편하게</h3>
        <p className="text-xs text-sub font-medium mb-2">대비</p>
        <div className="mb-4 flex gap-1">
          {CONTRAST_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={contrastPref === value}
              onClick={() => applyLocalPreference('a11y', applyContrast, value, setContrastPref)}
              className={`btn-refined min-w-0 flex-1 whitespace-nowrap !px-1 text-xs ${contrastPref === value ? 'btn-refined-selected' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={boldText}
          onClick={() => applyLocalPreference('a11y', applyBoldText, !boldText, setBoldText)}
          className={`btn-refined w-full text-xs ${boldText ? 'btn-refined-selected' : ''}`}
        >
          굵은 글자 {boldText ? '켬' : '끔'}
        </button>
        <p className="mt-2 text-xs text-sub font-medium">
          '시스템'은 기기의 고대비 설정을 따라요. 이 설정은 이 기기에만 저장돼요.
        </p>
        {localFeedback?.section === 'a11y' && (
          <p role={localFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs font-bold ${localFeedback.type === 'error' ? 'text-danger' : 'text-sub'}`}>
            {localFeedback.message}
          </p>
        )}
      </section>

      <hr className="border-line mb-6" />

      {/* 일과 시간: 서버 저장(user_settings) — AI 시간 배정·nowSuggestion 추천이 이 창을 기준으로 동작 */}
      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">활동 시간</h3>
        <p className="text-xs text-sub font-medium mb-3">
          AI 시간 배정과 '지금 뭐할까' 추천이 이 시간대를 기준으로 동작해요
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor={routineStartId} className="text-xs font-bold text-sub">시작</label>
            <select
              id={routineStartId}
              value={routineStart}
              disabled={savingRoutine}
              onChange={(e) => {
                const start = Number(e.target.value)
                routineDraftRef.current = { ...routineDraftRef.current, start }
                setRoutineStart(start)
                setConfirmWrap(false)
              }}
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
              disabled={savingRoutine}
              onChange={(e) => {
                const end = Number(e.target.value)
                routineDraftRef.current = { ...routineDraftRef.current, end }
                setRoutineEnd(end)
                setConfirmWrap(false)
              }}
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
        {routineFeedback && (
          <p role={routineFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs font-bold ${routineFeedback.type === 'error' ? 'text-danger' : 'text-sub'}`}>
            {routineFeedback.message}
          </p>
        )}
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={cancelRoutine}
            disabled={!routineDirty || savingRoutine}
            className="btn-refined flex-1 text-sm"
          >
            활동 시간 취소
          </button>
          <button
            type="button"
            onClick={saveRoutine}
            disabled={!routineDirty || routineStart === routineEnd || savingRoutine}
            className="btn-refined btn-refined-primary flex-1 text-sm"
          >
            {savingRoutine ? '저장 중...' : '활동 시간 저장'}
          </button>
        </div>
      </section>

      <hr className="border-line mb-6" />

      <section className="mb-6">
        <h3 className="font-galmuri font-bold text-dark text-sm mb-3">알림</h3>
        <p className="mb-3 text-xs font-medium text-sub">바꾸면 바로 계정에 저장되고 로그인한 기기에 적용돼요.</p>
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
            disabled={permission === 'unsupported' || permission === 'denied' || notificationBusy}
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
            disabled={permission === 'unsupported' || permission === 'denied' || notificationBusy}
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
                    disabled={notificationBusy}
                    onChange={() => toggleThreshold(min)}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-xs font-semibold text-sub">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {notificationFeedback && (
          <p role={notificationFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs font-bold ${notificationFeedback.type === 'error' ? 'text-danger' : 'text-sub'}`}>
            {notificationFeedback.message}
          </p>
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
                  disabled={launchAtLogin === null || launchAtLoginBusy}
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
            {desktopError && <p role="alert" className="mb-3 text-xs font-bold text-danger">{desktopError}</p>}
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

      <button
        type="button"
        onClick={requestClose}
        disabled={savingRoutine || notificationBusy}
        className="btn-refined w-full text-sm"
      >
        닫기
      </button>

      {confirmDiscard && (
        <Dialog
          onClose={() => setConfirmDiscard(false)}
          title="활동 시간 변경 버리기"
          variant="refined"
          className="w-full max-w-sm p-5"
        >
          <h2 className="page-refined-heading text-lg">변경을 버리고 닫을까요?</h2>
          <p className="mt-3 text-sm font-semibold text-sub">
            저장하지 않은 활동 시간 변경은 사라져요.
          </p>
          <div className="mt-5 flex gap-3">
            <button type="button" className="btn-refined flex-1 text-sm" onClick={() => setConfirmDiscard(false)}>
              계속 수정
            </button>
            <button type="button" className="btn-refined btn-refined-primary flex-1 text-sm" onClick={onClose}>
              변경 버리고 닫기
            </button>
          </div>
        </Dialog>
      )}
    </Dialog>
  )
}
