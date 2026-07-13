import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCategory } from '../constants/categories'
import { parseDate, formatDeadline } from '../utils/dates'

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

function buildSections(sections, sortMode) {
  return [
    { id: 'overdue', title: '마감 지남', tone: 'tone-overdue', tasks: sortTasks(sections.overdue || [], 'deadline') },
    { id: 'today', title: '오늘', tone: 'tone-today', tasks: sortTasks(sections.today || [], sortMode) },
    { id: 'tomorrow', title: '내일', tone: 'tone-soon', tasks: sortTasks(sections.tomorrow || [], sortMode) },
    { id: 'week', title: '일주일 내', tone: 'tone-chip', tasks: sortTasks(sections.next7Days || [], sortMode) },
    { id: 'later', title: '그 외', tone: 'tone-later', tasks: sortTasks(sections.later || [], sortMode) },
    { id: 'someday', title: '언젠가', tone: 'tone-later', tasks: sortTasks(sections.someday || [], sortMode) },
    { id: 'done', title: '완료 (최근 3일)', tone: 'tone-done', tasks: sortTasks(sections.recentDone || [], sortMode) },
  ]
}

function TaskRow({ task, onEdit, onToggle }) {
  const category = getCategory(task.category)
  const isDone = task.status === 'DONE'

  return (
    <div className={`rounded-lg border-2 border-line bg-card p-3 ${isDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-edge ${
            isDone ? 'bg-chip text-dark' : 'bg-card hover:bg-primary'
          }`}
          aria-label={isDone ? '완료 취소' : '완료'}
        >
          {isDone && <span className="block text-[0.625rem] font-black leading-4">V</span>}
        </button>

        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[0.625rem] font-bold ${category.color}`}>
              {category.emoji} {category.label}
            </span>
            <span className="rounded-full border border-line bg-accent px-2 py-0.5 text-[0.625rem] font-black text-sub">
              {formatPriority(task)}
            </span>
            {task.parentTaskId && (
              <span className="rounded-full border border-line bg-chip px-2 py-0.5 text-[0.625rem] font-black text-secondary">
                서브
              </span>
            )}
          </div>
          <p className={`truncate text-sm font-black text-dark ${isDone ? 'line-through' : ''}`}>{task.title}</p>
          <p className="mt-0.5 truncate text-[0.6875rem] font-semibold text-sub">
            {formatDeadline(task.deadline) || '마감 없음'}
            {task.estimatedMinutes ? ` · ${task.estimatedMinutes}분` : ''}
          </p>
        </button>
      </div>
    </div>
  )
}

export default function TaskBoardModal({ sections: planningSections, onClose, onEditTask, onToggleTask }) {
  const [sortMode, setSortMode] = useState('priority')
  const sections = useMemo(
    () => buildSections(planningSections || {}, sortMode),
    [planningSections, sortMode]
  )

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overlay-retro px-3 py-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-2xl card-retro p-0 bg-accent max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-line bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-dungeon text-dark text-xl">할 일 크게 보기</h2>
            <p className="mt-1 text-xs font-semibold text-sub">마감 구간별로 나눠서 전체 흐름을 볼 수 있어요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-card p-1">
              {[
                ['priority', '중요도순'],
                ['deadline', '마감순'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortMode(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
                    sortMode === value ? 'bg-primary text-on-accent' : 'text-sub hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-lg border border-line bg-card text-sm font-black text-dark hover:bg-chip hover:text-dark"
            >
              X
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-4">
          <div className="grid auto-rows-[17rem] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <section key={section.id} className={`flex min-h-0 flex-col rounded-lg border-2 p-3 ${section.tone}`}>
                <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-2">
                  <h3 className="font-galmuri font-bold text-sm text-dark">{section.title}</h3>
                  <span className="rounded-full border border-line bg-card px-2 py-0.5 text-[0.625rem] font-black text-sub">
                    {section.tasks.length}
                  </span>
                </div>
                {section.tasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-line bg-card px-3 py-6 text-center">
                    <p className="text-xs font-bold text-sub">비어 있어요.</p>
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
