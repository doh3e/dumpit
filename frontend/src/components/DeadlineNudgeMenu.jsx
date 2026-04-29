import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const NOTIFIED_KEY = 'dumpit.deadlineNudges.notified'
const THRESHOLDS_KEY = 'dumpit_notification_thresholds'
const NOTIFICATIONS_ENABLED_KEY = 'dumpit_notifications_enabled'
const DEFAULT_THRESHOLDS = [60]
const THRESHOLD_WINDOW_MIN = 5

const THRESHOLD_LABELS = {
  720: '12시간 전',
  360: '6시간 전',
  180: '3시간 전',
  60:  '1시간 전',
  30:  '30분 전',
  10:  '10분 전',
}

function getSelectedThresholds() {
  try {
    const saved = localStorage.getItem(THRESHOLDS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_THRESHOLDS
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.permission
}

function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  return new Date(value)
}

function formatDeadline(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRemaining(deadline) {
  const date = parseDate(deadline)
  if (!date || Number.isNaN(date.getTime())) return ''

  const diffMs = date.getTime() - Date.now()
  const absMinutes = Math.max(1, Math.floor(Math.abs(diffMs) / 60000))
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60

  if (diffMs < 0) {
    if (hours >= 24) return `${Math.floor(hours / 24)}일 지남`
    if (hours > 0) return `${hours}시간 지남`
    return `${minutes}분 지남`
  }

  if (hours >= 1) return `${hours}시간 ${minutes}분 남음`
  return `${minutes}분 남음`
}

export default function DeadlineNudgeMenu() {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState(getNotificationPermission)
  const [nudges, setNudges] = useState([])
  const menuRef = useRef(null)
  const urgentCount = nudges.length

  const fetchNudges = useCallback(() => {
    api.get('/notifications/deadline-nudges')
      .then((res) => setNudges(res.data))
      .catch(() => setNudges([]))
  }, [])

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    const result = await window.Notification.requestPermission()
    setPermission(result)
  }

  useEffect(() => {
    if (!open) return

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    setPermission(getNotificationPermission())
    fetchNudges()

    const interval = window.setInterval(fetchNudges, 60000)
    window.addEventListener('focus', fetchNudges)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', fetchNudges)
    }
  }, [fetchNudges])

  useEffect(() => {
    if (permission !== 'granted' || nudges.length === 0) return
    if (localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === '0') return

    const selectedThresholds = getSelectedThresholds()

    let notified = []
    try {
      notified = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || '[]')
    } catch {
      notified = []
    }

    const notifiedSet = new Set(notified)

    const fire = (body, tag) => {
      const n = new window.Notification('Dumpit! 마감 알림', {
        body,
        icon: '/favicon-48x48.png',
        tag,
      })
      n.onclick = () => { window.focus(); window.location.assign('/dashboard'); n.close() }
    }

    let count = 0
    for (const task of nudges) {
      if (count >= 5) break

      // 처음 감지 시 (항상)
      const firstKey = `${task.taskId}:${task.deadline}:first`
      if (!notifiedSet.has(firstKey)) {
        fire(`${task.title} · ${formatRemaining(task.deadline)}`, firstKey)
        notifiedSet.add(firstKey)
        count++
      }

      // 유저가 선택한 시점별 알림
      const deadline = parseDate(task.deadline)
      if (!deadline) continue
      const minutesLeft = (deadline.getTime() - Date.now()) / 60000

      for (const thresholdMin of selectedThresholds) {
        if (count >= 5) break
        const key = `${task.taskId}:${task.deadline}:${thresholdMin}`
        if (!notifiedSet.has(key)) {
          const diff = minutesLeft - thresholdMin
          if (diff >= -THRESHOLD_WINDOW_MIN && diff <= THRESHOLD_WINDOW_MIN && minutesLeft > 0) {
            fire(`${task.title} · ${THRESHOLD_LABELS[thresholdMin]} 마감 예정`, key)
            notifiedSet.add(key)
            count++
          }
        }
      }
    }

    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedSet].slice(-200)))
  }, [nudges, permission])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 border-2 font-extrabold text-sm transition-colors ${
          urgentCount > 0
            ? 'bg-yellow-300/30 border-yellow-200/80 text-yellow-100 hover:bg-yellow-300/40'
            : 'bg-white/25 border-white/80 text-white/60 hover:bg-white/30'
        }`}
        aria-label="마감 임박 알림"
      >
        <span className="text-xs leading-none">!</span>
        {urgentCount > 0 && (
          <span className="text-sm font-extrabold leading-none">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))]">
          <div className="card-kitschy !p-3 bg-white">
            <div className="flex items-center justify-between gap-3 px-1 pb-2 border-b-2 border-dark/10">
              <p className="text-sm font-black text-dark">마감 임박</p>
              <span className="text-[10px] font-extrabold text-dark/50">24시간 이내</span>
            </div>

            {urgentCount === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm font-extrabold text-dark">급한 마감이 없어요</p>
                <p className="mt-1 text-xs font-semibold text-dark/50">오늘은 조금 숨 돌려도 됩니다.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                {nudges.slice(0, 8).map((task) => (
                  <Link
                    key={task.taskId}
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg border-2 p-3 transition-colors ${
                      task.overdue
                        ? 'border-red-500 bg-red-50 hover:bg-red-100'
                        : 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-dark">
                        {task.title}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        task.overdue
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-yellow-500 bg-yellow-300 text-dark'
                      }`}>
                        {formatRemaining(task.deadline)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-dark/55">
                      마감 {formatDeadline(task.deadline)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
