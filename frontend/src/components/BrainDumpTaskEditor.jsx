import { useEffect, useId, useRef, useState } from 'react'
import { EstimatedMinutesField, TaskDateTimeField } from './TaskTimeInputs'

const MAX_INTEGER = 2147483647

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateTimeInput(value) {
  if (!value) return ''
  if (Array.isArray(value)) {
    return `${value[0]}-${pad(value[1] || 1)}-${pad(value[2] || 1)}T${pad(value[3] || 0)}:${pad(value[4] || 0)}`
  }
  const rawValue = String(value)
  const localValue = rawValue.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (localValue) return localValue[1]
  const parsed = new Date(rawValue)
  return Number.isNaN(parsed.getTime()) ? '' : formatLocalDateTime(parsed)
}

function parseLocalDateTime(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null
  const parts = match.slice(1).map(Number)
  const parsed = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4])
  if (
    parsed.getFullYear() !== parts[0]
    || parsed.getMonth() !== parts[1] - 1
    || parsed.getDate() !== parts[2]
    || parsed.getHours() !== parts[3]
    || parsed.getMinutes() !== parts[4]
  ) return null
  return parsed
}

function validateMinutes(value) {
  if (!value) return null
  if (!/^\d+$/.test(value)) return '예상 시간은 1분 이상의 정수로 입력해주세요.'
  const parsed = Number(value)
  if (parsed < 1) return '예상 시간은 1분 이상의 정수로 입력해주세요.'
  if (parsed > MAX_INTEGER) return '예상 시간이 너무 커요. 더 짧게 입력해주세요.'
  return null
}

export default function BrainDumpTaskEditor({ task, onApply, onCancel }) {
  const titleId = useId()
  const titleErrorId = useId()
  const titleRef = useRef(null)
  const deadlineRef = useRef(null)
  const minutesRef = useRef(null)
  const [title, setTitle] = useState(task.title ?? '')
  const [deadline, setDeadline] = useState(() => toDateTimeInput(task.deadline))
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimatedMinutes == null ? '' : String(task.estimatedMinutes),
  )
  const [errors, setErrors] = useState({})

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const parsedDeadline = deadline ? parseLocalDateTime(deadline) : null
    const nextErrors = {
      title: !trimmedTitle
        ? '제목을 입력해주세요.'
        : trimmedTitle.length > 200 ? '제목은 200자 이하여야 해요.' : null,
      deadline: deadline && (!parsedDeadline || parsedDeadline.getTime() <= Date.now())
        ? '마감 일시는 현재 시간 이후여야 해요.'
        : null,
      estimatedMinutes: validateMinutes(estimatedMinutes),
    }
    setErrors(nextErrors)

    if (nextErrors.title) titleRef.current?.focus()
    else if (nextErrors.deadline) deadlineRef.current?.focus()
    else if (nextErrors.estimatedMinutes) minutesRef.current?.focus()
    else {
      onApply({
        title: trimmedTitle,
        deadline: deadline || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={`${task.title} 수정`}
      className="mt-3 space-y-3 border-t border-line pt-3"
    >
      <div>
        <label htmlFor={titleId} className="mb-1 block text-xs font-bold text-sub">할 일 제목</label>
        <input
          id={titleId}
          ref={titleRef}
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (errors.title) setErrors((current) => ({ ...current, title: null }))
          }}
          maxLength={200}
          aria-invalid={errors.title ? 'true' : undefined}
          aria-describedby={errors.title ? titleErrorId : undefined}
          className="input-refined font-semibold"
        />
        {errors.title && (
          <p id={titleErrorId} role="alert" className="mt-1 text-xs font-bold text-primary">
            {errors.title}
          </p>
        )}
      </div>

      <TaskDateTimeField
        label="마감 일시 (선택)"
        value={deadline}
        onChange={(event) => {
          setDeadline(event.target.value)
          if (errors.deadline) setErrors((current) => ({ ...current, deadline: null }))
        }}
        onClear={() => {
          setDeadline('')
          if (errors.deadline) setErrors((current) => ({ ...current, deadline: null }))
        }}
        min={formatLocalDateTime(new Date())}
        error={errors.deadline}
        inputRef={deadlineRef}
      />

      <EstimatedMinutesField
        label="예상 시간 (선택)"
        value={estimatedMinutes}
        onChange={(event) => {
          setEstimatedMinutes(event.target.value)
          if (errors.estimatedMinutes) {
            setErrors((current) => ({ ...current, estimatedMinutes: null }))
          }
        }}
        error={errors.estimatedMinutes}
        inputRef={minutesRef}
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-refined btn-refined-text">
          취소
        </button>
        <button type="submit" className="btn-refined btn-refined-primary">
          적용
        </button>
      </div>
    </form>
  )
}
