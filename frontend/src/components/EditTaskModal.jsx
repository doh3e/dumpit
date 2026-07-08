import { useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import { CATEGORIES } from '../constants/categories'
import SubtaskProposalModal from './SubtaskProposalModal'
import AiUsageBadge from './AiUsageBadge'
import { EstimatedMinutesField, TaskDateTimeField } from './TaskTimeInputs'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'

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
  const [saving, setSaving] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (deadline && deadline !== initialDeadline && new Date(deadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (startTime && deadline && new Date(deadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        estimatedMinutes: useEstimatedMinutes && estimatedMinutes ? parseInt(estimatedMinutes) : null,
        userPriorityScore: priorityScore,
        category,
        startTime: useStartTime ? (startTime || null) : null,
      }
      payload.isLocked = Boolean(useStartTime && startTime)
      const res = await api.patch(`/tasks/${task.taskId}`, payload)
      onUpdated(res.data)
    } catch (err) {
      alert(getApiErrorMessage(err, '수정에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }

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
          <TaskDateTimeField
            label="마감 시간 (비워두면 AI가 자동 설정)"
            value={deadline}
            min={!deadline || new Date(deadline) > new Date() ? getMinDeadlineInput() : undefined}
            defaultTimeWhenEmpty="23:59"
            onChange={(e) => setDeadline(e.target.value)}
            onClear={() => setDeadline('')}
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
                onClick={() => setPriorityScore(task.aiPriorityScore ?? 0.5)}
                className="ml-2 text-[10px] text-primary underline"
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
            onChange={(e) => setPriorityScore(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-sub font-bold mt-1">
            <span>낮음</span>
            <span>보통</span>
            <span>높음</span>
          </div>
          <button
            type="button"
            disabled={reanalyzing || !aiUsage.hasEnough(1)}
            onClick={async () => {
              setReanalyzing(true)
              try {
                const res = await api.post(`/tasks/${task.taskId}/reanalyze`)
                setPriorityScore(res.data.aiPriorityScore ?? 0.5)
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
