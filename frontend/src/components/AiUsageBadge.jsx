function formatReset(resetAt) {
  if (!resetAt) return '매일 자정'
  const date = new Date(resetAt)
  if (Number.isNaN(date.getTime())) return '매일 자정'
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AiUsageBadge({ usage, cost = 1 }) {
  if (!usage) {
    return (
      <p className="text-[11px] font-semibold text-dark/40">
        AI 사용량은 매일 자정에 초기화돼요.
      </p>
    )
  }

  const exhausted = usage.remaining < cost

  return (
    <div className="rounded-lg border-2 border-dark/10 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-black text-dark/50">AI 사용량</span>
        <span className={`text-xs font-black ${exhausted ? 'text-primary' : 'text-dark'}`}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-dark/45">
        이 작업은 {cost}점을 사용해요. {formatReset(usage.resetAt)} 초기화.
      </p>
      {exhausted && (
        <p className="mt-1 text-[10px] font-bold text-primary">
          오늘 AI 사용량을 모두 사용했어요. 내일 다시 시도해주세요.
        </p>
      )}
    </div>
  )
}
