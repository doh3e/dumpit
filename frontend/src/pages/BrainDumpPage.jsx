import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getApiErrorMessage } from '../services/api'
import AiUsageBadge from '../components/AiUsageBadge'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'
import { announce } from '../utils/announce'

const PLACEHOLDER = `예) 내일까지 기획서 초안 써야 하고, 이번 주 금요일 팀 발표 준비도 해야 해. 오늘 점심 약속 있고 오후엔 헬스장도 가야 함. 아, 이메일 답장도 밀려있어...`

const PRIORITY_COLOR = {
  높음: 'bg-primary text-on-accent border-primary',
  중간: 'bg-warn text-on-warn border-warn',
  낮음: 'bg-chip text-dark border-line',
}

function getPriorityLabel(score) {
  if (score >= 0.7) return '높음'
  if (score >= 0.4) return '중간'
  return '낮음'
}

function formatDeadline(value) {
  if (!value) return null
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BrainDumpPage() {
  const aiUsage = useAiUsage()
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()
  const resultHeadingRef = useRef(null)
  const isBusy = isAnalyzing || isSaving
  const resultTasks = result?.tasks ?? []
  const selectedCount = selected.filter(Boolean).length

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus()
  }, [result])

  const handleAnalyze = async () => {
    if (isBusy || !text.trim() || !aiUsage.hasEnough(5)) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await api.post('/brain-dump', { rawText: text.trim() })
      const tasks = Array.isArray(response.data.tasks) ? response.data.tasks : []
      setResult({ ...response.data, tasks })
      setSelected(tasks.map(() => true))
      announce(`분석이 끝났어요. 후보 ${tasks.length}개`)
      dispatchAiUsed()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'AI 분석에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClear = () => {
    if (isBusy) return
    setText('')
    setResult(null)
    setError(null)
    setSelected([])
  }

  const toggleAll = (value) => {
    if (isBusy) return
    setSelected(resultTasks.map(() => value))
  }

  const handleConfirm = async () => {
    if (isBusy || !result || resultTasks.length === 0 || selectedCount === 0) return
    const tasks = resultTasks
      .filter((_, index) => selected[index])
      .map((task) => ({
        title: task.title,
        description: task.description || null,
        priorityScore: task.aiPriorityScore ?? 0.5,
        category: task.category || 'OTHER',
        deadline: task.deadline || null,
        estimatedMinutes: task.estimatedMinutes || null,
      }))

    setIsSaving(true)
    setError(null)
    try {
      await api.post(`/brain-dump/${result.dumpId}/confirm`, { tasks })
      navigate('/dashboard')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, '태스크 등록에 실패했어요.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="brain-dump-page mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-galmuri text-2xl font-bold text-dark">브레인 덤프</h1>
        <p className="mt-2 text-sm font-semibold text-sub">
          머릿속에 있는 할 일을 형식 없이 적어보세요. AI가 실행할 수 있는 목록으로 정리해요.
        </p>
      </header>

      <section className="surface-refined brain-dump-input-surface" aria-label="브레인 덤프 작성">
        <textarea
          aria-label="브레인 덤프 입력"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          maxLength={3000}
          className="input-refined brain-dump-textarea"
        />
        <div className="brain-dump-input-footer">
          <span className="text-xs font-semibold text-dark">{text.length} / 3000자</span>
          <div className="brain-dump-input-actions">
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy}
              className="btn-refined btn-refined-text"
            >
              지우기
            </button>
            {!result && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!text.trim() || isBusy || !aiUsage.hasEnough(5)}
                className="btn-refined btn-refined-primary"
              >
                {isAnalyzing ? '분석 중...' : 'AI로 정리하기'}
              </button>
            )}
          </div>
        </div>
        <AiUsageBadge usage={aiUsage.usage} cost={5} variant="inline" />
      </section>

      {error && (
        <div className="brain-dump-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="brain-dump-results" aria-labelledby="brain-dump-results-heading">
          <div className="brain-dump-results-heading-row">
            <div>
              <h2
                id="brain-dump-results-heading"
                ref={resultHeadingRef}
                tabIndex={-1}
                className="font-galmuri text-xl font-bold text-dark"
              >
                정리한 할 일
              </h2>
              <p className="mt-1 text-sm font-semibold text-sub">
                추가할 항목을 확인하고 선택하세요.
              </p>
            </div>
            <div className="brain-dump-selection-actions" aria-label="결과 선택 조작">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                disabled={isBusy || resultTasks.length === 0}
                className="btn-refined btn-refined-text"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                disabled={isBusy || resultTasks.length === 0}
                className="btn-refined btn-refined-text"
              >
                전체 해제
              </button>
            </div>
          </div>

          {resultTasks.length === 0 ? (
            <p className="surface-refined brain-dump-empty text-sm font-semibold text-dark">
              정리할 수 있는 할 일을 찾지 못했어요.
            </p>
          ) : (
            <ul className="surface-refined brain-dump-result-list" aria-label="정리한 할 일 목록">
              {resultTasks.map((item, index) => {
                const priorityLabel = getPriorityLabel(item.aiPriorityScore ?? 0.5)
                const deadline = formatDeadline(item.deadline)
                const isChecked = selected[index] ?? true
                const checkboxId = `brain-dump-task-${index}`

                return (
                  <li key={`${item.title}-${index}`} className="result-row-refined brain-dump-result-row">
                    <label htmlFor={checkboxId} className="brain-dump-result-label">
                      <span className="brain-dump-checkbox-target">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          aria-label={`${item.title} 선택`}
                          checked={isChecked}
                          disabled={isBusy}
                          onChange={(event) => setSelected((previous) => previous.map(
                            (value, itemIndex) => itemIndex === index ? event.target.checked : value,
                          ))}
                          className="brain-dump-checkbox"
                        />
                      </span>
                      <span className="brain-dump-result-content">
                        <span className="brain-dump-result-title font-galmuri font-bold text-dark">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="brain-dump-result-description text-sm font-medium text-dark">
                            {item.description}
                          </span>
                        )}
                        <span className="brain-dump-result-meta">
                          <span className="brain-dump-meta-badge">
                            {deadline ? `마감: ${deadline}` : '기한 없음'}
                          </span>
                          {item.estimatedMinutes && (
                            <span className="brain-dump-meta-badge">예상 {item.estimatedMinutes}분</span>
                          )}
                        </span>
                      </span>
                      <span className={`brain-dump-priority ${PRIORITY_COLOR[priorityLabel]}`}>
                        우선순위 {priorityLabel}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="brain-dump-result-actions">
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy}
              className="btn-refined btn-refined-text"
            >
              새로 작성
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!text.trim() || isBusy || !aiUsage.hasEnough(5)}
              className="btn-refined"
            >
              {isAnalyzing ? '분석 중...' : '다시 분석'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy || selectedCount === 0 || resultTasks.length === 0}
              className="btn-refined btn-refined-primary brain-dump-primary-action"
            >
              {isSaving ? '추가 중...' : `선택한 ${selectedCount}개 추가`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
