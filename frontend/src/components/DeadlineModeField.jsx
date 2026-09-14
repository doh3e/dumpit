import { TaskDateTimeField } from './TaskTimeInputs'
import { iconProps } from '../assets/icons'
import { DEADLINE_MODES } from '../utils/deadlineMode'

export default function DeadlineModeField({ mode, onModeChange, deadline, onDeadlineChange, minDeadline }) {
  const selected = DEADLINE_MODES.find((m) => m.value === mode)
  return (
    <div className="space-y-2">
      <span className="block text-xs font-bold text-sub">마감</span>
      <div className="flex flex-wrap gap-1.5">
        {DEADLINE_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            aria-pressed={mode === m.value}
            className={`btn-refined !rounded-full !px-3 text-xs ${mode === m.value ? 'btn-refined-selected' : ''}`}
          >
            {m.icon ? (
              <span className="inline-flex items-center gap-1">
                <img {...iconProps(m.icon, 14)} alt="" className="w-3.5 h-3.5 object-contain" />
                {m.label}
              </span>
            ) : (
              m.label
            )}
          </button>
        ))}
      </div>
      <p className="text-[0.6875rem] font-semibold text-sub">{selected?.help}</p>
      {mode === 'CUSTOM' && (
        <TaskDateTimeField
          label="마감 시간"
          value={deadline}
          min={minDeadline}
          defaultTimeWhenEmpty="23:59"
          onChange={onDeadlineChange}
        />
      )}
    </div>
  )
}
