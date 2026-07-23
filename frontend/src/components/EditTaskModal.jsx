import { useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import { CATEGORIES } from '../constants/categories'
import SubtaskProposalModal from './SubtaskProposalModal'
import AiUsageBadge from './AiUsageBadge'
import { EstimatedMinutesField, TaskDateTimeField } from './TaskTimeInputs'
import DeadlineModeField, { getTodayDeadline } from './DeadlineModeField'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'
import { effectivePriority } from '../utils/priority'
import { buildPriorityPatch } from '../utils/priorityPatch'

const TASK_CATEGORIES = CATEGORIES.filter((category) => category.value !== 'ROUTINE')

function formatDateTimeInput(d) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getMinDeadlineInput() {
  return formatDateTimeInput(new Date())
}

export default function EditTaskModal({ task, onClose, onUpdated }) {
  const aiUsage = useAiUsage()
  const [showSplit, setShowSplit] = useState(false)
  const initialDeadline = task.deadline ? task.deadline.slice(0, 16) : ''
  const initialStartTime = task.startTime ? task.startTime.slice(0, 16) : ''
  const [title, setTitle] = useState(task.title || '')
  const [description, setDescription] = useState(task.description || '')
  const [deadline, setDeadline] = useState(initialDeadline)
  const [deadlineMode, setDeadlineMode] = useState(task.deadline ? 'CUSTOM' : 'NONE')
  const [useStartTime, setUseStartTime] = useState(!!initialStartTime)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [useEstimatedMinutes, setUseEstimatedMinutes] = useState(task.estimatedMinutes != null)
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimatedMinutes ?? ''
  )
  const [priorityScore, setPriorityScore] = useState(
    task.userPriorityScore ?? task.aiPriorityScore ?? 0.5
  )
  const [category, setCategory] = useState(task.category || 'OTHER')
  const isUserOverridden = task.userPriorityScore != null
  // 슬라이더를 실제로 움직였을 때만 지정값을 저장한다 — 저장만으로 자동 조정이 꺼지는 함정 방지
  const [priorityDirty, setPriorityDirty] = useState(false)
  const [clearOverride, setClearOverride] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  const handleModeChange = (mode) => {
    setDeadlineMode(mode)
    if (mode === 'CUSTOM' && !deadline) setDeadline(getTodayDeadline())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (deadlineMode === 'CUSTOM' && !deadline) {
      alert('마감 시간을 입력하거나 다른 마감 옵션을 선택해주세요.')
      return
    }
    const effectiveDeadline =
      deadlineMode === 'CUSTOM' ? deadline
      : deadlineMode === 'TODAY' ? getTodayDeadline()
      : ''
    if (effectiveDeadline && effectiveDeadline !== initialDeadline && new Date(effectiveDeadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (startTime && effectiveDeadline && new Date(effectiveDeadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: effectiveDeadline || null,
        noDeadline: deadlineMode === 'NONE',
        estimatedMinutes: useEstimatedMinutes && estimatedMinutes ? parseInt(estimatedMinutes) : null,
        category,
        startTime: useStartTime ? (startTime || null) : null,
        ...buildPriorityPatch(priorityDirty, clearOverride, priorityScore),
      }
      // 원래 고정이었거나 사용자가 시작시간을 바꾼 경우만 고정 — 마감에서 파생된 슬롯이 편집 저장으로 잠기지 않게
      payload.isLocked = Boolean(useStartTime && startTime && (task.isLocked || startTime !== initialStartTime))
      const res = await api.patch(`/tasks/${task.taskId}`, payload)
      onUpdated(res.data)
    } catch (err) {
      alert(getApiErrorMessage(err, '수정에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }

  // 슬라이더(지정/AI 중요도)와 별개로, 저장 시 실제 적용될 실효값(마감 긴급도 반영)을 미리 보여준다
  const pinnedMode = !clearOverride && (priorityDirty || isUserOverridden)
  const hintDeadline =
    deadlineMode === 'CUSTOM' ? (deadline || null)
    : deadlineMode === 'TODAY' ? getTodayDeadline()
    : null
  const effectiveHint = effectivePriority({
    userPriorityScore: pinnedMode ? priorityScore : null,
    aiPriorityScore: priorityScore,
    deadline: hintDeadline,
  })

  const handleDelete = async () => {
    if (!confirm('정말 삭제할까요?')) return
    try {
      await api.delete(`/tasks/${task.taskId}`)
      onUpdated()
    } catch (err) {
      alert(getApiErrorMessage(err, '삭제에 실패했어요.'))
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 overlay-retro" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative card-retro w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto space-y-4"
      >
        <h3 className="font-dungeon text-dark text-xl">일정 수정</h3>

        <div>
          <label className="block text-xs font-bold text-sub mb-1">할 일 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 border border-line rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-sub mb-1">메모 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full px-3 py-2 border border-line rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="space-y-3">
          <DeadlineModeField
            mode={deadlineMode}
            onModeChange={handleModeChange}
            deadline={deadline}
            onDeadlineChange={(e) => setDeadline(e.target.value)}
            minDeadline={!deadline || new Date(deadline) > new Date() ? getMinDeadlineInput() : undefined}
          />

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-sub">
              <input
                type="checkbox"
                checked={useStartTime}
                onChange={(e) => setUseStartTime(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              시작 시간 입력
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-sub">
              <input
                type="checkbox"
                checked={useEstimatedMinutes}
                onChange={(e) => {
                  setUseEstimatedMinutes(e.target.checked)
                }}
                className="h-4 w-4 accent-primary"
              />
              예상 시간 직접 입력
            </label>
          </div>

          {useStartTime && (
            <TaskDateTimeField
              label="시작 시간 (선택)"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onClear={() => setStartTime('')}
            />
          )}

          {useEstimatedMinutes && (
            <EstimatedMinutesField
              label="예상 시간 (선택)"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-sub mb-1">카테고리</label>
          <div className="flex flex-wrap gap-1.5">
            {TASK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                  category === c.value
                    ? 'bg-primary text-on-accent border-edge'
                    : 'bg-accent text-dark border-line hover:border-edge'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-sub mb-1">
            중요도 ({Math.round(priorityScore * 100)}점)
            {isUserOverridden && (
              <button
                type="button"
                onClick={() => {
                  setPriorityScore(task.aiPriorityScore ?? 0.5)
                  setPriorityDirty(false)
                  setClearOverride(true)
                }}
                className="ml-2 text-[0.625rem] text-primary underline"
              >
                AI 점수로 초기화
              </button>
            )}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorityScore}
            onChange={(e) => {
              setPriorityScore(parseFloat(e.target.value))
              setPriorityDirty(true)
              setClearOverride(false)
            }}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[0.625rem] text-sub font-bold mt-1">
            <span>낮음</span>
            <span>보통</span>
            <span>높음</span>
          </div>
          <p className="text-[0.625rem] text-sub font-bold mt-1">
            마감 반영 실효 {Math.round(effectiveHint * 100)}점{pinnedMode ? ' · 지정값 기준' : ''}
          </p>
          <button
            type="button"
            disabled={reanalyzing || !aiUsage.hasEnough(1)}
            onClick={async () => {
              setReanalyzing(true)
              try {
                const res = await api.post(`/tasks/${task.taskId}/reanalyze`)
                setPriorityScore(res.data.aiPriorityScore ?? 0.5)
                setPriorityDirty(false) // 재분석 결과는 지정이 아니다 — 저장해도 pin되지 않게
                dispatchAiUsed()
              } catch (err) {
                alert(getApiErrorMessage(err, 'AI 재분석에 실패했어요.'))
              } finally {
                setReanalyzing(false)
              }
            }}
            className="mt-2 w-full text-xs font-bold text-primary border-2 border-primary rounded-lg py-1.5 hover:bg-chip transition-colors disabled:opacity-50"
          >
            {reanalyzing ? 'AI 분석 중...' : 'AI 우선순위 재분석'}
          </button>
          <div className="mt-2">
            <AiUsageBadge usage={aiUsage.usage} cost={1} />
          </div>
        </div>

        {!task.parentTaskId && (
          <button
            type="button"
            onClick={() => setShowSplit(true)}
            disabled={!aiUsage.hasEnough(3)}
            className="w-full text-xs font-bold text-secondary border-2 border-secondary rounded-lg py-2 hover:bg-chip transition-colors disabled:opacity-50"
          >
            ✂️ AI로 쪼개기 (3~5개 서브태스크)
          </button>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="btn-retro bg-primary text-on-accent text-sm py-2"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-retro flex-1 text-sm py-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="btn-retro flex-1 bg-secondary text-on-accent text-sm py-2 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {showSplit && (
        <SubtaskProposalModal
          task={task}
          onClose={() => setShowSplit(false)}
          onCreated={() => {
            setShowSplit(false)
            onUpdated()
          }}
        />
      )}
    </div>,
    document.body
  )
}
