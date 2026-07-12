import { useMemo, useState } from 'react'
import { getCategory } from '../../constants/categories'
import { calcCompletionCoins } from '../../utils/taskRewards'
import { parseDate, formatDeadline, formatTime, isToday } from '../../utils/dates'
import { STICKER_SPRITES } from '../../shop/registry'
import StickerPicker from '../StickerPicker'
import coinImage from '../../assets/coin_image.png'

const TABS = [
  { id: 'today', label: '오늘' },
  { id: 'tomorrow', label: '내일' },
  { id: 'week', label: '일주일' },
  { id: 'all', label: '전부' },
]

const ALL_TAB_SECTIONS = [
  { key: 'today', title: '오늘' },
  { key: 'tomorrow', title: '내일' },
  { key: 'next7Days', title: '일주일 내' },
  { key: 'later', title: '그 외' },
  { key: 'someday', title: '언젠가' },
]

const ACTIVE_KEYS = ['overdue', 'today', 'tomorrow', 'next7Days', 'later', 'someday']

/** 부모 태스크 바로 뒤에 자식이 오도록 재배열 */
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

function sortByDeadline(list) {
  return [...list].sort((a, b) => {
    const ad = parseDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bd = parseDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return ad - bd
  })
}

function StickerBadge({ stickerCode }) {
  const sprite = stickerCode ? STICKER_SPRITES[stickerCode] : null
  if (!sprite) return null
  return (
    <img
      src={sprite.img}
      alt={sprite.name}
      title={sprite.name}
      className="h-4 w-4 flex-shrink-0 object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function TaskRow({ task, overdue = false, onToggle, onEdit, onStickerChange }) {
  const cat = getCategory(task.category)
  const isChild = !!task.parentTaskId
  const coins = calcCompletionCoins(task)
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
        overdue ? 'tone-overdue' : 'border-line hover:border-edge'
      } ${isChild ? 'ml-6 border-l-4 border-l-secondary' : ''}`}
    >
      <button
        onClick={(e) => onToggle(task, e)}
        aria-label="완료 처리"
        className="mt-0.5 w-5 h-5 rounded bg-card flex-shrink-0 hover:bg-primary transition-colors"
        style={{ border: '1.5px solid var(--edge)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {overdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary text-on-accent border-primary">
              마감 지남
            </span>
          )}
          {task.status === 'IN_PROGRESS' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-secondary border-secondary text-on-accent">
              진행 중
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
            {cat.emoji} {cat.label}
          </span>
          {isChild && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-chip border border-line rounded-full text-secondary">
              ↳ 서브
            </span>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <p className="font-galmuri galmuri-semibold text-dark text-sm truncate">{task.title}</p>
          <StickerBadge stickerCode={task.stickerCode} />
        </div>
        <p className="text-[10px] text-sub font-medium mt-0.5">
          {task.deadline && `마감 ${formatDeadline(task.deadline)}`}
          {task.estimatedMinutes && ` · ${task.estimatedMinutes}분`}
          {task.effectivePriority != null && ` · P ${Math.round(task.effectivePriority * 100)}`}
          {coins > 0 && (
            <>
              {' · '}
              <img src={coinImage} alt="코인" className="inline-block w-3 h-3 object-contain align-text-bottom" />
              <span className="font-bold text-dark">{` +${coins}`}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StickerPicker current={task.stickerCode} onSelect={(code) => onStickerChange(task, code)} />
        <button
          onClick={() => onEdit(task)}
          className="mt-0.5 text-xs font-bold text-sub hover:text-primary transition-colors"
        >
          수정
        </button>
      </div>
    </div>
  )
}

function DoneRow({ task, onToggle, onEdit }) {
  const coins = calcCompletionCoins(task)
  const doneAt = formatTime(task.completedAt)
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-line opacity-60">
      <button
        onClick={() => onToggle(task)}
        aria-label="완료 취소"
        className="w-5 h-5 rounded bg-primary flex-shrink-0 flex items-center justify-center"
        style={{ border: '1.5px solid var(--accent)' }}
      >
        <span className="text-on-accent text-[10px] font-bold">V</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="font-galmuri galmuri-semibold text-dark text-sm line-through truncate">{task.title}</p>
          <StickerBadge stickerCode={task.stickerCode} />
        </div>
        <p className="text-[10px] text-sub font-medium">
          {doneAt && `${doneAt} 완료`}
          {coins > 0 && (
            <>
              {' · '}
              <img src={coinImage} alt="코인" className="inline-block w-3 h-3 object-contain align-text-bottom" />
              <span className="font-bold">{` +${coins}`}</span>
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => onEdit(task)}
        className="text-xs font-bold text-sub hover:text-primary transition-colors flex-shrink-0"
      >
        수정
      </button>
    </div>
  )
}

export default function TaskListCard({ sections, onToggle, onEdit, onStickerChange }) {
  const [tab, setTab] = useState('today')
  const [doneOpen, setDoneOpen] = useState(false)

  const overdue = useMemo(() => groupByParent(sections?.overdue || []), [sections])

  const activeCount = useMemo(
    () => ACTIVE_KEYS.reduce((sum, key) => sum + (sections?.[key]?.length || 0), 0),
    [sections]
  )

  const tabTasks = useMemo(() => {
    if (!sections || tab === 'all') return []
    if (tab === 'today') return groupByParent(sections.today || [])
    if (tab === 'tomorrow') return groupByParent(sections.tomorrow || [])
    return groupByParent(sortByDeadline([
      ...(sections.today || []),
      ...(sections.tomorrow || []),
      ...(sections.next7Days || []),
    ]))
  }, [sections, tab])

  const todayDoneTasks = useMemo(
    () => (sections?.recentDone || []).filter((t) => t.status === 'DONE' && isToday(t.completedAt)),
    [sections]
  )

  const isEmpty = tab === 'all'
    ? activeCount === 0
    : overdue.length === 0 && tabTasks.length === 0

  return (
    <div className="card-retro">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="font-galmuri font-bold text-dark">해야 할 일 ({activeCount})</h3>
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-2.5 py-1 text-xs font-black transition-colors ${
                tab === id ? 'bg-primary text-on-accent' : 'text-sub hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {overdue.map((task) => (
          <TaskRow key={task.taskId} task={task} overdue onToggle={onToggle} onEdit={onEdit} onStickerChange={onStickerChange} />
        ))}

        {tab !== 'all' && tabTasks.map((task) => (
          <TaskRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} onStickerChange={onStickerChange} />
        ))}

        {tab === 'all' && ALL_TAB_SECTIONS.map(({ key, title }) => {
          const list = groupByParent(sections?.[key] || [])
          if (list.length === 0) return null
          return (
            <div key={key}>
              <p className="label-retro mt-3 mb-2">{title} ({list.length})</p>
              <div className="space-y-2">
                {list.map((task) => (
                  <TaskRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} onStickerChange={onStickerChange} />
                ))}
              </div>
            </div>
          )
        })}

        {isEmpty && (
          <div className="text-center py-8">
            <p className="font-extrabold text-dark text-base">
              {activeCount > 0
                ? '이 탭엔 할 일이 없어요'
                : (sections?.recentDone?.length ? '모든 할 일 완료!' : '아직 할 일이 없어요!')}
            </p>
            <p className="text-xs text-sub mt-2">브레인 덤프나 직접 추가로 시작해보세요</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDoneOpen((prev) => !prev)}
        className="mt-4 flex w-full items-center gap-2 rounded-lg border-2 border-line bg-card px-3 py-2 text-left text-xs font-bold text-sub hover:border-edge transition-colors"
      >
        <span>{doneOpen ? '▾' : '▸'}</span>
        <span>오늘 완료한 일 ({todayDoneTasks.length})</span>
      </button>
      {doneOpen && (
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
          {todayDoneTasks.length === 0 ? (
            <p className="py-4 text-center text-xs font-bold text-sub">아직 오늘 완료한 일이 없어요</p>
          ) : (
            todayDoneTasks.map((task) => (
              <DoneRow key={task.taskId} task={task} onToggle={onToggle} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
