import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import CircularTimetable from '../components/CircularTimetable/CircularTimetable'
import MiniCalendar from '../components/MiniCalendar'
import AddTaskModal from '../components/AddTaskModal'
import EditTaskModal from '../components/EditTaskModal'
import TaskBoardModal from '../components/TaskBoardModal'
import { getCategory } from '../constants/categories'
import { calcCompletionCoins } from '../utils/taskRewards'

const STATUS_LABEL = {
  TODO: { label: '할 예정', color: 'bg-accent border-dark text-dark' },
  IN_PROGRESS: { label: '진행 중', color: 'bg-secondary border-dark text-white' },
  DONE: { label: '완료', color: 'bg-dark border-dark text-white' },
}

/**
 * 백엔드 날짜 파싱 — ISO 문자열 또는 Jackson 배열 [year, month(1-based), day, h, m, s]
 */
function parseDate(v) {
  if (!v) return null
  if (Array.isArray(v)) {
    return new Date(v[0], (v[1] || 1) - 1, v[2] || 1, v[3] || 0, v[4] || 0, v[5] || 0)
  }
  return new Date(v)
}

function formatDeadline(deadline) {
  const d = parseDate(deadline)
  if (!d || isNaN(d)) return null
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getUrgencyInfo(deadline) {
  const d = parseDate(deadline)
  if (!d || isNaN(d)) return null
  const now = new Date()
  const diffMs = d - now
  if (diffMs <= 0) return { text: '마감 지남!', level: 'red' }
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const remainMin = diffMin % 60
  if (diffH < 6) return { text: diffH > 0 ? `${diffH}시간 ${remainMin}분 남음!` : `${diffMin}분 남음!`, level: 'red' }
  if (diffH < 12) return { text: `${diffH}시간 ${remainMin}분 남음!`, level: 'orange' }
  if (diffH < 24) return { text: `${diffH}시간 남음`, level: 'yellow' }
  const diffDays = Math.floor(diffH / 24)
  if (diffDays <= 3) return { text: `${diffDays}일 남음`, level: null }
  return null
}

function groupByParent(list) {
  const byId = new Map(list.map((t) => [t.taskId, t]))
  const childrenOf = new Map()
  for (const t of list) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) {
      if (!childrenOf.has(t.parentTaskId)) childrenOf.set(t.parentTaskId, [])
      childrenOf.get(t.parentTaskId).push(t)
    }
  }
  const result = []
  for (const t of list) {
    if (t.parentTaskId && byId.has(t.parentTaskId)) continue
    result.push(t)
    const kids = childrenOf.get(t.taskId)
    if (kids) result.push(...kids)
  }
  return result
}

function getDashboardBucket(task, now = new Date()) {
  const deadline = parseDate(task.deadline)
  if (!deadline || Number.isNaN(deadline.getTime())) return 4
  if (deadline < now) return 0
  if (deadline <= endOfLocalDay(now)) return 1
  if (deadline <= endOfLocalDay(addDays(now, 3))) return 2
  if (deadline <= endOfLocalDay(addDays(now, 7))) return 3
  return 4
}

function sortDashboardTasks(tasks) {
  const now = new Date()
  return [...tasks].sort((a, b) => {
    const bucketA = getDashboardBucket(a, now)
    const bucketB = getDashboardBucket(b, now)
    if (bucketA !== bucketB) return bucketA - bucketB

    const priorityA = a.effectivePriority ?? -1
    const priorityB = b.effectivePriority ?? -1
    if (priorityA !== priorityB) return priorityB - priorityA

    const deadlineA = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const deadlineB = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return deadlineA - deadlineB
  })
}

function getBucketLabel(task) {
  const bucket = getDashboardBucket(task)
  if (bucket === 0) return '마감 지남'
  if (bucket === 1) return '오늘'
  if (bucket === 2) return '3일 내'
  if (bucket === 3) return '일주일 내'
  return '그 외'
}

