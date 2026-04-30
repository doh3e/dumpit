import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCategory } from '../constants/categories'

function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDeadline(value) {
  const date = parseDate(value)
  if (!date) return '마감 없음'
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPriority(task) {
  if (task.effectivePriority == null) return 'P -'
  return `P ${Math.round(task.effectivePriority * 100)}`
}

function sortTasks(tasks, sortMode) {
  return [...tasks].sort((a, b) => {
    if (sortMode === 'deadline') {
      const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (ad !== bd) return ad - bd
      return (b.effectivePriority ?? 0) - (a.effectivePriority ?? 0)
    }
    const ap = a.effectivePriority ?? -1
    const bp = b.effectivePriority ?? -1
    if (bp !== ap) return bp - ap
    const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return ad - bd
  })
}

function buildSections(tasks, sortMode) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const threeDaysEnd = endOfDay(addDays(now, 3))
  const weekEnd = endOfDay(addDays(now, 7))
  const weekAgo = startOfDay(addDays(now, -7))

  const active = tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED')
  const done = tasks.filter((task) => task.status === 'DONE')

  const overdue = []
  const today = []
  const threeDays = []
  const week = []
  const later = []

  for (const task of active) {
    const deadline = parseDate(task.deadline)
    if (deadline && deadline < now) overdue.push(task)
    else if (deadline && deadline <= todayEnd) today.push(task)
    else if (deadline && deadline <= threeDaysEnd) threeDays.push(task)
    else if (deadline && deadline <= weekEnd) week.push(task)
    else later.push(task)
  }

  const recentDone = done.filter((task) => {
    const completedAt = parseDate(task.completedAt)
    if (completedAt) return completedAt >= weekAgo
    const deadline = parseDate(task.deadline)
    return !deadline || deadline >= weekAgo
  })

  return [
    { id: 'overdue', title: '마감기한 지난 일', tone: 'border-red-300 bg-red-50', tasks: sortTasks(overdue, 'deadline') },
    { id: 'today', title: '오늘 할 일', tone: 'border-primary/40 bg-white', tasks: sortTasks(today, sortMode) },
    { id: 'three', title: '3일 내로 할 일', tone: 'border-secondary/30 bg-white', tasks: sortTasks(threeDays, sortMode) },
    { id: 'week', title: '일주일 내로 할 일', tone: 'border-yellow-300 bg-yellow-50/40', tasks: sortTasks(week, sortMode) },
    { id: 'later', title: '그 외', tone: 'border-dark/10 bg-white', tasks: sortTasks(later, sortMode) },
    { id: 'done', title: '완료된 일 (최근 일주일)', tone: 'border-dark/10 bg-dark/5', tasks: sortTasks(recentDone, sortMode) },
  ]
}

function TaskRow({ task, onEdit, onToggle }) {
  const category = getCategory(task.category)
  const isDone = task.status === 'DONE'

  return (
    <div className={`rounded-lg border-2 border-dark/10 bg-white p-3 ${isDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border-2 border-dark ${
            isDone ? 'bg-dark text-white' : 'bg-white hover:bg-primary'
          }`}
          aria-label={isDone ? '완료 취소' : '완료'}
        >
          {isDone && <span className="block text-[10px] font-black leading-4">V</span>}
        </button>

        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${category.color}`}>
              {category.emoji} {category.label}
            </span>
            <span className="rounded-full border border-dark/10 bg-accent px-2 py-0.5 text-[10px] font-black text-dark/60">
              {formatPriority(task)}
            </span>
            {task.parentTaskId && (
              <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] font-black text-secondary">
                서브
              </span>
            )}
          </div>
          <p className={`truncate text-sm font-black text-dark ${isDone ? 'line-through' : ''}`}>{task.title}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-dark/50">
            {formatDeadline(task.deadline)}
            {task.estimatedMinutes ? ` · ${task.estimatedMinutes}분` : ''}
          </p>
        </button>
      </div>
    </div>
  )
}

export default function TaskBoardModal({ tasks, onClose, onEditTask, onToggleTask }) {
  const [sortMode, setSortMode] = useState('priority')
  const sections = useMemo(() => buildSections(tasks, sortMode), [tasks, sortMode])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-dark/40 px-3 py-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-lg border-2 border-dark bg-accent shadow-kitschy max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b-2 border-dark bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="heading-kitschy text-xl">할 일 크게 보기</h2>
            <p className="mt-1 text-xs font-semibold text-dark/50">마감 구간별로 나눠서 전체 흐름을 볼 수 있어요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border-2 border-dark bg-white p-1">
              {[
                ['priority', '중요도순'],
                ['deadline', '마감순'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortMode(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
                    sortMode === value ? 'bg-primary text-white' : 'text-dark/60 hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-lg border-2 border-dark bg-white text-sm font-black text-dark hover:bg-primary hover:text-white"
            >
              X
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <section key={section.id} className={`rounded-lg border-2 p-3 ${section.tone}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-dark">{section.title}</h3>
                  <span className="rounded-full border border-dark/10 bg-white px-2 py-0.5 text-[10px] font-black text-dark/50">
                    {section.tasks.length}
                  </span>
                </div>
                {section.tasks.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-dark/10 bg-white/70 px-3 py-6 text-center">
                    <p className="text-xs font-bold text-dark/35">비어 있어요.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.tasks.map((task) => (
                      <TaskRow
                        key={task.taskId}
                        task={task}
                        onEdit={onEditTask}
                        onToggle={onToggleTask}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
