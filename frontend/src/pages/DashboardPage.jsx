import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import CircularTimetable from '../components/CircularTimetable/CircularTimetable'
import MiniCalendar from '../components/MiniCalendar'
import AddTaskModal from '../components/AddTaskModal'
import EditTaskModal from '../components/EditTaskModal'
import { getCategory } from '../constants/categories'

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

function isVisibleToday(task) {
  if (!task.deadline) return true
  const deadline = parseDate(task.deadline)
  if (!deadline || Number.isNaN(deadline.getTime())) return true
  return startOfLocalDay(deadline) >= startOfLocalDay(new Date())
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
  const [editingTask, setEditingTask] = useState(null)
  const [coinToast, setCoinToast] = useState(null)

  const fetchTasks = () => {
    api.get('/tasks')
      .then((res) => setTasks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTasks([]))
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
        const priority = task.effectivePriority ?? 0.5
        const coins = Math.floor(10 + priority * 40)
        setCoinToast({ coins, taskTitle: task.title })
        setTimeout(() => setCoinToast(null), 2500)
      }
    } catch { /* ignore */ }
  }

  const taskList = Array.isArray(tasks) ? tasks : []

  const activeTasks = groupByParent(
    taskList.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && isVisibleToday(t))
  )
  const doneTasks = taskList.filter((t) => {
    if (t.status !== 'DONE') return false
    if (!t.deadline) return true
    const deadline = parseDate(t.deadline)
    if (!deadline || Number.isNaN(deadline.getTime())) return true
    return isSameLocalDate(deadline, new Date()) || deadline > new Date()
  })

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
            onClick={() => setShowAddModal(true)}
            className="btn-kitschy bg-secondary text-white text-sm"
          >
            + 태스크 추가
          </button>
          <Link
            to="/brain-dump"
            className="btn-kitschy bg-primary text-white text-sm"
          >
            + 브레인 덤프
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card-kitschy text-center py-12">
          <p className="font-bold text-dark/50">불러오는 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">오늘 일과표</h3>
            <CircularTimetable tasks={activeTasks} />
          </div>

          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">달력</h3>
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
      )}

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchTasks() }}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
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
