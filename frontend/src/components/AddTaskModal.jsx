import { useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import { CATEGORIES } from '../constants/categories'
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

function getDefaultDeadline() {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return formatDateTimeInput(d)
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
  const [deadline, setDeadline] = useState(getDefaultDeadline)
  const [useEstimatedMinutes, setUseEstimatedMinutes] = useState(false)
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    if (deadline && new Date(deadline) <= new Date()) {
      alert('마감일시는 현재 시간 이후로 설정해야 합니다.')
      return
    }
    if (useStartTime && startTime && deadline && new Date(deadline) <= new Date(startTime)) {
      alert('마감 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

    setSaving(true)
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || null,
        startTime: useStartTime ? (startTime || null) : null,
        deadline: deadline || null,
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
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative card-kitschy w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto space-y-4"
      >
        <h3 className="heading-kitschy text-xl">일정 추가</h3>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">할 일 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="어떤 일을 해야 하나요?"
            maxLength={200}
            className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">메모 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="추가 정보가 있다면 적어주세요. AI가 더 똑똑하게 분석할 수 있어요."
            rows={2}
            maxLength={1000}
            className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
          />
        </div>

        <hr className="border-dark/10" />

        <div className="space-y-3">
          <p className="text-xs font-bold text-dark/65">
            시간을 직접 입력하면 그 값을 우선해요. 비워두면 AI가 자동으로 채워줘요.
          </p>

          <TaskDateTimeField
            label="마감 시간"
            value={deadline}
            min={getMinDeadlineInput()}
            defaultTimeWhenEmpty="23:59"
            onChange={(e) => setDeadline(e.target.value)}
            onClear={() => setDeadline('')}
          />

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-dark/65">
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
            <label className="inline-flex items-center gap-2 text-xs font-bold text-dark/65">
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

        <hr className="border-dark/10" />

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">
            카테고리 (비워두면 AI가 자동 분류)
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                category === ''
                  ? 'bg-dark text-white border-dark'
                  : 'bg-accent text-dark border-dark/20 hover:border-dark'
              }`}
            >
              AI 자동
            </button>
            {TASK_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                  category === c.value
                    ? 'bg-primary text-white border-dark'
                    : 'bg-accent text-dark border-dark/20 hover:border-dark'
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
            className="btn-kitschy flex-1 bg-accent text-dark text-sm py-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving || !aiUsage.hasEnough(1)}
            className="btn-kitschy flex-1 bg-primary text-white text-sm py-2 disabled:opacity-50"
          >
            {saving ? 'AI 분석 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