function getFocusRecommendation(tasks) {
  const now = new Date()
  let best = null

  tasks
    .filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED')
    .forEach((task) => {
      const start = parseDate(task.startTime)
      const end = parseDate(task.endTime)
      const deadline = parseDate(task.deadline)
      const priority = task.effectivePriority ?? 0.5
      const reasons = []
      let score = priority * 40

      if (start && end && start <= now && now < end) {
        score += 120
        reasons.push('지금 진행 중인 고정 시간대에 있어요.')
      } else if (start && start > now && startOfLocalDay(start).getTime() === startOfLocalDay(now).getTime()) {
        score -= 40
      }

      if (deadline && !Number.isNaN(deadline.getTime())) {
        const diffHours = (deadline.getTime() - now.getTime()) / 3600000
        if (diffHours < 0) {
          score += 100
          reasons.push('마감 시간이 이미 지나서 먼저 정리하는 게 좋아요.')
        } else if (deadline <= endOfLocalDay(now)) {
          score += 80
          reasons.push('오늘 마감이라 시간 압박이 커요.')
        } else if (deadline <= endOfLocalDay(addDays(now, 3))) {
          score += 55
          reasons.push('3일 안에 마감돼서 미리 시작하기 좋아요.')
        } else if (deadline <= endOfLocalDay(addDays(now, 7))) {
          score += 30
          reasons.push('일주일 안에 마감되는 일이에요.')
        }
      }

      if (priority >= 0.75) {
        reasons.push('중요도가 높은 편이에요.')
      }
      if (task.estimatedMinutes && task.estimatedMinutes <= 40) {
        score += 8
        reasons.push(`${task.estimatedMinutes}분 정도라 한 번 집중하기 좋아요.`)
      }

      if (reasons.length === 0) {
        reasons.push('마감과 중요도를 같이 봤을 때 지금 후보로 좋아요.')
      }

      if (!best || score > best.score) {
        best = { task, score, reasons: reasons.slice(0, 2) }
      }
    })

  return best
}

