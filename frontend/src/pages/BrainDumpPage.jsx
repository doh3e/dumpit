import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getApiErrorMessage } from '../services/api'
import AiUsageBadge from '../components/AiUsageBadge'
import BrainDumpTaskEditor from '../components/BrainDumpTaskEditor'
import Dialog from '../components/Dialog'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'
import { useAuth } from '../hooks/useAuth'
import { clearDraft, readDraft, writeDraft } from '../services/brainDumpDraft'
import { notifyToast } from '../services/notifyToast'
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
  const { user } = useAuth()
  const accountKey = user?.email ?? null
  return <AccountBrainDumpPage key={accountKey ?? 'anonymous'} accountKey={accountKey} />
}

function AccountBrainDumpPage({ accountKey }) {
  const aiUsage = useAiUsage()
  const [initialDraft] = useState(() => {
    if (!accountKey) return { rawText: '', status: 'idle' }
    try {
      const draft = readDraft(accountKey)
      return { rawText: draft?.rawText ?? '', status: draft ? 'saved' : 'idle' }
    } catch {
      return { rawText: '', status: 'error' }
    }
  })
  const [text, setText] = useState(initialDraft.rawText)
  const [draftStatus, setDraftStatus] = useState(initialDraft.status)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [focusRestoreIndex, setFocusRestoreIndex] = useState(null)
  const [resultFocusGeneration, setResultFocusGeneration] = useState(0)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const navigate = useNavigate()
  const resultHeadingRef = useRef(null)
  const editButtonRefs = useRef(new Map())
  const analyzePendingRef = useRef(false)
  const confirmPendingRef = useRef(false)
  const confirmGenerationRef = useRef(0)
  const writeGenerationRef = useRef(0)
  const mountedRef = useRef(true)
  const isBusy = isAnalyzing || isSaving
  const resultTasks = result?.tasks ?? []
  const selectedCount = selected.filter(Boolean).length

  useEffect(() => {
    if (resultFocusGeneration > 0) resultHeadingRef.current?.focus()
  }, [resultFocusGeneration])

  useEffect(() => {
    if (editingIndex == null && focusRestoreIndex != null) {
      editButtonRefs.current.get(focusRestoreIndex)?.focus()
      setFocusRestoreIndex(null)
    }
  }, [editingIndex, focusRestoreIndex])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      confirmGenerationRef.current += 1
    }
  }, [])

  const handleTextChange = (event) => {
    if (!mountedRef.current || !accountKey || confirmPendingRef.current) return
    const nextText = event.target.value
    const writeGeneration = ++writeGenerationRef.current
    setText(nextText)
    setDraftStatus('saving')
    try {
      writeDraft(accountKey, nextText)
      if (mountedRef.current && writeGenerationRef.current === writeGeneration) {
        setDraftStatus(nextText ? 'saved' : 'idle')
      }
    } catch {
      if (mountedRef.current && writeGenerationRef.current === writeGeneration) {
        setDraftStatus('error')
      }
    }
  }

  const handleAnalyze = async () => {
    if (isBusy || editingIndex != null || analyzePendingRef.current || !text.trim() || !aiUsage.hasEnough(5)) return
    if (!accountKey) return
    analyzePendingRef.current = true
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await api.post('/brain-dump', { rawText: text.trim() })
      if (!mountedRef.current) return
      const tasks = Array.isArray(response.data.tasks) ? response.data.tasks : []
      setResult({ ...response.data, tasks })
      setSelected(tasks.map(() => true))
      setEditingIndex(null)
      setFocusRestoreIndex(null)
      setResultFocusGeneration((generation) => generation + 1)
      announce(`분석이 끝났어요. 후보 ${tasks.length}개`)
      dispatchAiUsed()
    } catch (requestError) {
      if (!mountedRef.current) return
      setError(getApiErrorMessage(requestError, 'AI 분석에 실패했어요. 다시 시도해주세요.'))
    } finally {
      if (mountedRef.current) {
        analyzePendingRef.current = false
        setIsAnalyzing(false)
      }
    }
  }

  const handleClear = () => {
    if (isBusy || editingIndex != null) return
    setShowClearDialog(true)
  }

  const confirmClear = () => {
    if (!mountedRef.current || !accountKey) return
    writeGenerationRef.current += 1
    try {
      clearDraft(accountKey)
      if (!mountedRef.current) return
      setText('')
      setResult(null)
      setError(null)
      setSelected([])
      setEditingIndex(null)
      setFocusRestoreIndex(null)
      setDraftStatus('idle')
    } catch {
      if (mountedRef.current) {
        setDraftStatus('error')
        setError('원문 초안을 지우지 못했어요. 다시 시도해주세요.')
      }
    } finally {
      if (mountedRef.current) setShowClearDialog(false)
    }
  }

  const toggleAll = (value) => {
    if (isBusy || editingIndex != null) return
    setSelected(resultTasks.map(() => value))
  }

  const handleConfirm = async () => {
    if (isBusy || editingIndex != null || confirmPendingRef.current || !result || resultTasks.length === 0 || selectedCount === 0) return
    if (!accountKey) return
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

    const confirmGeneration = ++confirmGenerationRef.current
    const isCurrentConfirm = () => (
      mountedRef.current && confirmGenerationRef.current === confirmGeneration
    )
    confirmPendingRef.current = true
    setIsSaving(true)
    setError(null)
    try {
      await api.post(`/brain-dump/${result.dumpId}/confirm`, { tasks })
    } catch (requestError) {
      if (!isCurrentConfirm()) return
      setError(getApiErrorMessage(requestError, '태스크 등록에 실패했어요.'))
      confirmPendingRef.current = false
      setIsSaving(false)
      return
    }

    if (!isCurrentConfirm()) return
    try {
      clearDraft(accountKey)
    } catch {
      if (isCurrentConfirm()) {
        notifyToast('할 일은 등록했지만 원문 초안을 지우지 못했어요.')
      }
    }
    if (!isCurrentConfirm()) return
    writeGenerationRef.current += 1
    navigate('/dashboard')
  }

  const closeEditor = (index) => {
    setEditingIndex(null)
    setFocusRestoreIndex(index)
  }

  const applyTaskEdit = (index, fields) => {
    setResult((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) => (
        taskIndex === index ? { ...task, ...fields } : task
      )),
    }))
    closeEditor(index)
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
          onChange={handleTextChange}
          disabled={isSaving}
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
              disabled={isBusy || editingIndex != null}
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
        <div className="space-y-1" aria-live="polite">
          <p className="text-xs font-semibold text-dark" role="status">
            {draftStatus === 'saving' && '저장 중...'}
            {draftStatus === 'saved' && '원문 초안 저장됨'}
            {draftStatus === 'error' && '이 기기에 저장하지 못했어요'}
            {draftStatus === 'idle' && '원문 초안 · 입력하면 이 기기에 저장돼요'}
          </p>
          <p className="text-xs font-semibold text-sub">
            원문 초안은 같은 기기의 현재 브라우저/앱에서 계정별로 마지막 수정부터 7일간 복구돼요.
          </p>
          <details className="text-xs font-semibold text-sub">
            <summary className="btn-refined btn-refined-text !min-h-11 !w-full cursor-pointer !justify-start !px-3 text-xs">
              초안 저장 범위 자세히
            </summary>
            <p className="px-3 pb-2 leading-relaxed">
              웹·데스크톱·Android 사이에는 동기화되지 않아요. 화면 이동·새로고침·자동 세션 만료에는 남아 있어요. 지우기·등록 완료·직접 로그아웃·탈퇴 때 이 브라우저/앱 초안이 삭제돼요.
            </p>
          </details>
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
                disabled={isBusy || editingIndex != null || resultTasks.length === 0}
                className="btn-refined btn-refined-text"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                disabled={isBusy || editingIndex != null || resultTasks.length === 0}
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
                  <li key={`${result.dumpId}-${index}`} className="result-row-refined brain-dump-result-row">
                    <div className="flex items-start gap-2">
                      <label htmlFor={checkboxId} className="brain-dump-result-label min-w-0 flex-1">
                        <span className="brain-dump-checkbox-target">
                          <input
                            id={checkboxId}
                            type="checkbox"
                            aria-label={`${item.title} 선택`}
                            checked={isChecked}
                            disabled={isBusy || editingIndex != null}
                            onChange={(event) => {
                              const checked = event.target.checked
                              setSelected((previous) => previous.map(
                                (value, itemIndex) => itemIndex === index ? checked : value,
                              ))
                            }}
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
                      <button
                        ref={(node) => {
                          if (node) editButtonRefs.current.set(index, node)
                          else editButtonRefs.current.delete(index)
                        }}
                        type="button"
                        aria-label={`${item.title} 수정`}
                        aria-expanded={editingIndex === index}
                        onClick={() => setEditingIndex(index)}
                        disabled={isBusy || editingIndex != null}
                        className="btn-refined btn-refined-text mr-3 mt-3 shrink-0"
                      >
                        수정
                      </button>
                    </div>
                    {editingIndex === index && (
                      <div className="px-4 pb-4">
                        <BrainDumpTaskEditor
                          task={item}
                          onApply={(fields) => applyTaskEdit(index, fields)}
                          onCancel={() => closeEditor(index)}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="brain-dump-result-actions">
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy || editingIndex != null}
              className="btn-refined btn-refined-text"
            >
              새로 작성
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!text.trim() || isBusy || editingIndex != null || !aiUsage.hasEnough(5)}
              className="btn-refined"
            >
              {isAnalyzing ? '분석 중...' : '다시 분석'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy || editingIndex != null || selectedCount === 0 || resultTasks.length === 0}
              className="btn-refined btn-refined-primary brain-dump-primary-action"
            >
              {isSaving ? '추가 중...' : `선택한 ${selectedCount}개 추가`}
            </button>
          </div>
        </section>
      )}

      {showClearDialog && (
        <Dialog
          onClose={() => setShowClearDialog(false)}
          title="원문과 결과 지우기"
          className="w-full max-w-md p-5"
          variant="refined"
        >
          <h2 className="font-galmuri text-xl font-bold text-dark">원문과 결과 지우기</h2>
          <p className="mt-3 text-sm font-semibold text-sub">
            원문과 AI 분석 결과가 모두 사라져요. 지울까요?
          </p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setShowClearDialog(false)} className="btn-refined flex-1">
              취소
            </button>
            <button type="button" onClick={confirmClear} className="btn-refined btn-refined-danger flex-1">
              지우기
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
