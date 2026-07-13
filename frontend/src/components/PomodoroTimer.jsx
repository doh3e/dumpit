import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import settingImage from '../assets/setting_image.png'
import arrowheadImage from '../assets/arrowheads.png'

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

function notifyDesktopPomodoroComplete(mode) {
  if (typeof window === 'undefined' || !window.dumpitDesktop?.notify) return

  window.dumpitDesktop.notify({
    title: mode === MODE.BREAK ? 'Dumpit! 휴식이 끝났어요' : 'Dumpit! 집중 완료',
    body: mode === MODE.BREAK
      ? '다시 집중할 준비가 됐어요.'
      : '좋아요. 잠깐 쉬어갈 시간이에요.',
  }).catch(() => {})
}

function openDesktopPomodoroWidget() {
  if (typeof window === 'undefined') return
  window.dumpitDesktop?.openPomodoroWidget?.()
}

export default function PomodoroTimer({ tasks = [], recommendedTaskId = '', compact = false }) {
  const { refreshCoins } = useAuth()
  const [focusMin, setFocusMin] = useState(() => loadMinutes('dumpit_pomodoro_focus', DEFAULT_FOCUS_MIN))
  const [breakMin, setBreakMin] = useState(() => loadMinutes('dumpit_pomodoro_break', DEFAULT_BREAK_MIN))
  const [mode, setMode] = useState(MODE.FOCUS)
  const [remaining, setRemaining] = useState(focusMin * 60)
  const [running, setRunning] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [blinking, setBlinking] = useState(false)
  const [coinToast, setCoinToast] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef(null)
  const targetEndAtRef = useRef(null)
  const sessionOpenRef = useRef(false)

  const taskList = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks])
  const activeTasks = useMemo(() => {
    const recommendedId = String(recommendedTaskId || '')
    const deadlineTime = (task) => {
      if (!task.deadline) return Number.MAX_SAFE_INTEGER
      const date = Array.isArray(task.deadline)
        ? new Date(task.deadline[0], (task.deadline[1] || 1) - 1, task.deadline[2] || 1, task.deadline[3] || 0, task.deadline[4] || 0, task.deadline[5] || 0)
        : new Date(task.deadline)
      return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime()
    }

    return taskList
      .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
      .sort((a, b) => {
        const ar = String(a.taskId) === recommendedId ? 1 : 0
        const br = String(b.taskId) === recommendedId ? 1 : 0
        if (ar !== br) return br - ar

        const ap = a.effectivePriority ?? -1
        const bp = b.effectivePriority ?? -1
        if (ap !== bp) return bp - ap
        return deadlineTime(a) - deadlineTime(b)
      })
  }, [taskList, recommendedTaskId])
  const selectedTask = useMemo(
    () => activeTasks.find((t) => String(t.taskId) === String(selectedTaskId)),
    [activeTasks, selectedTaskId]
  )
  const desktopTasks = useMemo(() => activeTasks.map((task) => ({
    id: String(task.taskId),
    title: task.title,
  })), [activeTasks])

  useEffect(() => {
    const recommendedId = String(recommendedTaskId || '')
    const selectedStillExists = selectedTaskId
      && activeTasks.some((task) => String(task.taskId) === String(selectedTaskId))

    if (selectedStillExists) return
    if (recommendedId && activeTasks.some((task) => String(task.taskId) === recommendedId)) {
      setSelectedTaskId(recommendedId)
      return
    }
    if (selectedTaskId) {
      setSelectedTaskId('')
    }
  }, [activeTasks, recommendedTaskId, selectedTaskId])

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
    notifyDesktopPomodoroComplete(MODE.FOCUS)
    setCompletedCount((c) => c + 1)
    setBlinking(true)
    setTimeout(() => setBlinking(false), 1600)
    sessionOpenRef.current = false // 세션은 완료로 소비 — 다음 집중은 새로 시작 신호를 보낸다
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
    notifyDesktopPomodoroComplete(MODE.BREAK)
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
    setRunning(false)
  }, [playAlarm, focusMin])

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      targetEndAtRef.current = null
      return
    }

    targetEndAtRef.current = Date.now() + remaining * 1000
    const syncRemaining = () => {
      const nextRemaining = Math.max(0, Math.ceil((targetEndAtRef.current - Date.now()) / 1000))
      setRemaining(nextRemaining)
      if (nextRemaining === 0) {
        clearInterval(intervalRef.current)
      }
    }

    syncRemaining()
    intervalRef.current = setInterval(() => {
      syncRemaining()
    }, 1000)
    return () => {
      clearInterval(intervalRef.current)
    }
    // remaining is intentionally read only when a run starts/resumes.
    // During a run, targetEndAtRef keeps the countdown tied to wall-clock time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 집중 세션 시작을 서버에 알림 — 완료 시 경과시간 검증용. 일시정지→재개는 같은 세션이라 재호출 없음
  useEffect(() => {
    if (running && mode === MODE.FOCUS && !sessionOpenRef.current) {
      sessionOpenRef.current = true
      api.post('/pomodoro/start').catch(() => { sessionOpenRef.current = false })
    }
  }, [running, mode])

  const toggle = useCallback(() => setRunning((value) => !value), [])

  const reset = useCallback(() => {
    setRunning(false)
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
    sessionOpenRef.current = false // 진행 중 세션 폐기 — 다음 시작이 새 세션
  }, [focusMin])

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
    sessionOpenRef.current = false
  }

  const min = String(Math.floor(remaining / 60)).padStart(2, '0')
  const sec = String(remaining % 60).padStart(2, '0')
  const total = mode === MODE.FOCUS ? focusMin * 60 : breakMin * 60
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const isFocus = mode === MODE.FOCUS
  const isDesktop = typeof window !== 'undefined' && Boolean(window.dumpitDesktop)

  // 유휴 중 테마/스킨 변경 감지 — applyTheme·applySkins 모두 <html> dataset을 바꾸므로 observer 하나로 커버
  const [skinTick, setSkinTick] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.dumpitDesktop) return undefined
    const observer = new MutationObserver(() => setSkinTick((t) => t + 1))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-skin-pomodoro'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.dumpitDesktop?.updatePomodoroState) return

    const style = getComputedStyle(document.documentElement)
    window.dumpitDesktop.updatePomodoroState({
      active: true,
      mode,
      time: `${min}:${sec}`,
      running,
      progress,
      taskTitle: selectedTask?.title || '',
      selectedTaskId: String(selectedTaskId || ''),
      tasks: desktopTasks,
      colors: {
        focus: style.getPropertyValue('--pomo-focus').trim(),
        break: style.getPropertyValue('--pomo-break').trim(),
        ring: style.getPropertyValue('--pomo-ring').trim(),
        soft: style.getPropertyValue('--pomo-soft').trim(),
      },
    })
  }, [mode, min, sec, running, progress, selectedTask, selectedTaskId, desktopTasks, skinTick])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.dumpitDesktop?.updatePomodoroState?.({ active: false })
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.dumpitDesktop?.onPomodoroCommand) return undefined

    return window.dumpitDesktop.onPomodoroCommand((command) => {
      if (command === 'toggle') {
        toggle()
      }
      if (command === 'reset') {
        reset()
      }
      if (command?.type === 'selectTask') {
        setSelectedTaskId(command.taskId ? String(command.taskId) : '')
      }
    })
  }, [toggle, reset])

  return (
    <div className={`flex flex-col items-center gap-2 ${compact ? 'p-2' : 'p-3'}`}>
      {/* Mode label + settings button */}
      <div className="flex items-center gap-2">
        <div
          className="text-[0.625rem] font-black px-3 py-1 rounded-full border border-edge text-on-accent"
          style={{ background: isFocus ? 'var(--pomo-focus)' : 'var(--pomo-break)' }}
        >
          {isFocus ? 'FOCUS' : 'BREAK'}
        </div>
        {isDesktop && (
          <button
            onClick={openDesktopPomodoroWidget}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-line bg-card hover:bg-secondary transition-colors"
            aria-label="뽀모도로 위젯 열기"
            title="뽀모도로 위젯 열기"
          >
            <img src={arrowheadImage} alt="" className="w-3.5 h-3.5 object-contain" />
          </button>
        )}
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
        <div className="w-full border border-line rounded-lg p-2 space-y-2" style={{ background: 'var(--pomo-soft)' }}>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[0.625rem] font-bold text-sub">집중 (분)</label>
            <input
              type="number"
              min={MIN_MIN}
              max={MAX_MIN}
              value={focusMin}
              onChange={(e) => setFocusMin(Number(e.target.value))}
              className="w-16 text-xs font-bold border border-line rounded px-2 py-1 bg-card"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[0.625rem] font-bold text-sub">휴식 (분)</label>
            <input
              type="number"
              min={MIN_MIN}
              max={MAX_MIN}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              className="w-16 text-xs font-bold border border-line rounded px-2 py-1 bg-card"
            />
          </div>
          <button
            onClick={() => saveSettings(focusMin, breakMin)}
            className="w-full btn-retro text-on-accent text-[0.625rem] py-1.5"
            style={{ background: 'var(--pomo-focus)' }}
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
            stroke="var(--pomo-ring)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={isFocus ? 'var(--pomo-focus)' : 'var(--pomo-break)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-dungeon text-xl text-dark tracking-wider ${blinking ? 'px-blink' : ''}`}>
            {min}:{sec}
          </span>
        </div>
      </div>

      {/* Task selector */}
      {activeTasks.length > 0 && (
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full text-[0.625rem] font-bold border border-line rounded-lg px-2 py-1.5 bg-card truncate"
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
          style={{ background: running ? 'var(--pomo-soft)' : 'var(--pomo-focus)' }}
          className={`btn-retro flex-1 text-xs py-2 ${running ? 'text-dark' : 'text-on-accent'}`}
        >
          {running ? '일시정지' : isFocus ? '집중시작' : '쉬기시작'}
        </button>
        <button
          onClick={reset}
          className="btn-retro text-xs py-2 px-3"
        >
          초기화
        </button>
      </div>

      {/* Completed count */}
      {completedCount > 0 && (
        <p className="text-[0.625rem] font-bold text-sub">
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
