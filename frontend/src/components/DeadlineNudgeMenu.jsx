import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const DAY_MS = 24 * 60 * 60 * 1000

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

function getDeadlineNudges(tasks) {
  const now = Date.now()

  return tasks
    .filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED')
    .map((task) => {
      const deadline = parseDate(task.deadline)
      if (!deadline || Number.isNaN(deadline.getTime())) return null

      const diffMs = deadline.getTime() - now
      if (diffMs > DAY_MS) return null

      return {
        ...task,
        diffMs,
        isOverdue: diffMs < 0,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.diffMs - b.diffMs)
}

export default function DeadlineNudgeMenu({ tasks = [] }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const nudges = useMemo(() => getDeadlineNudges(tasks), [tasks])
  const urgentCount = nudges.length

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative w-9 h-9 rounded-lg border-2 border-dark shadow-kitschy flex items-center justify-center font-black transition-colors ${
          urgentCount > 0
            ? 'bg-yellow-300 text-dark hover:bg-yellow-200'
            : 'bg-white text-dark/60 hover:text-dark'
        }`}
        aria-label="마감 임박 알림"
        title="마감 임박 알림"
      >
        !
        {urgentCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 h-5 px-1 rounded-full bg-red-500 border-2 border-dark text-[10px] leading-4 text-white">
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
                      task.isOverdue
                        ? 'border-red-500 bg-red-50 hover:bg-red-100'
                        : 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-dark">
                        {task.title}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        task.isOverdue
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
