import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const FOCUS_SEC = 25 * 60
const BREAK_SEC = 5 * 60

const MODE = { FOCUS: 'FOCUS', BREAK: 'BREAK' }

export default function PomodoroTimer({ tasks = [], compact = false }) {
  const { refreshCoins } = useAuth()
  const [mode, setMode] = useState(MODE.FOCUS)
  const [remaining, setRemaining] = useState(FOCUS_SEC)
  const [running, setRunning] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [coinToast, setCoinToast] = useState(null)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  const activeTasks = tasks.filter(
    (t) => t.status !== 'DONE' && t.status !== 'CANCELLED'
  )

  const playAlarm = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.3
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
      setTimeout(() => {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1000
        gain2.gain.value = 0.3
        osc2.start()
        osc2.stop(ctx.currentTime + 0.3)
      }, 400)
    } catch {
      /* audio not available */
    }
  }, [])

  const handleFocusComplete = useCallback(async () => {
    playAlarm()
    setCompletedCount((c) => c + 1)
    try {
      await api.post('/pomodoro/complete')
      refreshCoins()
      setCoinToast(15)
      setTimeout(() => setCoinToast(null), 2500)
    } catch {
      /* ignore */
    }
    setMode(MODE.BREAK)
    setRemaining(BREAK_SEC)
    setRunning(true)
  }, [playAlarm, refreshCoins])

  const handleBreakComplete = useCallback(() => {
    playAlarm()
    setMode(MODE.FOCUS)
    setRemaining(FOCUS_SEC)
    setRunning(false)
  }, [playAlarm])

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
    setRemaining(FOCUS_SEC)
  }

  const min = String(Math.floor(remaining / 60)).padStart(2, '0')
  const sec = String(remaining % 60).padStart(2, '0')
  const total = mode === MODE.FOCUS ? FOCUS_SEC : BREAK_SEC
  const progress = ((total - remaining) / total) * 100

  const isFocus = mode === MODE.FOCUS

  return (
    <div className={`flex flex-col items-center gap-2 ${compact ? 'p-2' : 'p-3'}`}>
      {/* Mode label */}
      <div className={`text-[10px] font-black px-3 py-1 rounded-full border-2 border-dark ${
        isFocus
          ? 'bg-primary text-white'
          : 'bg-secondary text-white'
      }`}>
        {isFocus ? 'FOCUS' : 'BREAK'}
      </div>

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
