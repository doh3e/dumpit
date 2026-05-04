import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import settingImage from '../assets/setting_image.png'

const DEFAULT_FOCUS_MIN = 25
const DEFAULT_BREAK_MIN = 5
const MIN_MIN = 1
const MAX_MIN = 120

const MODE = { FOCUS: 'FOCUS', BREAK: 'BREAK' }

function loadMinutes(key, fallback) {
  const v = localStorage.getItem(key)
  const n = v ? Number(v) : fallback
  if (!Number.isFinite(n) || n < MIN_MIN || n > MAX_MIN) return fallback
  return n
}

export default function PomodoroTimer({ tasks = [], compact = false }) {
  const { refreshCoins } = useAuth()
  const [focusMin, setFocusMin] = useState(() => loadMinutes('dumpit_pomodoro_focus', DEFAULT_FOCUS_MIN))
  const [breakMin, setBreakMin] = useState(() => loadMinutes('dumpit_pomodoro_break', DEFAULT_BREAK_MIN))
  const [mode, setMode] = useState(MODE.FOCUS)
  const [remaining, setRemaining] = useState(focusMin * 60)
  const [running, setRunning] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [coinToast, setCoinToast] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef(null)

  const taskList = Array.isArray(tasks) ? tasks : []
  const activeTasks = taskList.filter(
    (t) => t.status !== 'DONE' && t.status !== 'CANCELLED'
  )

  const playAlarm = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const playBell = (freq, startTime) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2)
        osc.start(startTime)
        osc.stop(startTime + 1.2)
      }
      playBell(523, ctx.currentTime)
      playBell(659, ctx.currentTime + 0.55)
      playBell(784, ctx.currentTime + 1.1)
    } catch {
      /* audio not available */
    }
  }, [])

  const handleFocusComplete = useCallback(async () => {
    playAlarm()
    setCompletedCount((c) => c + 1)
    try {
      const res = await api.post('/pomodoro/complete', { focusMinutes: focusMin })
      refreshCoins()
      setCoinToast(res.data.coins)
      setTimeout(() => setCoinToast(null), 2500)
    } catch {
      /* ignore */
    }
    setMode(MODE.BREAK)
    setRemaining(breakMin * 60)
    setRunning(true)
  }, [playAlarm, refreshCoins, breakMin, focusMin])

  const handleBreakComplete = useCallback(() => {
    playAlarm()
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
    setRunning(false)
  }, [playAlarm, focusMin])

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false)
      if (mode === MODE.FOCUS) {
        handleFocusComplete()
      } else {
        handleBreakComplete()
      }
    }
  }, [remaining, running, mode, handleFocusComplete, handleBreakComplete])

  const toggle = () => setRunning(!running)

  const reset = () => {
    setRunning(false)
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
  }

  const saveSettings = (newFocus, newBreak) => {
    const f = Math.max(MIN_MIN, Math.min(MAX_MIN, Number(newFocus) || DEFAULT_FOCUS_MIN))
    const b = Math.max(MIN_MIN, Math.min(MAX_MIN, Number(newBreak) || DEFAULT_BREAK_MIN))
    setFocusMin(f)
    setBreakMin(b)
    localStorage.setItem('dumpit_pomodoro_focus', f)
    localStorage.setItem('dumpit_pomodoro_break', b)
    setRunning(false)
    setMode(MODE.FOCUS)
    setRemaining(f * 60)
    setShowSettings(false)
  }

  const min = String(Math.floor(remaining / 60)).padStart(2, '0')
  const sec = String(remaining % 60).padStart(2, '0')
  const total = mode === MODE.FOCUS ? focusMin * 60 : breakMin * 60
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const isFocus = mode === MODE.FOCUS

  return (
    <div className={`flex flex-col items-center gap-2 ${compact ? 'p-2' : 'p-3'}`}>
      {/* Mode label + settings button */}
      <div className="flex items-center gap-2">
        <div className={`text-[10px] font-black px-3 py-1 rounded-full border-2 border-dark ${
          isFocus
            ? 'bg-primary text-white'
            : 'bg-secondary text-white'
        }`}>
          {isFocus ? 'FOCUS' : 'BREAK'}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="타이머 설정"
          title="타이머 설정"
        >
          <img src={settingImage} alt="설정" className="w-5 h-5 object-contain" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="w-full bg-accent border-2 border-dark rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-dark/70">집중 (분)</label>
            <input
              type="number"
              min={MIN_MIN}
              max={MAX_MIN}
              value={focusMin}
              onChange={(e) => setFocusMin(Number(e.target.value))}
              className="w-16 text-xs font-bold border-2 border-dark rounded px-2 py-1 bg-white"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-dark/70">휴식 (분)</label>
            <input
              type="number"
              min={MIN_MIN}
              max={MAX_MIN}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              className="w-16 text-xs font-bold border-2 border-dark rounded px-2 py-1 bg-white"
            />
          </div>
          <button
            onClick={() => saveSettings(focusMin, breakMin)}
            className="w-full btn-kitschy bg-primary text-white text-[10px] py-1.5"
          >
            적용
          </button>
        </div>
      )}

      {/* Circular progress */}
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#E8E8E8"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={isFocus ? '#E05D5D' : '#7EC8A0'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-dark tracking-wider">
            {min}:{sec}
          </span>
        </div>
      </div>

      {/* Task selector */}
      {activeTasks.length > 0 && (
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full text-[10px] font-bold border-2 border-dark rounded-lg px-2 py-1.5 bg-white truncate"
        >
          <option value="">집중할 태스크 선택</option>
          {activeTasks.map((t) => (
            <option key={t.taskId} value={t.taskId}>
              {t.title}
            </option>
          ))}
        </select>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 w-full">
        <button
          onClick={toggle}
          className={`btn-kitschy flex-1 text-xs py-2 ${
            running
              ? 'bg-accent text-dark'
              : 'bg-primary text-white'
          }`}
        >
          {running ? '일시정지' : isFocus ? '집중시작' : '쉬기시작'}
        </button>
        <button
          onClick={reset}
          className="btn-kitschy bg-accent text-dark text-xs py-2 px-3"
        >
          초기화
        </button>
      </div>

      {/* Completed count */}
      {completedCount > 0 && (
        <p className="text-[10px] font-bold text-dark/50">
          오늘 {completedCount}회 집중 완료
        </p>
      )}

      {/* Coin toast */}
      {coinToast && (
        <div className="animate-bounce text-xs font-black text-secondary">
          +{coinToast} C 획득!
        </div>
      )}
    </div>
  )
}