const URGENCY_STYLE = {
  red: {
    badge: 'bg-red-500 text-white border-red-500 animate-pulse',
    card: 'border-red-500 bg-red-50',
  },
  orange: {
    badge: 'bg-orange-400 text-white border-orange-400',
    card: 'border-orange-400 bg-orange-50',
  },
  yellow: {
    badge: 'bg-yellow-400 text-dark border-yellow-400',
    card: 'border-yellow-400 bg-yellow-50',
  },
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

  const fetchTasks = () => {
    api.get('/dashboard/planning')
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
  }

  useEffect(() => { fetchTasks() }, [])

  const toggleStatus = async (task) => {
    const next = task.status === 'DONE' ? 'TODO' : 'DONE'
    try {
      await api.patch(`/tasks/${task.taskId}`, { status: next })
      fetchTasks()
      refreshCoins()

      if (next === 'DONE') {
        const coins = calcCompletionCoins(task)
        if (coins > 0) {
          setCoinToast({ coins, taskTitle: task.title })
          setTimeout(() => setCoinToast(null), 2500)
        }
      }
    } catch { /* ignore */ }
  }

  const taskList = Array.isArray(tasks) ? tasks : []

  const activeTaskBase = useMemo(
    () => taskList.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED'),
    [taskList]
  )
  const activeTasks = useMemo(
    () => {
      const sections = planning?.sections
      if (sections) {
        return groupByParent([
          ...(sections.overdue || []),
          ...(sections.today || []),
          ...(sections.next3Days || []),
          ...(sections.next7Days || []),
          ...(sections.later || []),
        ])
      }
      return groupByParent(sortDashboardTasks(activeTaskBase))
    },
    [activeTaskBase, planning]
  )
  const focusRecommendation = useMemo(
    () => planning ? (planning.focusRecommendations?.[0] || null) : getFocusRecommendation(activeTaskBase),
    [activeTaskBase, planning]
  )
  const nowSuggestion = planning?.nowSuggestion || (focusRecommendation
    ? {
        type: 'OPEN_SLOT',
        title: '지금은 비어 있는 시간이에요.',
        message: '25분 정도 집중하기 좋은 일을 골라봤어요.',
        task: focusRecommendation.task,
      }
    : null)
  const doneTasks = useMemo(() => taskList
    .filter((t) => t.status === 'DONE')
    .sort((a, b) => {
      const aTime = parseDate(a.completedAt)?.getTime() ?? 0
      const bTime = parseDate(b.completedAt)?.getTime() ?? 0
      return bTime - aTime
    }), [taskList])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="heading-kitschy text-2xl">대시보드</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            오늘의 할 일을 확인하고 시간을 효율적으로 관리해보세요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTaskBoard(true)}
            className="btn-kitschy bg-accent text-dark text-sm"
          >
            태스크 전체 보기
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-kitschy bg-secondary text-white text-sm"
          >
            태스크 추가
          </button>
          <Link
            to="/brain-dump"
            className="btn-kitschy bg-primary text-white text-sm"
          >
            브레인 덤프
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card-kitschy text-center py-12">
          <p className="font-bold text-dark/50">불러오는 중...</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-kitschy">
            <div className="mb-4 flex flex-wrap items-baseline gap-2">
              <h3 className="font-extrabold text-dark">오늘 일과표</h3>
              <span className="text-[10px] font-bold text-dark/40">시간이 정해진 일과 오늘의 흐름을 보여줘요.</span>
            </div>
            {nowSuggestion && (
              <div className="relative mx-auto mb-3 max-w-sm px-8 text-center">
                <span className="pointer-events-none absolute left-0 top-0 text-5xl font-dungeon leading-none text-primary/50">
                  {'“'}
                </span>
                <span className="pointer-events-none absolute bottom-0 right-0 text-5xl font-dungeon leading-none text-primary/50">
                  {'”'}
                </span>
                <div className="relative">
                  <p className="text-sm font-black leading-5 text-dark">{nowSuggestion.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold leading-4 text-dark/50">
                    {nowSuggestion.message}
                  </p>
                  {nowSuggestion.task && (
                    <button
                      type="button"
                      onClick={() => setEditingTask(nowSuggestion.task)}
                      className="mx-auto mt-1.5 block max-w-full truncate text-[11px] font-black text-primary hover:text-secondary"
                      title={nowSuggestion.task.title}
                    >
                      추천 · {nowSuggestion.task.title}
                    </button>
                  )}
                </div>
              </div>
            )}
            <CircularTimetable tasks={planning?.timedTasks || activeTaskBase} />
          </div>

          <div className="card-kitschy">
            <div className="flex items-baseline gap-2 mb-4">
              <h3 className="font-extrabold text-dark">달력</h3>
              <span className="text-[10px] text-dark/40 font-medium">날짜를 클릭해서 일정을 태스크로 추가해보세요!</span>
            </div>
            <MiniCalendar tasks={taskList} onTaskAdded={fetchTasks} />
          </div>

          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">
              해야 할 일 ({activeTasks.length})
            </h3>

            {activeTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-extrabold text-dark text-base">
                  {taskList.length === 0 ? '아직 할 일이 없어요!' : '모든 할 일 완료!'}
                </p>
                <p className="text-xs text-dark/50 mt-2">
                  브레인 덤프나 직접 추가를 통해 시작해보세요
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {activeTasks.map((task) => {
                  const { label, color } = STATUS_LABEL[task.status] ?? STATUS_LABEL.TODO
                  const urgency = getUrgencyInfo(task.deadline)
                  const uStyle = urgency?.level ? URGENCY_STYLE[urgency.level] : null
                  const cat = getCategory(task.category)
                  const isChild = !!task.parentTaskId
                  return (
                    <div
                      key={task.taskId}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                        uStyle ? uStyle.card : 'border-dark/10 hover:border-dark/30'
                      } ${isChild ? 'ml-6 border-l-4 border-l-secondary' : ''}`}
                    >
                      <button
                        onClick={() => toggleStatus(task)}
                        className="mt-0.5 w-5 h-5 rounded border-2 border-dark flex-shrink-0 hover:bg-primary transition-colors"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-dark/10 bg-white text-dark/50">
                            {getBucketLabel(task)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                            {label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                            {cat.emoji} {cat.label}
                          </span>
                          {isChild && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary/10 border border-secondary/40 rounded-full text-secondary">
                              ↳ 서브
                            </span>
                          )}
                          {task.isLocked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary/20 border border-secondary rounded-full text-secondary">
                              고정
                            </span>
                          )}
                          {urgency && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              uStyle ? uStyle.badge : 'bg-accent text-dark border-dark/20'
                            }`}>
                              {urgency.text}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-extrabold text-dark text-sm truncate">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-dark/50 font-medium mt-0.5">
                          {task.deadline && `마감 ${formatDeadline(task.deadline)}`}
                          {task.estimatedMinutes && ` · ${task.estimatedMinutes}분`}
                          {task.effectivePriority != null && ` · P ${Math.round(task.effectivePriority * 100)}`}
                        </p>
                      </div>

                      <button
                        onClick={() => setEditingTask(task)}
                        className="mt-0.5 text-xs font-bold text-dark/40 hover:text-primary transition-colors flex-shrink-0"
                      >
                        수정
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">
              완료한 일 ({doneTasks.length})
            </h3>

            {doneTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-bold text-dark/40 text-sm">
                  아직 완료한 항목이 없어요
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {doneTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-dark/10 opacity-60"
                  >
                    <button
                      onClick={() => toggleStatus(task)}
                      className="w-5 h-5 rounded border-2 border-dark bg-dark flex-shrink-0 flex items-center justify-center"
                    >
                      <span className="text-white text-[10px] font-bold">V</span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-dark text-sm line-through truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-dark/40 font-medium">
                        {task.deadline && `마감 ${formatDeadline(task.deadline)}`}
                      </p>
                    </div>

                    <button
                      onClick={() => setEditingTask(task)}
                      className="text-xs font-bold text-dark/40 hover:text-primary transition-colors flex-shrink-0"
                    >
                      수정
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {showTaskBoard && (
        <TaskBoardModal
          tasks={taskList}
          sections={planning?.sections}
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
          onUpdated={() => { setEditingTask(null); fetchTasks() }}
        />
      )}

      {coinToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-bounce">
          <div className="card-kitschy !py-3 !px-5 bg-secondary border-dark flex items-center gap-3">
            <span className="text-2xl font-black text-white">+{coinToast.coins} C</span>
            <div>
              <p className="text-[10px] font-bold text-white/70">완료!</p>
              <p className="text-xs font-extrabold text-white truncate max-w-[200px]">{coinToast.taskTitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
