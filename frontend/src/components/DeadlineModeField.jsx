import { TaskDateTimeField } from './TaskTimeInputs'

function formatDateTimeInput(d) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function getTodayDeadline() {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return formatDateTimeInput(d)
}

export const DEADLINE_MODES = [
  { value: 'AI', label: '✨ AI가 알아서', help: "제목·메모에 시점 단서가 있으면 마감을 잡고, 없으면 '언젠가'로 분류해요." },
  { value: 'TODAY', label: '오늘까지', help: '오늘 밤 11시 59분 마감으로 만들어요.' },
  { value: 'NONE', label: '🌙 언젠가', help: '기한 없는 일로 만들어요. AI가 마감을 지어내지 않아요.' },
  { value: 'CUSTOM', label: '📅 직접 입력', help: '마감 날짜와 시간을 직접 정해요.' },
]

export default function DeadlineModeField({ mode, onModeChange, deadline, onDeadlineChange, minDeadline }) {
  const selected = DEADLINE_MODES.find((m) => m.value === mode)
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-sub">마감</label>
      <div className="flex flex-wrap gap-1.5">
        {DEADLINE_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onModeChange(m.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
              mode === m.value
                ? 'bg-primary text-on-accent border-edge'
                : 'bg-accent text-sub border-line hover:border-edge'
            }`}
          >
            {m.label}
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
