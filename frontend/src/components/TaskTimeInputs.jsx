import { useRef } from 'react'


function applyDefaultTime(nextValue, currentValue, defaultTimeWhenEmpty) {
  if (!defaultTimeWhenEmpty) return nextValue
  if (currentValue || !nextValue || !nextValue.endsWith('T00:00')) return nextValue
  return `${nextValue.slice(0, 11)}${defaultTimeWhenEmpty}`
}

export function TaskDateTimeField({ label, value, onChange, onClear, min, defaultTimeWhenEmpty }) {
  const inputRef = useRef(null)

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-sub">{label}</label>
        {onClear && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[0.6875rem] font-bold text-sub hover:text-primary transition-colors"
          >
            ✕ 지우기
          </button>
        )}
      </div>
      <input
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
        className="w-full px-3 py-2 border border-line rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
      />
    </div>
  )
}

export function EstimatedMinutesField({ value, onChange, label = '예상 시간' }) {
  return (
    <div className="w-28">
      <label className="block text-xs font-bold text-sub mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={onChange}
          placeholder="60"
          min="1"
          className="w-16 px-2 py-2 border border-line rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
        />
        <span className="text-xs font-bold text-sub">분</span>
      </div>
    </div>
  )
}
