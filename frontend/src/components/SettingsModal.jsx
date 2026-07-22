import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getNotificationPermission, showBrowserNotification } from '../utils/notifications'
import { applyTheme, getThemePref } from '../utils/theme'
import { applyFontScale, getFontScalePref, FONT_SCALES } from '../utils/fontScale'
import { getUserSettings, saveUserSettings } from '../services/userSettings'
import { notifyToast } from '../context/ToastContext'

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
  const [permission, setPermission] = useState(getNotificationPermission)
  const [notificationsEnabled, setNotificationsEnabled] = useState(serverSettings.notificationsEnabled)
  const [selectedThresholds, setSelectedThresholds] = useState(serverSettings.notificationThresholds)
  const [testSent, setTestSent] = useState(false)
  const isIOS = isIOSDevice()
  const isStandalone = isStandaloneWebApp()
  const notificationNote = isIOS && !isStandalone
    ? '아이폰/아이패드에서는 홈 화면에 추가한 앱에서만 백그라운드 웹 푸시가 가능해요. 현재 알림은 Dumpit!을 열어둔 상태에서 동작해요.'
    : '현재 알림은 Dumpit! 탭이나 앱이 열려 있을 때 마감 정보를 확인해 띄워요.'

  // 알림 설정은 즉시 서버 저장 — 실패 시 이전 값으로 되돌린다
  const persistNotifications = (patch, rollback) => {
    saveUserSettings(patch).catch((error) => {
      rollback()
      notifyToast(error.userMessage || '설정 저장에 실패했어요.')
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
    try {
      await window.dumpitDesktop.setLaunchAtLogin(next)
    } catch {
      setLaunchAtLogin(!next)
      notifyToast('시작프로그램 설정을 바꾸지 못했어요.')
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
    try {
      await saveUserSettings({ routineStartHour: routineStart, routineEndHour: routineEnd })
      onClose()
    } catch (error) {
      notifyToast(error.userMessage || '일과 시간 저장에 실패했어요.')
    } finally {
      setSavingRoutine(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center overlay-retro" onClick={onClose}>
      <div
        className="card-retro w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-dungeon text-dark text-xl">설정</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-line font-black text-sub hover:bg-chip hover:text-dark transition-colors"
          >
            X
          </button>
        </div>

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
                onClick={() => { applyTheme(value); setThemePref(value) }}
                className={`flex-1 text-xs ${themePref === value ? 'btn-retro-primary' : 'btn-retro'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <hr className="border-line mb-6" />

        <section className="mb-6">
          <h3 className="font-galmuri font-bold text-dark text-sm mb-3">글자 크기</h3>
          {/* 클릭 즉시 적용·영속 — 테마 버튼과 동일하게 저장 버튼과 무관 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(FONT_SCALES).map(([value, { label }]) => (
              <button
                key={value}
                type="button"
                onClick={() => { applyFontScale(value); setFontScale(value) }}
                className={`text-xs ${fontScale === value ? 'btn-retro-primary' : 'btn-retro'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <hr className="border-line mb-6" />

        {/* 일과 시간: 서버 저장(user_settings) — AI 시간 배정·nowSuggestion 추천이 이 창을 기준으로 동작 */}
        <section className="mb-6">
          <h3 className="font-galmuri font-bold text-dark text-sm mb-3">일과 시간</h3>
          <p className="text-xs text-sub font-medium mb-3">
            AI 시간 배정과 '지금 뭐할까' 추천이 이 시간대를 기준으로 동작해요
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-sub">시작</label>
              <select
                value={routineStart}
                onChange={(e) => { setRoutineStart(Number(e.target.value)); setConfirmWrap(false) }}
                className="text-sm font-bold border border-line rounded-lg px-2 py-1.5 bg-card"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
            <span className="font-bold text-sub">~</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-sub">종료</label>
              <select
                value={routineEnd}
                onChange={(e) => { setRoutineEnd(Number(e.target.value)); setConfirmWrap(false) }}
                className="text-sm font-bold border border-line rounded-lg px-2 py-1.5 bg-card"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
          </div>
          {routineStart === routineEnd && (
            <p className="mt-2 text-xs font-bold text-warn">시작과 종료 시각은 서로 달라야 해요.</p>
          )}
          {confirmWrap && (
            <div className="mt-3 rounded-lg border-2 border-warn bg-chip p-3">
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
          <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-line bg-card px-4 py-3">
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
              className={`relative w-11 h-6 rounded-full border-2 transition-colors flex-shrink-0 ${
                permission === 'granted' && notificationsEnabled
                  ? 'bg-primary border-primary'
                  : 'bg-chip border-line'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="마감 임박 알림 토글"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card border border-line transition-all ${
                permission === 'granted' && notificationsEnabled ? 'left-[18px]' : 'left-0.5'
              }`} />
            </button>
          </div>

          <div className="mt-3 rounded-lg border-2 border-line bg-card px-4 py-3">
            <p className="text-[0.6875rem] font-medium text-sub leading-relaxed">
              {notificationNote}
            </p>
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={permission === 'unsupported' || permission === 'denied'}
              className="mt-3 w-full rounded-lg border border-line btn-retro w-auto px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testSent ? '테스트 알림을 보냈어요' : '테스트 알림 보내기'}
            </button>
          </div>

          {permission !== 'unsupported' && (
            <div className="mt-3 rounded-lg border-2 border-line bg-card px-4 py-3">
              <p className="text-xs font-bold text-dark mb-2">알림 시점</p>
              <p className="text-[0.6875rem] font-medium text-sub mb-3">
                처음 감지 시는 항상 알려드려요. 추가로 받을 시점을 선택하세요.
              </p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {THRESHOLDS.map(({ min, label }) => (
                  <label key={min} className="flex items-center gap-2 cursor-pointer select-none">
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
                <div className="mb-3 flex items-center justify-between gap-4 rounded-lg border-2 border-line bg-card px-4 py-3">
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
                    className={`relative w-11 h-6 rounded-full border-2 transition-colors flex-shrink-0 ${
                      launchAtLogin ? 'bg-primary border-primary' : 'bg-chip border-line'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-label="시작프로그램 등록 토글"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card border border-line transition-all ${
                      launchAtLogin ? 'left-[18px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              )}
              <div className="rounded-lg border-2 border-line bg-card px-4 py-3">
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
                    className="rounded-lg border border-line btn-retro w-auto px-3 py-2 text-xs disabled:opacity-50"
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
            className="btn-retro flex-1 text-sm"
          >
            취소
          </button>
          <button
            onClick={saveRoutine}
            disabled={routineStart === routineEnd || savingRoutine}
            className="btn-retro-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
    </div>, document.body)
}
