import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import api, { API_BASE_URL, getApiErrorMessage } from '../services/api'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const CALENDAR_REFRESH_MS = 10 * 60 * 1000

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function MiniCalendar({ tasks = [], onTaskAdded }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [googleEvents, setGoogleEvents] = useState([])
  const [calendarActionRequired, setCalendarActionRequired] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [addingEventId, setAddingEventId] = useState(null)
  const tooltipTimeout = useRef(null)

  const prevMonth = () => {
    setSelectedDay(null)
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  const nextMonth = () => {
    setSelectedDay(null)
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  const visibleRange = useMemo(() => ({
    timeMin: new Date(year, month, 1).toISOString(),
    timeMax: new Date(year, month + 1, 1).toISOString(),
  }), [year, month])

  const fetchGoogleEvents = useCallback(() => {
    api.get('/calendar/events', { params: visibleRange })
      .then((res) => {
        setGoogleEvents(res.data)
        setCalendarActionRequired(null)
      })
      .catch((error) => {
        setGoogleEvents([])
        const code = error.response?.data?.code
        setCalendarActionRequired(
          ['CALENDAR_PERMISSION_REQUIRED', 'GOOGLE_CALENDAR_RECONNECT_REQUIRED'].includes(code)
            ? code
            : null
        )
      })
  }, [visibleRange])

  useEffect(() => {
    fetchGoogleEvents()
    const interval = window.setInterval(fetchGoogleEvents, CALENDAR_REFRESH_MS)
    window.addEventListener('focus', fetchGoogleEvents)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', fetchGoogleEvents)
    }
  }, [fetchGoogleEvents])

  const requestCalendarPermission = () => {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google?calendar_consent=1`
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [year, month])

  const tasksByDay = useMemo(() => {
    const map = {}
    tasks.forEach((t) => {
      if (!t.deadline) return
      const d = new Date(t.deadline)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(t)
      }
    })
    return map
  }, [tasks, year, month])

  const googleByDay = useMemo(() => {
    const map = {}
    googleEvents.forEach((e) => {
      if (!e.start) return
      const d = new Date(e.start)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(e)
      }
    })
    return map
  }, [googleEvents, year, month])

  const todayDate = today.getFullYear() === year && today.getMonth() === month
    ? today.getDate()
    : null

  const handleDayEnter = (day) => {
    if (selectedDay) return
    clearTimeout(tooltipTimeout.current)
    setHoveredDay(day)
  }

  const handleDayLeave = () => {
    tooltipTimeout.current = setTimeout(() => setHoveredDay(null), 150)
  }

  const handleDayClick = (day, hasAny) => {
    if (!hasAny) return
    clearTimeout(tooltipTimeout.current)
    setHoveredDay(null)
    setSelectedDay((prev) => (prev === day ? null : day))
  }

  const handleAddFromGoogle = async (event) => {
    setAddingEventId(event.id)
    try {
      const deadline = event.end || event.start || null
      const startTime = event.start || null
      const endTime = event.end || null

      let estimatedMinutes = null
      if (startTime && endTime) {
        const diff = (new Date(endTime) - new Date(startTime)) / 60000
        if (diff > 0 && diff < 1440) estimatedMinutes = Math.round(diff)
      }

      await api.post('/tasks', {
        title: event.summary,
        description: `구글 캘린더에서 가져옴`,
        deadline,
        estimatedMinutes,
        startTime,
        endTime,
        isLocked: true,
      })
      if (onTaskAdded) onTaskAdded()
    } catch (err) {
      alert(getApiErrorMessage(err, '태스크 추가에 실패했어요'))
    } finally {
      setAddingEventId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded border-2 border-dark text-dark font-bold text-xs hover:bg-accent transition-colors"
        >
          &lt;
        </button>
        <span className="font-extrabold text-dark text-sm">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded border-2 border-dark text-dark font-bold text-xs hover:bg-accent transition-colors"
        >
          &gt;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-dark/40 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />

          const isToday = day === todayDate
          const dayTasks = tasksByDay[day]
          const dayGoogle = googleByDay[day]
          const hasDeadline = !!dayTasks
          const hasGoogle = !!dayGoogle
          const hasAny = hasDeadline || hasGoogle

          return (
            <div
              key={day}
              className={`relative ${selectedDay === day || hoveredDay === day ? 'z-10' : ''}`}
              onMouseEnter={() => hasAny && handleDayEnter(day)}
              onMouseLeave={handleDayLeave}
              onClick={() => handleDayClick(day, hasAny)}
            >
              <div
                className={`text-center py-1.5 rounded text-xs font-bold transition-colors ${
                  isToday
                    ? 'bg-primary text-white'
                    : hasAny
                    ? `text-dark hover:bg-dark/5 ${selectedDay === day ? 'bg-dark/5' : ''}`
                    : 'text-dark hover:bg-accent'
                } ${hasAny ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {day}
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {hasDeadline && (
                    <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-secondary'}`} />
                  )}
                  {hasGoogle && (
                    <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-white/60' : 'bg-blue-500'}`} />
                  )}
                </div>
              </div>

              {/* hover 미리보기 - 읽기 전용 */}
              {hoveredDay === day && !selectedDay && hasAny && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-52 card-kitschy !p-3 space-y-2 pointer-events-none">
                  <p className="text-[10px] font-bold text-dark/40">{month + 1}월 {day}일 · 클릭해서 고정</p>
                  {dayTasks?.map((t) => (
                    <div key={t.taskId} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-dark truncate">{t.title}</p>
                        {t.deadline && (
                          <p className="text-[9px] text-dark/40 font-medium">마감 {formatTime(t.deadline)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayGoogle?.map((e) => (
                    <div key={e.id} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-dark truncate">{e.summary}</p>
                        <p className="text-[9px] text-dark/40 font-medium">
                          {formatTime(e.start)}{e.end && ` ~ ${formatTime(e.end)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 클릭 고정 모달 - 추가 버튼 있음 */}
              {selectedDay === day && hasAny && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-52 card-kitschy !p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-dark/40">{month + 1}월 {day}일</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDay(null) }}
                      className="text-[10px] text-dark/30 hover:text-dark transition-colors leading-none"
                    >✕</button>
                  </div>
                  {dayTasks?.map((t) => (
                    <div key={t.taskId} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-dark truncate">{t.title}</p>
                        {t.deadline && (
                          <p className="text-[9px] text-dark/40 font-medium">마감 {formatTime(t.deadline)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayGoogle?.map((e) => (
                    <div key={e.id} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-dark truncate">{e.summary}</p>
                        <p className="text-[9px] text-dark/40 font-medium">
                          {formatTime(e.start)}{e.end && ` ~ ${formatTime(e.end)}`}
                        </p>
                      </div>
                      <button
                        onClick={(evt) => { evt.stopPropagation(); handleAddFromGoogle(e) }}
                        disabled={addingEventId === e.id}
                        className="text-[9px] font-bold text-blue-500 hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                      >
                        {addingEventId === e.id ? '...' : '+ 추가'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {calendarActionRequired && (
        <div className="mt-3 rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-bold text-blue-900">
            {calendarActionRequired === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED'
              ? 'Google Calendar 권한 갱신이 필요해요.'
              : 'Google Calendar 일정을 보려면 캘린더 읽기 권한이 필요해요.'}
          </p>
          <button
            type="button"
            onClick={requestCalendarPermission}
            className="mt-2 rounded border-2 border-blue-500 bg-white px-2.5 py-1 text-[10px] font-black text-blue-600 hover:bg-blue-100 transition-colors"
          >
            {calendarActionRequired === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' ? '권한 갱신하기' : '권한 허용하기'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="text-[10px] font-bold text-dark/50">태스크</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-dark/50">구글 캘린더</span>
        </div>
      </div>
    </div>
  )
}
