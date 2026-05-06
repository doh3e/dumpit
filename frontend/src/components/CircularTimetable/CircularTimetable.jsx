import { useState, useEffect, useMemo } from 'react'

const SIZE = 240
const CENTER = SIZE / 2
const RADIUS = 95
const INNER_RADIUS = 50

const PRIORITY_COLORS = [
  '#E05D5D', '#FF8C42', '#7EC8A0', '#6BA3D6', '#C08EDC', '#E8B84B',
]

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

function slicePath(startAngle, endAngle, outerR, innerR) {
  if (endAngle - startAngle >= 360) endAngle = startAngle + 359.99
  const s1 = polarToXY(startAngle, outerR)
  const e1 = polarToXY(endAngle, outerR)
  const s2 = polarToXY(endAngle, innerR)
  const e2 = polarToXY(startAngle, innerR)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

function rangePathsOutsideWork(routineStart, routineEnd) {
  const startAngle = (routineStart / 24) * 360
  const endAngle = (routineEnd / 24) * 360
  if (routineStart === routineEnd) return []
  if (routineStart < routineEnd) {
    return [
      [0, startAngle],
      [endAngle, 360],
    ].filter(([start, end]) => end > start)
  }
  return [[endAngle, startAngle]]
}

function scheduleBlocks(tasks, routineStart, routineEnd, now) {
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowMin = Math.ceil((nowH * 60) / 15) * 15
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const toDate = (v) => {
    if (!v) return null
    if (Array.isArray(v)) return new Date(v[0], (v[1] || 1) - 1, v[2] || 1, v[3] || 0, v[4] || 0, v[5] || 0)
    return new Date(v)
  }
  const minutesFromDayStart = (date) => Math.floor((date.getTime() - dayStart.getTime()) / 60000)
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
  const overlapsToday = (start, end) => start < dayEnd && end > dayStart

  // 시간표는 사용자가 시간을 정한 일만 표시한다.
  // 마감/중요도 기반의 추천과 자동 배치는 대시보드 추천 카드와 해야 할 일 목록이 담당한다.
  const active = tasks.filter((t) => {
    if (t.status === 'DONE' || t.status === 'CANCELLED') return false
    return true
  })

  const fixedBlocks = []

  active.forEach((t, i) => {
    if (t.startTime && (t.endTime || t.routineId || t.category === 'ROUTINE')) {
      const s = toDate(t.startTime)
      const e = t.endTime
        ? toDate(t.endTime)
        : new Date(s.getTime() + Math.max(15, t.estimatedMinutes || 15) * 60000)
      if (s && e && e > s && overlapsToday(s, e)) {
        const startMin = clamp(minutesFromDayStart(s), nowMin, 1440)
        const endMin = clamp(minutesFromDayStart(e), 0, 1440)
        if (endMin <= startMin) return
        fixedBlocks.push({
          id: t.taskId,
          title: t.title,
          startH: startMin / 60,
          endH: endMin / 60,
          color: PRIORITY_COLORS[i % PRIORITY_COLORS.length],
          priority: t.effectivePriority ?? 0.5,
          isLocked: Boolean(t.isLocked || t.routineId || t.category === 'ROUTINE'),
        })
      }
    }
  })

  return fixedBlocks.sort((a, b) => a.startH - b.startH)
}

const DEFAULT_START = 9
const DEFAULT_END = 22

function readRoutine() {
  const start = localStorage.getItem('dumpit_routine_start')
  const end = localStorage.getItem('dumpit_routine_end')
  return {
    start: start ? Number(start) : DEFAULT_START,
    end: end ? Number(end) : DEFAULT_END,
  }
}

export default function CircularTimetable({ tasks = [] }) {
  const [now, setNow] = useState(new Date())
  const [routine, setRoutine] = useState(readRoutine)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = () => setRoutine(readRoutine())
    window.addEventListener('dumpit_routine_changed', handler)
    return () => window.removeEventListener('dumpit_routine_changed', handler)
  }, [])

  const routineStart = routine.start
  const routineEnd = routine.end

  const currentHour = now.getHours() + now.getMinutes() / 60
  const blocks = useMemo(
    () => scheduleBlocks(tasks, routineStart, routineEnd, now),
    [tasks, routineStart, routineEnd, now]
  )

  const currentBlock = blocks.find((b) => currentHour >= b.startH && currentHour < b.endH)

  const inactiveRanges = rangePathsOutsideWork(routineStart, routineEnd)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#F0F0F0" stroke="#1A1A1A" strokeWidth={2} />
        <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="white" stroke="#1A1A1A" strokeWidth={2} />

        {inactiveRanges.map(([startAngle, endAngle]) => (
          <path
            key={`${startAngle}-${endAngle}`}
            d={slicePath(startAngle, endAngle, RADIUS - 1, INNER_RADIUS + 1)}
            fill="#D8D8D8"
            stroke="none"
            opacity={0.72}
          />
        ))}

        {Array.from({ length: 24 }, (_, h) => {
          const angle = (h / 24) * 360
          const p1 = polarToXY(angle, INNER_RADIUS)
          const p2 = polarToXY(angle, RADIUS)
          const isMajor = h % 6 === 0
          return (
            <line
              key={h}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#1A1A1A"
              strokeWidth={isMajor ? 1.5 : 0.5}
              opacity={isMajor ? 0.3 : 0.1}
            />
          )
        })}

        {blocks.map((block) => {
          const startAngle = (block.startH / 24) * 360
          const endAngle = (block.endH / 24) * 360
          const isCurrent = block === currentBlock
          return (
            <path
              key={block.id}
              d={slicePath(startAngle, endAngle, RADIUS - 2, INNER_RADIUS + 2)}
              fill={block.color}
              stroke="#1A1A1A"
              strokeWidth={isCurrent ? 2.5 : 1}
              opacity={isCurrent ? 1 : 0.7}
            />
          )
        })}

        {(() => {
          const angle = (currentHour / 24) * 360
          const tip = polarToXY(angle, RADIUS + 4)
          const base = polarToXY(angle, INNER_RADIUS - 2)
          return (
            <>
              <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y}
                stroke="#E05D5D" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={tip.x} cy={tip.y} r={3} fill="#E05D5D" stroke="#1A1A1A" strokeWidth={1} />
            </>
          )
        })()}

        <text x={CENTER} y={CENTER} textAnchor="middle" fontSize={14}
          fontWeight={900} fill="#1A1A1A" fontFamily="'Press Start 2P', monospace">
          {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
        </text>
        <text x={CENTER} y={CENTER + 18} textAnchor="middle" fontSize={11}
          fill="#1A1A1A" opacity={0.45} fontWeight={800}>
          {routineStart}시-{routineEnd}시
        </text>

        {[0, 6, 12, 18].map((h) => {
          const pos = polarToXY((h / 24) * 360, RADIUS + 14)
          return (
            <text key={h} x={pos.x} y={pos.y} textAnchor="middle"
              dominantBaseline="middle" fontSize={9} fontWeight={800}
              fill="#1A1A1A" opacity={0.5}>
              {h}
            </text>
          )
        })}
      </svg>

      {currentBlock && (
        <div className="w-full bg-primary/10 border-2 border-primary rounded-lg py-2 px-3">
          <p className="text-[10px] font-bold text-primary mb-0.5">지금 해야 할 일</p>
          <p className="font-extrabold text-dark text-sm">{currentBlock.title}</p>
        </div>
      )}

      {blocks.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm border border-dark flex-shrink-0"
                style={{ background: block.color }} />
              <span className="text-[10px] font-bold text-dark/70">{block.title}</span>
            </div>
          ))}
        </div>
      )}

      {blocks.length === 0 && (
        <p className="text-xs text-dark/40 font-medium text-center">
          시간이 정해진 일이 없어요
        </p>
      )}

    </div>
  )
}
