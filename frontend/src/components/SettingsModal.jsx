import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { getNotificationPermission, showBrowserNotification } from '../utils/notifications'

const DEFAULT_START = 9
const DEFAULT_END = 22

const THRESHOLDS = [
  { min: 720, label: '12시간 전' },
  { min: 360, label: '6시간 전' },
  { min: 180, label: '3시간 전' },
  { min: 60,  label: '1시간 전' },
  { min: 30,  label: '30분 전' },
  { min: 10,  label: '10분 전' },
]
const THRESHOLDS_KEY = 'dumpit_notification_thresholds'
const NOTIFICATIONS_ENABLED_KEY = 'dumpit_notifications_enabled'
const DEFAULT_THRESHOLDS = [60]

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function loadThresholds() {
  try {
    const saved = localStorage.getItem(THRESHOLDS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_THRESHOLDS
}

function loadNotificationsEnabled() {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== '0'
}

export default function SettingsModal({ onClose }) {
  const [routineStart, setRoutineStart] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_start')
    return v ? Number(v) : DEFAULT_START
  })
  const [routineEnd, setRoutineEnd] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_end')
    return v ? Number(v) : DEFAULT_END
  })
  const [permission, setPermission] = useState(getNotificationPermission)
  const [notificationsEnabled, setNotificationsEnabled] = useState(loadNotificationsEnabled)
  const [selectedThresholds, setSelectedThresholds] = useState(loadThresholds)
  const [testSent, setTestSent] = useState(false)
  const [purchases, setPurchases] = useState([])
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const isIOS = isIOSDevice()
  const isStandalone = isStandaloneWebApp()
  const notificationNote = isIOS && !isStandalone
    ? '아이폰/아이패드에서는 홈 화면에 추가한 앱에서만 백그라운드 웹 푸시가 가능해요. 현재 알림은 Dumpit!을 열어둔 상태에서 동작해요.'
    : '현재 알림은 Dumpit! 탭이나 앱이 열려 있을 때 마감 정보를 확인해 띄워요.'

  const handleNotificationToggle = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    if (permission === 'default') {
      const result = await window.Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, '1')
        setNotificationsEnabled(true)
      }
      return
    }

    const next = !notificationsEnabled
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, next ? '1' : '0')
    setNotificationsEnabled(next)
  }

  const toggleThreshold = (min) => {
    setSelectedThresholds((prev) => {
      const next = prev.includes(min) ? prev.filter((t) => t !== min) : [...prev, min]
      localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next))
      return next
    })
  }

  const sendTestNotification = async () => {
    if (permission === 'unsupported' || permission === 'denied') return

    let currentPermission = permission
    if (currentPermission === 'default') {
      currentPermission = await window.Notification.requestPermission()
      setPermission(currentPermission)
    }
    if (currentPermission !== 'granted') return

    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, '1')
    setNotificationsEnabled(true)
    void showBrowserNotification('Dumpit! 테스트 알림', {
      body: '알림 설정이 정상이에요.',
      icon: '/favicon-48x48.png',
      tag: 'dumpit-test-notification',
    }, '/dashboard')
    setTestSent(true)
    window.setTimeout(() => setTestSent(false), 2500)
  }

  useEffect(() => {
    api.get('/shop/items')
      .then((res) => setPurchases(res.data.filter((i) => i.isOwned)))
      .catch(() => setPurchases([]))
      .finally(() => setLoadingPurchases(false))
  }, [])

  const saveRoutine = () => {
    localStorage.setItem('dumpit_routine_start', routineStart)
    localStorage.setItem('dumpit_routine_end', routineEnd)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-dark/40" onClick={onClose}>
      <div
        className="card-kitschy w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-kitschy text-xl">설정</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-dark font-black text-dark hover:bg-primary hover:text-white transition-colors"
          >
            X
          </button>
        </div>

        <section className="mb-6">
          <h3 className="font-extrabold text-dark text-sm mb-3">일과 시간</h3>
          <p className="text-xs text-dark/50 font-medium mb-3">
            시간표에 표시되는 루틴 시간대를 설정하세요
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-dark/60">시작</label>
              <select
                value={routineStart}
                onChange={(e) => setRoutineStart(Number(e.target.value))}
                className="text-sm font-bold border-2 border-dark rounded-lg px-2 py-1.5 bg-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
            <span className="font-bold text-dark/40">~</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-dark/60">종료</label>
              <select
                value={routineEnd}
                onChange={(e) => setRoutineEnd(Number(e.target.value))}
                className="text-sm font-bold border-2 border-dark rounded-lg px-2 py-1.5 bg-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <hr className="border-dark/10 mb-6" />

        <section className="mb-6">
          <h3 className="font-extrabold text-dark text-sm mb-3">알림</h3>
          <div className="flex items-center justify-between gap-4 rounded-lg border-2 border-dark/10 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-dark">마감 임박 알림</p>
              <p className="mt-0.5 text-xs font-medium text-dark/50">
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
                  : 'bg-dark/20 border-dark/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="마감 임박 알림 토글"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border border-dark/20 transition-all ${
                permission === 'granted' && notificationsEnabled ? 'left-[18px]' : 'left-0.5'
              }`} />
            </button>
          </div>

          <div className="mt-3 rounded-lg border-2 border-dark/10 bg-white px-4 py-3">
            <p className="text-[11px] font-medium text-dark/50 leading-relaxed">
              {notificationNote}
            </p>
            <button
              type="button"
              onClick={sendTestNotification}
              disabled={permission === 'unsupported' || permission === 'denied'}
              className="mt-3 w-full rounded-lg border-2 border-dark bg-accent px-3 py-2 text-xs font-black text-dark shadow-kitschy transition-transform active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testSent ? '테스트 알림을 보냈어요' : '테스트 알림 보내기'}
            </button>
          </div>

          {permission !== 'unsupported' && (
            <div className="mt-3 rounded-lg border-2 border-dark/10 bg-white px-4 py-3">
              <p className="text-xs font-bold text-dark mb-2">알림 시점</p>
              <p className="text-[11px] font-medium text-dark/50 mb-3">
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
                    <span className="text-xs font-semibold text-dark/70">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        <hr className="border-dark/10 mb-6" />

        <section className="mb-6">
          <h3 className="font-extrabold text-dark text-sm mb-3">보유 아이템</h3>
          {loadingPurchases ? (
            <p className="text-xs text-dark/40 font-medium">불러오는 중...</p>
          ) : purchases.length === 0 ? (
            <p className="text-xs text-dark/40 font-medium">
              아직 구매한 아이템이 없어요. 코인샵에서 구매해보세요!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {purchases.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 border-dark/10 bg-accent"
                >
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-dark"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] font-bold text-dark text-center leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-kitschy flex-1 bg-accent text-dark text-sm"
          >
            취소
          </button>
          <button
            onClick={saveRoutine}
            className="btn-kitschy flex-1 bg-primary text-white text-sm"
          >
            저장
          </button>
        </div>
      </div>
    </div>, document.body)
}
