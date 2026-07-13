import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { getApiErrorMessage } from '../services/api'
import { notifyToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import MiniCalendar from '../components/MiniCalendar'
import AddTaskModal from '../components/AddTaskModal'
import EditTaskModal from '../components/EditTaskModal'
import TaskBoardModal from '../components/TaskBoardModal'
import NowHeroCard from '../components/dashboard/NowHeroCard'
import TaskListCard from '../components/dashboard/TaskListCard'
import PixelBurst from '../components/PixelBurst'
import RocketLaunch from '../components/RocketLaunch'
import { parseDate, isSameLocalDate } from '../utils/dates'
import { calcCompletionCoins } from '../utils/taskRewards'

const SECTION_KEYS = ['overdue', 'today', 'tomorrow', 'next7Days', 'later', 'someday', 'recentDone']

function replaceTask(list, updatedTask) {
  if (!Array.isArray(list) || !updatedTask?.taskId) return list
  return list.map((task) => task.taskId === updatedTask.taskId ? { ...task, ...updatedTask } : task)
}

function replacePlanningTask(planning, updatedTask) {
  if (!planning || !updatedTask?.taskId) return planning

  const nextSections = planning.sections
    ? {
        ...planning.sections,
        ...Object.fromEntries(
          SECTION_KEYS.map((key) => [key, replaceTask(planning.sections[key], updatedTask)])
        ),
      }
    : planning.sections

  const nowSuggestion = planning.nowSuggestion?.task?.taskId === updatedTask.taskId
    ? {
        ...planning.nowSuggestion,
        title: planning.nowSuggestion.type === 'CURRENT_EVENT'
          ? `지금은 ${updatedTask.title} 중이에요.`
          : planning.nowSuggestion.title,
        task: { ...planning.nowSuggestion.task, ...updatedTask },
      }
    : planning.nowSuggestion

  return {
    ...planning,
    tasks: replaceTask(planning.tasks, updatedTask),
    sections: nextSections,
    nowSuggestion,
    focusRecommendations: Array.isArray(planning.focusRecommendations)
      ? planning.focusRecommendations.map((recommendation) => (
          recommendation.task?.taskId === updatedTask.taskId
            ? { ...recommendation, task: { ...recommendation.task, ...updatedTask } }
            : recommendation
        ))
      : planning.focusRecommendations,
  }
}

export default function DashboardPage() {
  const { refreshCoins } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskBoard, setShowTaskBoard] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [coinToast, setCoinToast] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [bursts, setBursts] = useState([])
  const [showRocket, setShowRocket] = useState(false)

  const fetchTasks = useCallback(() => {
    return api.get('/dashboard/planning')
      .then((res) => {
        const data = res.data || {}
        setPlanning(data)
        setTasks(Array.isArray(data.tasks) ? data.tasks : [])
      })
      .catch(() => {
        setPlanning(null)
        setTasks([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleTaskUpdated = useCallback((updatedTask) => {
    setEditingTask(null)
    if (updatedTask?.taskId) {
      setTasks((prev) => replaceTask(prev, updatedTask))
      setPlanning((prev) => replacePlanningTask(prev, updatedTask))
      window.dispatchEvent(new CustomEvent('dumpit:tasks-updated'))
    }
    fetchTasks()
  }, [fetchTasks])

  const handleStickerChange = useCallback(async (task, code) => {
    const previousCode = task.stickerCode ?? null
    const optimisticTask = { ...task, stickerCode: code }
    setTasks((prev) => replaceTask(prev, optimisticTask))
    setPlanning((prev) => replacePlanningTask(prev, optimisticTask))
    try {
      const res = await api.put(`/tasks/${task.taskId}/sticker`, { code })
      setTasks((prev) => replaceTask(prev, res.data))
      setPlanning((prev) => replacePlanningTask(prev, res.data))
      window.dispatchEvent(new CustomEvent('dumpit:tasks-updated'))
    } catch (err) {
      const rollbackTask = { ...task, stickerCode: previousCode }
      setTasks((prev) => replaceTask(prev, rollbackTask))
      setPlanning((prev) => replacePlanningTask(prev, rollbackTask))
      notifyToast(getApiErrorMessage(err, '스티커를 변경하지 못했어요.'))
    }
  }, [])

  const toggleStatus = async (task, event) => {
    const next = task.status === 'DONE' ? 'TODO' : 'DONE'
    const clickX = event?.clientX
    const clickY = event?.clientY
    try {
      await api.patch(`/tasks/${task.taskId}`, { status: next })
      fetchTasks()
      refreshCoins()

      if (next === 'DONE') {
        // 픽셀 버스트 — 체크 위치에서, 연타 시 동시 3개까지만
        if (clickX != null) {
          setBursts((prev) => prev.length >= 3 ? prev : [...prev, { id: Date.now(), x: clickX, y: clickY }])
        }
        const coins = calcCompletionCoins(task)
        if (coins > 0) {
          setCoinToast({ coins, taskTitle: task.title })
          setTimeout(() => setCoinToast(null), 2500)
        }
      }
    } catch { /* ignore */ }
  }

  const taskList = Array.isArray(tasks) ? tasks : []
  const sections = planning?.sections || null

  const heroTaskId = planning?.nowSuggestion?.task?.taskId ?? null
  // 미니 큐: 오늘 남은 일(마감순) 우선, 모자라면 추천 상위로 채움
  const heroQueue = useMemo(() => {
    const seen = new Set(heroTaskId != null ? [heroTaskId] : [])
    const queue = []
    const todayByDeadline = [...(planning?.sections?.today || [])].sort((a, b) => {
      const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return ad - bd
    })
    for (const task of todayByDeadline) {
      if (queue.length >= 2) break
      if (seen.has(task.taskId)) continue
      seen.add(task.taskId)
      queue.push({ task, bucket: 'TODAY' })
    }
    for (const recommendation of planning?.focusRecommendations || []) {
      if (queue.length >= 2) break
      if (!recommendation.task || seen.has(recommendation.task.taskId)) continue
      seen.add(recommendation.task.taskId)
      queue.push(recommendation)
    }
    return queue
  }, [planning, heroTaskId])

  // 오늘 진행률 (궤도 링) — 마감이 오늘인 태스크 기준
  const { todayDone, todayTotal } = useMemo(() => {
    const now = new Date()
    const todayAll = taskList.filter((t) => {
      if (t.status === 'CANCELLED') return false
      const d = parseDate(t.deadline)
      return d && isSameLocalDate(d, now)
    })
    return {
      todayDone: todayAll.filter((t) => t.status === 'DONE').length,
      todayTotal: todayAll.length,
    }
  }, [taskList])

  // 하루 전체 완료 → 로켓 발사 (거짓→참 전환마다 매번, 페이지 로드 시 이미 전체 완료 상태면 재생 안 함)
  const allDoneToday = todayTotal > 0 && todayDone === todayTotal
  const prevAllDone = useRef(null)
  useEffect(() => {
    if (loading) return
    if (prevAllDone.current === null) {
      prevAllDone.current = allDoneToday
      return
    }
    if (allDoneToday && !prevAllDone.current) setShowRocket(true)
    prevAllDone.current = allDoneToday
  }, [allDoneToday, loading])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-dungeon text-dark text-2xl">대시보드</h2>
          <p className="mt-2 text-sm font-semibold text-sub">
            오늘의 할 일을 확인하고 시간을 효율적으로 관리해보세요
          </p>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:grow">
          <button
            onClick={() => setShowTaskBoard(true)}
            disabled={!sections}
            className="btn-retro text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            태스크 전체 보기
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-retro-secondary text-sm">
            태스크 추가
          </button>
          <Link to="/brain-dump" className="btn-retro-primary text-sm">
            브레인 덤프
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card-retro text-center py-12">
          <p className="font-bold text-sub">불러오는 중...</p>
        </div>
      ) : !planning ? (
        <div className="card-retro text-center py-12">
          <p className="font-extrabold text-dark text-base">할 일을 불러오지 못했어요</p>
          <p className="text-xs text-sub mt-2">잠시 후 새로고침 해주세요</p>
        </div>
      ) : (
        <>
          <NowHeroCard
            nowSuggestion={planning.nowSuggestion}
            queue={heroQueue}
            todayDone={todayDone}
            todayTotal={todayTotal}
            allDone={allDoneToday}
            onComplete={toggleStatus}
            onEdit={setEditingTask}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskListCard
              sections={sections}
              onToggle={toggleStatus}
              onEdit={setEditingTask}
              onStickerChange={handleStickerChange}
            />

            <div className="card-retro">
              <div className="flex items-baseline gap-2 mb-4">
                <h3 className="font-galmuri font-bold text-dark">달력</h3>
                <span className="text-[0.625rem] text-sub font-medium">날짜를 클릭해서 일정을 태스크로 추가해보세요!</span>
              </div>
              <MiniCalendar tasks={taskList} onTaskAdded={fetchTasks} />
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchTasks() }}
        />
      )}

      {showTaskBoard && sections && (
        <TaskBoardModal
          sections={sections}
          onClose={() => setShowTaskBoard(false)}
          onEditTask={(task) => {
            setShowTaskBoard(false)
            setEditingTask(task)
          }}
          onToggleTask={toggleStatus}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}

      {bursts.map((b) => (
        <PixelBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}

      {showRocket && <RocketLaunch onDone={() => setShowRocket(false)} />}

      {coinToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-bounce">
          <div className="card-retro !py-3 !px-5 bg-secondary flex items-center gap-3">
            <span className="font-dungeon text-2xl text-on-accent">+{coinToast.coins} C</span>
            <div>
              <p className="text-[0.625rem] font-bold text-on-accent opacity-70">완료!</p>
              <p className="text-xs font-extrabold text-on-accent truncate max-w-[200px]">{coinToast.taskTitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
