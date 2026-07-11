import OrbitProgress from '../OrbitProgress'
import { formatDeadline, formatTime, isToday } from '../../utils/dates'

const QUEUE_BUCKET_LABEL = {
  OVERDUE: '마감 지남',
  TODAY: '오늘',
  TOMORROW: '내일',
  NEXT_7_DAYS: '일주일 내',
  LATER: '그 외',
  SOMEDAY: '언젠가',
}

export default function NowHeroCard({
  nowSuggestion,
  queue = [],
  todayDone,
  todayTotal,
  allDone,
  onComplete,
  onEdit,
}) {
  const task = allDone ? null : nowSuggestion?.task || null
  const heroTime = task
    ? (isToday(task.deadline) ? formatTime(task.deadline) : formatDeadline(task.deadline))
    : null

  return (
    <div className="card-retro-hero p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="label-retro mb-2">지금 할 일</p>
          {allDone ? (
            <>
              <p className="font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark">
                오늘 다 비웠어요 🚀
              </p>
              <p className="text-xs text-sub mt-1">머릿속이 가벼워졌네요. 내일 또 만나요.</p>
            </>
          ) : task ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="block max-w-full truncate text-left font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark hover:text-primary transition-colors"
                title={task.title}
              >
                {task.title}
              </button>
              {heroTime && (
                <p className="font-dungeon text-[19px] text-primary mt-1">{heroTime} 마감</p>
              )}
              <p className="text-xs text-sub mt-1">{nowSuggestion.message}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={(e) => onComplete(task, e)} className="btn-retro-primary text-xs">
                  완료하기
                </button>
                <button type="button" onClick={() => onEdit(task)} className="btn-retro text-xs">
                  수정
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-galmuri font-bold text-[24px] max-sm:text-[19px] leading-tight text-dark">
                {nowSuggestion?.title || '지금은 비어 있는 시간이에요.'}
              </p>
              <p className="text-xs text-sub mt-1">
                {nowSuggestion?.message || '가벼운 일부터 하나 시작해볼까요?'}
              </p>
            </>
          )}
        </div>
        <OrbitProgress done={todayDone} total={todayTotal} />
      </div>

      {!allDone && queue.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[10px] font-bold text-sub mb-2">다음에 할 일</p>
          <div className="flex flex-wrap gap-2">
            {queue.map((recommendation) => (
              <button
                key={recommendation.task.taskId}
                type="button"
                onClick={() => onEdit(recommendation.task)}
                className="flex items-center gap-2 rounded-lg border-2 border-line bg-card px-3 py-1.5 text-left hover:border-edge transition-colors"
              >
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-line bg-chip text-sub flex-shrink-0">
                  {QUEUE_BUCKET_LABEL[recommendation.bucket] || '추천'}
                </span>
                <span className="text-xs font-extrabold text-dark truncate max-w-[180px]">
                  {recommendation.task.title}
                </span>
                {formatTime(recommendation.task.deadline) && (
                  <span className="text-[10px] font-bold text-sub flex-shrink-0">
                    {formatTime(recommendation.task.deadline)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
