import { useCallback, useId, useRef } from 'react'


function applyDefaultTime(nextValue, currentValue, defaultTimeWhenEmpty) {
  if (!defaultTimeWhenEmpty) return nextValue
  if (currentValue || !nextValue || !nextValue.endsWith('T00:00')) return nextValue
  return `${nextValue.slice(0, 11)}${defaultTimeWhenEmpty}`
}

export function TaskDateTimeField({
  label,
  value,
  onChange,
  onClear,
  min,
  defaultTimeWhenEmpty,
  error,
  inputRef: externalInputRef,
}) {
  const fieldId = useId()
  const errorId = useId()
  const internalInputRef = useRef(null)

  const setInputRef = useCallback((node) => {
    internalInputRef.current = node
    if (typeof externalInputRef === 'function') externalInputRef(node)
    else if (externalInputRef) externalInputRef.current = node
  }, [externalInputRef])

  const handleClear = () => {
    if (internalInputRef.current) internalInputRef.current.value = ''
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
        ref={setInputRef}
        type="datetime-local"
        value={value}
        min={min}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange({
          ...e,
          target: {
            ...e.target,
            value: applyDefaultTime(e.target.value, value, defaultTimeWhenEmpty),
          },
        })}
        className="input-refined font-semibold"
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs font-bold text-primary">{error}</p>}
    </div>
  )
}

export function EstimatedMinutesField({ value, onChange, label = '예상 시간', error, inputRef }) {
  const minutesId = useId()
  const errorId = useId()

  return (
    <div className="w-28">
      <label htmlFor={minutesId} className="block text-xs font-bold text-sub mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={minutesId}
          ref={inputRef}
          type="number"
          value={value}
          onChange={onChange}
          placeholder="60"
          min="1"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className="input-refined !w-16 !px-2 font-semibold"
        />
        <span className="text-xs font-bold text-sub">분</span>
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-xs font-bold text-primary">{error}</p>}
    </div>
  )
}
