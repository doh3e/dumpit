import { useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import { CATEGORIES } from '../constants/categories'
import AiUsageBadge from './AiUsageBadge'
import { EstimatedMinutesField, TaskDateTimeField } from './TaskTimeInputs'
import DeadlineModeField, { getTodayDeadline } from './DeadlineModeField'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'

const TASK_CATEGORIES = CATEGORIES.filter((category) => category.value !== 'ROUTINE')

function formatDateTimeInput(d) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getMinDeadlineInput() {
  return formatDateTimeInput(new Date())
}

function getDefaultStartTime() {
  const d = new Date()
  const m = d.getMinutes()
  if (m === 0) {
    // 정각이면 그대로
  } else if (m <= 30) {
    d.setMinutes(30, 0, 0)
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0)
  }
  return formatDateTimeInput(d)
}

export default function AddTaskModal({ onClose, onCreated }) {
  const aiUsage = useAiUsage()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [useStartTime, setUseStartTime] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [deadlineMode, setDeadlineMode] = useState('AI')
  const [deadline, setDeadline] = useState('')
  const [useEstimatedMinutes, setUseEstimatedMinutes] = useState(false)
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

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
    if (effectiveDeadline && new Date(effectiveDeadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (useStartTime && startTime && effectiveDeadline && new Date(effectiveDeadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || null,
        startTime: useStartTime ? (startTime || null) : null,
        deadline: effectiveDeadline || null,
        noDeadline: deadlineMode === 'NONE',
        estimatedMinutes: useEstimatedMinutes && estimatedMinutes ? parseInt(estimatedMinutes) : null,
        category: category || null,
      })
      dispatchAiUsed()
      onCreated()
    } catch (err) {
      alert(getApiErrorMessage(err, '태스크 생성에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 overlay-retro" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative card-retro w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto space-y-4"
      >
        <h3 className="font-dungeon text-dark text-xl">일정 추가</h3>

        <div>
          <label className="block text-xs font-bold text-sub mb-1">할 일 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="어떤 일을 해야 하나요?"
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
            placeholder="추가 정보가 있다면 적어주세요. AI가 더 똑똑하게 분석할 수 있어요."
            rows={2}
            maxLength={1000}
            className="w-full px-3 py-2 border border-line rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
          />
        </div>

        <hr className="border-line" />

        <div className="space-y-3">
          <DeadlineModeField
            mode={deadlineMode}
            onModeChange={handleModeChange}
            deadline={deadline}
            onDeadlineChange={(e) => setDeadline(e.target.value)}
            minDeadline={getMinDeadlineInput()}
          />

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-sub">
              <input
                type="checkbox"
                checked={useStartTime}
                onChange={(e) => {
                  setUseStartTime(e.target.checked)
                  if (e.target.checked) setStartTime(getDefaultStartTime())
                  else setStartTime('')
                }}
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
                  if (!e.target.checked) setEstimatedMinutes('')
                }}
                className="h-4 w-4 accent-primary"
              />
              예상 시간 직접 입력
            </label>
          </div>

          {useStartTime && (
            <TaskDateTimeField
              label="시작 시간"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onClear={() => setStartTime('')}
            />
          )}

          {useEstimatedMinutes && (
            <EstimatedMinutesField
              label="예상 시간"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          )}
        </div>

        <hr className="border-line" />

        <div>
          <label className="block text-xs font-bold text-sub mb-1">
            카테고리 (비워두면 AI가 자동 분류)
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                category === ''
                  ? 'bg-chip text-dark border-edge'
                  : 'bg-accent text-sub border-line hover:border-edge'
              }`}
            >
              AI 자동
            </button>
            {TASK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  category === c.value
                    ? 'bg-primary text-on-accent border-edge'
                    : 'bg-accent text-sub border-line hover:border-edge'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <AiUsageBadge usage={aiUsage.usage} cost={1} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-retro flex-1 text-sm py-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving || !aiUsage.hasEnough(1)}
            className="btn-retro-primary flex-1 text-sm py-2"
          >
            {saving ? 'AI 분석 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
