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

/**
 * 배치 범위 계산 — 자정을 넘기는 야간 루틴(예: 22~4시)도 지원
 * @returns { primary: [start,end][], overflow: [start,end][] }
 */
function getPlacementRanges(routineStart, routineEnd, nowMin) {
  const rS = routineStart * 60
  const rE = routineEnd * 60
  const primary = []
  const overflow = []

  const align = (m) => Math.ceil(m / 15) * 15

  if (routineStart <= routineEnd) {
    const pStart = Math.max(rS, nowMin)
    if (pStart < rE) primary.push([align(pStart), rE])
    const oStart = Math.max(rE, nowMin)
    if (oStart < 1440) overflow.push([align(oStart), 1440])
  } else {
    if (nowMin < rE) {
      primary.push([align(nowMin), rE])
      overflow.push([align(rE), rS])
    } else if (nowMin >= rS) {
      primary.push([align(nowMin), 1440])
      primary.push([0, rE])
      overflow.push([align(rE), rS])
    } else {
      overflow.push([align(nowMin), rS])
      primary.push([rS, 1440])
      primary.push([0, rE])
    }
  }

  return { primary, overflow }
}

function scheduleBlocks(tasks, routineStart, routineEnd, now) {
  const active = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const nowH = now.getHours() + now.getMinutes() / 60

  const fixedBlocks = []
  const floatingTasks = []

  active.forEach((t, i) => {
    if (t.startTime && t.endTime) {
      const s = new Date(t.startTime)
      const e = new Date(t.endTime)
      fixedBlocks.push({
        id: t.taskId,
        title: t.title,
        startH: s.getHours() + s.getMinutes() / 60,
        endH: e.getHours() + e.getMinutes() / 60,
        color: PRIORITY_COLORS[i % PRIORITY_COLORS.length],
        priority: t.effectivePriority ?? 0.5,
        isLocked: true,
      })
    } else {
      floatingTasks.push({ ...t, _idx: i })
    }
  })

  floatingTasks.sort((a, b) => {
    const pa = a.effectivePriority ?? 0.5
    const pb = b.effectivePriority ?? 0.5
    if (pb !== pa) return pb - pa
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })

  const occupied = new Set()
  fixedBlocks.forEach((b) => {
    const s = Math.floor(b.startH * 60)
    const e = Math.ceil(b.endH * 60)
    for (let m = s; m < e; m++) occupied.add(m)
  })

  const nowMin = Math.ceil(nowH * 60)
  const { primary, overflow } = getPlacementRanges(routineStart, routineEnd, nowMin)

  const autoBlocks = []

  function tryPlaceInRange(t, rangeStart, rangeEnd) {
    const duration = t.estimatedMinutes || 60
    for (let cursor = rangeStart; cursor + duration <= rangeEnd; cursor += 15) {
      let fits = true
      for (let m = cursor; m < cursor + duration; m++) {
        if (occupied.has(m)) { fits = false; break }
      }
      if (fits) {
        autoBlocks.push({
          id: t.taskId,
          title: t.title,
          startH: cursor / 60,
          endH: (cursor + duration) / 60,
          color: PRIORITY_COLORS[t._idx % PRIORITY_COLORS.length],
          priority: t.effectivePriority ?? 0.5,
          isLocked: false,
        })
        for (let m = cursor; m < cursor + duration; m++) occupied.add(m)
        return true
      }
    }
    return false
  }

  function tryPlaceInRanges(t, ranges) {
    for (const [s, e] of ranges) {
      if (tryPlaceInRange(t, s, e)) return true
    }
    return false
  }

  floatingTasks.forEach((t) => {
    if (tryPlaceInRanges(t, primary)) return
    tryPlaceInRanges(t, overflow)
  })

  return [...fixedBlocks, ...autoBlocks].sort((a, b) => a.startH - b.startH)
}

const DEFAULT_START = 9
const DEFAULT_END = 22

export default function CircularTimetable({ tasks = [] }) {
  const [now, setNow] = useState(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [routineStart, setRoutineStart] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_start')
    return v ? Number(v) : DEFAULT_START
  })
  const [routineEnd, setRoutineEnd] = useState(() => {
    const v = localStorage.getItem('dumpit_routine_end')
    return v ? Number(v) : DEFAULT_END
  })

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const saveRoutine = (start, end) => {
    setRoutineStart(start)
    setRoutineEnd(end)
    localStorage.setItem('dumpit_routine_start', start)
    localStorage.setItem('dumpit_routine_end', end)
  }

  const currentHour = now.getHours() + now.getMinutes() / 60
  const blocks = useMemo(
    () => scheduleBlocks(tasks, routineStart, routineEnd, now),
    [tasks, routineStart, routineEnd, now]
  )

  const currentBlock = blocks.find((b) => currentHour >= b.startH && currentHour < b.endH)

  const routineStartAngle = (routineStart / 24) * 360
  const routineEndAngle = routineStart <= routineEnd
    ? (routineEnd / 24) * 360
    : (routineEnd / 24) * 360 + 360

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#F0F0F0" stroke="#1A1A1A" strokeWidth={2} />
        <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="white" stroke="#1A1A1A" strokeWidth={2} />

        <path
          d={slicePath(routineStartAngle, routineEndAngle, RADIUS - 1, INNER_RADIUS + 1)}
          fill="#E8F5E9"
          stroke="none"
          opacity={0.5}
        />

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

        <text x={CENTER} y={CENTER - 6} textAnchor="middle" fontSize={14}
          fontWeight={900} fill="#1A1A1A" fontFamily="'Press Start 2P', monospace">
          {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
        </text>
        <text x={CENTER} y={CENTER + 10} textAnchor="middle" fontSize={8}
          fill="#1A1A1A" opacity={0.4} fontWeight={700}>
          NOW
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
          일정이 없어요
        </p>
      )}

      <button
        onClick={() => setShowSettings(!showSettings)}
        className="text-[10px] font-bold text-dark/40 hover:text-primary transition-colors"
      >
        일과 시간: {routineStart}시~{routineEnd}시 (변경)
      </button>

      {showSettings && (
        <div className="w-full flex items-center gap-2 bg-accent rounded-lg p-2 border border-dark/10">
          <label className="text-[10px] font-bold text-dark/60">시작</label>
          <select
            value={routineStart}
            onChange={(e) => saveRoutine(Number(e.target.value), routineEnd)}
            className="text-xs font-bold border border-dark rounded px-1 py-0.5 bg-white"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{h}시</option>
            ))}
          </select>
          <label className="text-[10px] font-bold text-dark/60">종료</label>
          <select
            value={routineEnd}
            onChange={(e) => saveRoutine(routineStart, Number(e.target.value))}
            className="text-xs font-bold border border-dark rounded px-1 py-0.5 bg-white"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{h}시</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
