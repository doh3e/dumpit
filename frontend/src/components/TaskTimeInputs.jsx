import { useId, useRef } from 'react'


function applyDefaultTime(nextValue, currentValue, defaultTimeWhenEmpty) {
  if (!defaultTimeWhenEmpty) return nextValue
  if (currentValue || !nextValue || !nextValue.endsWith('T00:00')) return nextValue
  return `${nextValue.slice(0, 11)}${defaultTimeWhenEmpty}`
}

export function TaskDateTimeField({ label, value, onChange, onClear, min, defaultTimeWhenEmpty }) {
  const fieldId = useId()
  const inputRef = useRef(null)

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={fieldId} className="text-xs font-bold text-sub">{label}</label>
        {onClear && (
          <button
            type="button"
            onClick={handleClear}
            className="btn-refined btn-refined-text !px-2 text-[0.6875rem] text-sub hover:text-primary"
          >
            ✕ 지우기
          </button>
        )}
      </div>
      <input
        id={fieldId}
        ref={inputRef}
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange({
          ...e,
          target: {
            ...e.target,
            value: applyDefaultTime(e.target.value, value, defaultTimeWhenEmpty),
          },
        })}
        className="input-refined font-semibold"
      />
    </div>
  )
}

export function EstimatedMinutesField({ value, onChange, label = '예상 시간' }) {
  const minutesId = useId()

  return (
    <div className="w-28">
      <label htmlFor={minutesId} className="block text-xs font-bold text-sub mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={minutesId}
          type="number"
          value={value}
          onChange={onChange}
          placeholder="60"
          min="1"
          className="input-refined !w-16 !px-2 font-semibold"
        />
        <span className="text-xs font-bold text-sub">분</span>
      </div>
    </div>
  )
}
