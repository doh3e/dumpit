function formatReset(resetAt) {
  if (!resetAt) return '매일 자정'
  const date = new Date(resetAt)
  if (Number.isNaN(date.getTime())) return '매일 자정'
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AiUsageBadge({ usage, cost = 1, variant = 'card' }) {
  if (!usage) {
    return (
      <p className={variant === 'inline' ? 'ai-usage-inline text-xs font-semibold text-dark' : 'text-[0.6875rem] font-semibold text-sub'}>
        AI 사용량은 매일 자정에 초기화돼요.
      </p>
    )
  }

  const exhausted = usage.remaining < cost

  if (variant === 'inline') {
    return (
      <div className="ai-usage-inline" aria-label="AI 사용량 안내">
        <div className="ai-usage-inline-summary">
          <span>사용 {usage.used} / {usage.limit}</span>
          <span>잔여 {usage.remaining}점</span>
        </div>
        <p className="ai-usage-inline-help">
          이 작업은 {cost}점을 사용해요. {formatReset(usage.resetAt)} 초기화.
        </p>
        {exhausted && (
          <p className="ai-usage-inline-warning">
            이 작업에 필요한 AI 사용량이 부족해요. 초기화 후 다시 시도해주세요.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-line bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.6875rem] font-black text-sub">AI 사용량</span>
        <span className={`text-xs font-black ${exhausted ? 'text-primary' : 'text-dark'}`}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <p className="mt-1 text-[0.625rem] font-semibold text-sub">
        이 작업은 {cost}점을 사용해요. {formatReset(usage.resetAt)} 초기화.
      </p>
      {exhausted && (
        <p className="mt-1 text-[0.625rem] font-bold text-primary">
          이 작업에 필요한 AI 사용량이 부족해요. 초기화 후 다시 시도해주세요.
        </p>
      )}
    </div>
  )
}
