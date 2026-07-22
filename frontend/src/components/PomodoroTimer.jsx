import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { setPomodoroFocus, clearPomodoroFocus } from '../services/pomodoroFocus'
import { nextAfterFocus, autoStartNextFocus } from '../utils/pomodoroCycle'
import settingImage from '../assets/setting_image.png'
import arrowheadImage from '../assets/arrowheads.png'

const DEFAULT_FOCUS_MIN = 25
const DEFAULT_BREAK_MIN = 5
const MIN_MIN = 1
const MAX_MIN = 120
const DEFAULT_SETS = 1 // 0 = 무한
const MAX_SETS = 12
const DEFAULT_LONG_BREAK_MIN = 15
const DEFAULT_LONG_EVERY = 4

const MODE = { FOCUS: 'FOCUS', BREAK: 'BREAK' }

function loadMinutes(key, fallback) {
  const v = localStorage.getItem(key)
  const n = v ? Number(v) : fallback
  if (!Number.isFinite(n) || n < MIN_MIN || n > MAX_MIN) return fallback
  return n
}

function loadIntSetting(key, fallback, min, max) {
  const v = localStorage.getItem(key)
  const n = v == null ? fallback : Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return fallback
  return n
}

function notifyDesktopPomodoroComplete(mode, { autoContinue = false } = {}) {
  if (typeof window === 'undefined' || !window.dumpitDesktop?.notify) return

  window.dumpitDesktop.notify({
    title: mode === MODE.BREAK ? 'Dumpit! 휴식이 끝났어요' : 'Dumpit! 집중 완료',
    body: mode === MODE.BREAK
      ? (autoContinue ? '다음 집중을 시작할게요.' : '다시 집중할 준비가 됐어요.')
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
  const [setsTarget, setSetsTarget] = useState(() => loadIntSetting('dumpit_pomodoro_sets', DEFAULT_SETS, 0, MAX_SETS))
  const [longBreakMin, setLongBreakMin] = useState(() => loadIntSetting('dumpit_pomodoro_long_break', DEFAULT_LONG_BREAK_MIN, MIN_MIN, MAX_MIN))
  const [longBreakEvery, setLongBreakEvery] = useState(() => loadIntSetting('dumpit_pomodoro_long_every', DEFAULT_LONG_EVERY, 2, MAX_SETS))
  const [currentSet, setCurrentSet] = useState(0) // 이번 런에서 완료한 집중 수
  const [setsDone, setSetsDone] = useState(null) // "N세트 완료!" 배너 — 다음 시작/리셋까지 유지
  const [activeBreakMin, setActiveBreakMin] = useState(breakMin) // 진행 중 휴식 길이(긴 휴식 대응)
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
    const finishedSets = currentSet + 1
    const decision = nextAfterFocus({ completedSets: finishedSets, setsTarget, longBreakEvery })
    if (decision.type === 'DONE') {
      // 마지막 세트: 휴식 없이 종료(세트 1은 여기 안 옴 — 기존 동작 보존)
      setCurrentSet(0)
      setSetsDone(finishedSets)
      setMode(MODE.FOCUS)
      setRemaining(focusMin * 60)
      setRunning(false)
    } else {
      setCurrentSet(finishedSets)
      const nextBreakMin = decision.long ? longBreakMin : breakMin
      setActiveBreakMin(nextBreakMin)
      setMode(MODE.BREAK)
      setRemaining(nextBreakMin * 60)
      setRunning(true)
    }
    try {
      const res = await api.post('/pomodoro/complete', { focusMinutes: focusMin })
      refreshCoins()
      setCoinToast(res.data.coins)
      setTimeout(() => setCoinToast(null), 2500)
    } catch {
      /* ignore */
    }
  }, [playAlarm, refreshCoins, breakMin, focusMin, currentSet, setsTarget, longBreakEvery, longBreakMin])

  const handleBreakComplete = useCallback(() => {
    const autoContinue = autoStartNextFocus(setsTarget)
    playAlarm()
    notifyDesktopPomodoroComplete(MODE.BREAK, { autoContinue })
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
    setRunning(autoContinue)
    if (!autoContinue) setCurrentSet(0) // 세트 1: 런 종료(기존 동작)
  }, [playAlarm, focusMin, setsTarget])

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
      // 집중을 시작한 태스크는 '손댄 일'로 기록 — 진행 중 뱃지·추천 가산·TASK_STARTED가 여기서 발화.
      // 세션 도중 태스크를 바꿔도 전환하지 않는다(세션은 시작 태스크의 것).
      if (selectedTask && selectedTask.status === 'TODO') {
        api.patch(`/tasks/${selectedTask.taskId}`, { status: 'IN_PROGRESS' })
          .then(() => window.dispatchEvent(new CustomEvent('dumpit:tasks-updated')))
          .catch(() => {})
      }
    }
  }, [running, mode, selectedTask])

  // 집중 타이머가 도는 동안만 라이브 집중 상태 발행 — 대시보드 히어로가 구독한다
  const focusTokenRef = useRef({})
  useEffect(() => {
    const token = focusTokenRef.current
    if (running && mode === MODE.FOCUS && selectedTask) {
      setPomodoroFocus(token, { taskId: selectedTask.taskId, title: selectedTask.title })
    } else {
      clearPomodoroFocus(token)
    }
    return () => clearPomodoroFocus(token)
  }, [running, mode, selectedTask])

  const toggle = useCallback(() => {
    setSetsDone(null)
    setRunning((value) => !value)
  }, [])

  const reset = useCallback(() => {
    setRunning(false)
    setMode(MODE.FOCUS)
    setRemaining(focusMin * 60)
    setCurrentSet(0)
    setSetsDone(null)
    sessionOpenRef.current = false // 진행 중 세션 폐기 — 다음 시작이 새 세션
  }, [focusMin])

  const saveSettings = (newFocus, newBreak, newSets, newLongBreak, newLongEvery) => {
    const f = Math.max(MIN_MIN, Math.min(MAX_MIN, Number(newFocus) || DEFAULT_FOCUS_MIN))
    const b = Math.max(MIN_MIN, Math.min(MAX_MIN, Number(newBreak) || DEFAULT_BREAK_MIN))
    const rawSets = Number(newSets)
    const s = Number.isFinite(rawSets) && rawSets >= 0 && rawSets <= MAX_SETS ? rawSets : DEFAULT_SETS
    const lb = Math.max(MIN_MIN, Math.min(MAX_MIN, Number(newLongBreak) || DEFAULT_LONG_BREAK_MIN))
    const le = Math.max(2, Math.min(MAX_SETS, Number(newLongEvery) || DEFAULT_LONG_EVERY))
    setFocusMin(f)
    setBreakMin(b)
    setSetsTarget(s)
    setLongBreakMin(lb)
    setLongBreakEvery(le)
    localStorage.setItem('dumpit_pomodoro_focus', f)
    localStorage.setItem('dumpit_pomodoro_break', b)
    localStorage.setItem('dumpit_pomodoro_sets', s)
    localStorage.setItem('dumpit_pomodoro_long_break', lb)
    localStorage.setItem('dumpit_pomodoro_long_every', le)
    setRunning(false)
    setMode(MODE.FOCUS)
    setRemaining(f * 60)
    setCurrentSet(0)
    setSetsDone(null)
    setActiveBreakMin(b)
    setShowSettings(false)
    sessionOpenRef.current = false
  }

  const min = String(Math.floor(remaining / 60)).padStart(2, '0')
  const sec = String(remaining % 60).padStart(2, '0')
  const total = mode === MODE.FOCUS ? focusMin * 60 : activeBreakMin * 60
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const isFocus = mode === MODE.FOCUS
  const isDesktop = typeof window !== 'undefined' && Boolean(window.dumpitDesktop)

  // 유휴 중 테마/스킨 변경 감지 — applyTheme·applySkins 모두 <html> dataset을 바꾸므로 observer 하나로 커버
  // data-skin-bg: 배경 테마는 위젯 크롬 토큰(--bg 등)을 바꾸므로 함께 감시
  const [skinTick, setSkinTick] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.dumpitDesktop) return undefined
    const observer = new MutationObserver(() => setSkinTick((t) => t + 1))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-skin-pomodoro', 'data-skin-bg'],
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
        // 위젯 크롬용 전역 토큰 — 다크모드·배경 테마가 위젯에도 반영되게 전체 전달
        bg: style.getPropertyValue('--bg').trim(),
        card: style.getPropertyValue('--card').trim(),
        fg: style.getPropertyValue('--fg').trim(),
        sub: style.getPropertyValue('--sub').trim(),
        line: style.getPropertyValue('--line').trim(),
        edge: style.getPropertyValue('--edge').trim(),
        chip: style.getPropertyValue('--chip').trim(),
        shadowSm: style.getPropertyValue('--shadow-sm').trim(),
        onAccent: style.getPropertyValue('--on-accent').trim(),
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
          <div className="flex items-center justify-between gap-2">
            <label className="text-[0.625rem] font-bold text-sub">반복 세트</label>
            <select
              value={setsTarget}
              onChange={(e) => setSetsTarget(Number(e.target.value))}
              className="w-16 text-xs font-bold border border-line rounded px-1 py-1 bg-card"
            >
              {Array.from({ length: MAX_SETS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={0}>∞</option>
            </select>
          </div>
          {/* 긴 휴식은 세트 반복이 있을 때만 의미 있음 — 세트 1이면 숨김 */}
          {setsTarget !== 1 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[0.625rem] font-bold text-sub">긴 휴식 (분)</label>
                <input
                  type="number"
                  min={MIN_MIN}
                  max={MAX_MIN}
                  value={longBreakMin}
                  onChange={(e) => setLongBreakMin(Number(e.target.value))}
                  className="w-16 text-xs font-bold border border-line rounded px-2 py-1 bg-card"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[0.625rem] font-bold text-sub">긴 휴식 주기 (세트)</label>
                <input
                  type="number"
                  min={2}
                  max={MAX_SETS}
                  value={longBreakEvery}
                  onChange={(e) => setLongBreakEvery(Number(e.target.value))}
                  className="w-16 text-xs font-bold border border-line rounded px-2 py-1 bg-card"
                />
              </div>
            </>
          )}
          <button
            onClick={() => saveSettings(focusMin, breakMin, setsTarget, longBreakMin, longBreakEvery)}
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

      {/* Set progress — 세트 1은 기존 화면 그대로(표시 없음) */}
      {setsTarget !== 1 && setsDone == null && (currentSet > 0 || running) && (
        <p className="text-[0.625rem] font-bold text-sub">
          {setsTarget === 0
            ? (isFocus ? `${currentSet + 1}세트째` : `${currentSet}세트 완료`)
            : (isFocus ? `${Math.min(currentSet + 1, setsTarget)}/${setsTarget} 세트` : `${currentSet}/${setsTarget} 세트 완료`)}
        </p>
      )}
      {setsDone != null && (
        <p className="text-[0.625rem] font-black text-secondary">{setsDone}세트 완료! 수고했어요</p>
      )}

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
