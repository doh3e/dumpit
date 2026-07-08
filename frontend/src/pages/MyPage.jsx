import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import coinImage from '../assets/coin_image.png'
import PixelStation from '../components/PixelStation'
import { useAuth } from '../context/AuthContext'

function useDragScroll() {
  const ref = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const onPointerDown = useCallback((e) => {
    isDragging.current = true
    startX.current = e.clientX - ref.current.offsetLeft
    scrollLeft.current = ref.current.scrollLeft
    ref.current.style.cursor = 'grabbing'
    ref.current.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.clientX - ref.current.offsetLeft
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current)
  }, [])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
    if (ref.current) ref.current.style.cursor = 'grab'
  }, [])

  return { ref, onPointerDown, onPointerMove, onPointerUp }
}

const CATEGORY_LABEL = {
  WORK: '업무', STUDY: '학습', APPOINTMENT: '약속',
  CHORE: '집안일', ROUTINE: '루틴', HEALTH: '건강',
  HOBBY: '취미', OTHER: '기타',
}

// 카테고리 파이 색 — index.css .cat-* 계열과 동일한 뮤트 휴 (차트 전용 하드코딩)
const CATEGORY_COLOR = {
  WORK: '#5B84AE', STUDY: '#7A6FC0', APPOINTMENT: '#C4708F',
  CHORE: '#D49E35', ROUTINE: '#9A6FB8', HEALTH: '#6E9E62',
  HOBBY: '#C07862', OTHER: '#8A8578',
}

// 정거장 모듈 — 테마 라벨과 기능 라벨 병기
const STAT_CARDS = (stats) => [
  { theme: '수거한 생각', label: '완료한 태스크', value: stats.totalDone, bg: 'bg-primary', text: 'text-on-accent' },
  { theme: '처리 중', label: '진행 중', value: stats.totalInProgress, bg: 'bg-secondary', text: 'text-on-accent' },
  { theme: '궤도 유지', label: '연속 완료', value: `${stats.streak}일`, bg: 'bg-chip', text: 'text-dark', sub: '오늘 기준' },
  { theme: '자원', label: '보유 코인', value: stats.coinBalance, bg: 'bg-card', text: 'text-dark', icon: coinImage },
  { label: '브레인 덤프', value: stats.brainDumpCount, bg: 'bg-card', text: 'text-dark' },
  { label: '저장한 아이디어', value: stats.ideaCount, bg: 'bg-card', text: 'text-dark' },
]

const heatmapColorClass = (count) => {
  if (count >= 3) return 'star-log-3'
  if (count === 2) return 'star-log-2'
  if (count === 1) return 'star-log-1'
  return 'star-log-0'
}

const heatmapBgClass = heatmapColorClass

function formatLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function HeatmapGrid({ heatmap }) {
  const scrollRef = useRef(null)
  const entries = Object.entries(heatmap)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = formatLocalDateKey(today)

  const weeks = []
  for (let i = 0; i < entries.length; i += 7) {
    weeks.push(entries.slice(i, i + 7))
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
  }, [heatmap])

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div className="flex gap-1 justify-center">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, di) => {
              const entry = week[di]
              if (!entry) return <div key={di} className="w-3 h-3" />
              const [dateStr, count] = entry
              const isToday = dateStr === todayKey
              return (
                <div
                  key={di}
                  title={`${dateStr} · ${count}개 완료`}
                  className={`w-3 h-3 rounded-sm ${isToday ? `border-2 border-edge ${heatmapBgClass(count)}` : `border ${heatmapColorClass(count)}`}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-sub">{entries[0]?.[0]?.slice(5)}</span>
        <span className="text-[9px] text-sub">오늘</span>
      </div>
    </div>
  )
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  let cumAngle = -Math.PI / 2
  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI
    const start = cumAngle
    cumAngle += angle
    return { ...d, start, angle }
  })

  const arc = (cx, cy, r, start, angle) => {
    if (angle >= 2 * Math.PI - 0.001) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
    }
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(start + angle)
    const y2 = cy + r * Math.sin(start + angle)
    const large = angle > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap">
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0">
        {slices.map((s) => (
          <path key={s.label} d={arc(50, 50, 45, s.start, s.angle)} fill={s.color} stroke="var(--card)" strokeWidth="1" />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs font-bold text-dark">{s.label}</span>
            <span className="text-xs font-black text-sub">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDeadline(value) {
  if (!value) return ''
  const d = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MyPage() {
  const { refreshCoins } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [completingTask, setCompletingTask] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const bioRef = useRef(null)
  const sliderDrag = useDragScroll()

  useEffect(() => {
    Promise.all([
      api.get('/me/profile'),
      api.get('/me/stats'),
      api.get('/tasks/overdue'),
    ]).then(([p, s, o]) => {
      setProfile(p.data)
      setBioInput(p.data.bio || '')
      setStats(s.data)
      setOverdue(o.data)
    }).catch(() => {}).finally(() => setLoadingProfile(false))
  }, [])

  useEffect(() => {
    if (editingBio && bioRef.current) bioRef.current.focus()
  }, [editingBio])

  const handleSaveBio = async () => {
    setSavingBio(true)
    try {
      const res = await api.patch('/me/profile', { bio: bioInput })
      setProfile(res.data)
      setEditingBio(false)
    } catch (err) {
      alert(getApiErrorMessage(err, '저장에 실패했어요.'))
    } finally {
      setSavingBio(false)
    }
  }

  const handleCompleteOverdue = async (taskId) => {
    setCompletingTask(taskId)
    try {
      await api.patch(`/tasks/${taskId}`, { status: 'DONE' })
      setOverdue((prev) => prev.filter((t) => t.taskId !== taskId))
      const res = await api.get('/me/stats')
      setStats(res.data)
      refreshCoins()
    } catch (err) {
      alert(getApiErrorMessage(err, '완료 처리에 실패했어요.'))
    } finally {
      setCompletingTask(null)
    }
  }

  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      await api.delete('/me/account')
      window.location.href = '/'
    } catch (err) {
      alert(getApiErrorMessage(err, '회원 탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요.'))
      setWithdrawing(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-bold text-sub">불러오는 중...</p>
      </div>
    )
  }

  const pieData = stats
    ? Object.entries(stats.categoryBreakdown || {})
        .filter(([, v]) => v > 0)
        .map(([cat, value]) => ({
          label: CATEGORY_LABEL[cat] || cat,
          value,
          color: CATEGORY_COLOR[cat] || '#8A8578',
        }))
    : []

  const statCards = stats ? STAT_CARDS(stats) : []

  const heatmap = stats?.heatmap ?? (() => {
    const m = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - (28 * 7 - 1))
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      m[formatLocalDateKey(d)] = 0
    }
    return m
  })()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* 나의 우주정거장 — 프로필이 도킹된 느낌 */}
      <PixelStation />

      {/* Profile card */}
      <div className="card-retro !p-5 flex items-start gap-4">
        {profile?.picture ? (
          <img
            src={profile.picture}
            alt="프로필"
            className="w-16 h-16 rounded-full border border-line flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full border border-line bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-dark">{(profile?.nickname || '?')[0]}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-black text-dark text-lg leading-tight truncate">{profile?.nickname || '이름 없음'}</p>
          <p className="text-xs font-semibold text-sub truncate">{profile?.email}</p>

          {editingBio ? (
            <div className="mt-2 space-y-2">
              <textarea
                ref={bioRef}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="자기소개를 입력하세요"
                className="w-full px-2 py-1 border border-line rounded text-sm font-semibold bg-card outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveBio} disabled={savingBio}
                  className="btn-retro-primary text-xs py-1 px-3 disabled:opacity-50">
                  {savingBio ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => { setEditingBio(false); setBioInput(profile?.bio || '') }}
                  className="btn-retro text-xs py-1 px-3">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2">
              <p className="text-sm font-semibold text-sub flex-1 min-w-0 break-words">
                {profile?.bio || <span className="text-sub">자기소개가 없어요</span>}
              </p>
              <button onClick={() => setEditingBio(true)}
                className="text-[10px] font-black text-sub hover:text-primary flex-shrink-0">
                수정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats horizontal slider — 정거장 모듈 */}
      {statCards.length > 0 && (
        <div>
          <p className="label-retro mx-1 mb-2">정거장 모듈 · 통계</p>
          <div
            ref={sliderDrag.ref}
            onPointerDown={sliderDrag.onPointerDown}
            onPointerMove={sliderDrag.onPointerMove}
            onPointerUp={sliderDrag.onPointerUp}
            onPointerLeave={sliderDrag.onPointerUp}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none select-none cursor-grab"
            style={{ scrollBehavior: 'smooth' }}
          >
            {statCards.map(({ theme, label, value, bg, text, sub, icon }) => (
              <div
                key={label}
                className={`snap-start flex-shrink-0 w-32 h-32 rounded-2xl shadow-retro ${bg} flex flex-col items-center justify-center gap-1 p-3 transition-transform duration-150 active:scale-95`}
                style={{ border: '1.5px solid var(--edge)' }}
              >
                {icon && <img src={icon} alt="" className="w-6 h-6 object-contain mb-0.5" />}
                <p className={`font-dungeon text-3xl leading-none ${text}`}>{value}</p>
                {theme && (
                  <p className={`font-dungeon text-[10px] text-center leading-tight ${text}`}>{theme}</p>
                )}
                <p className={`text-[10px] font-black text-center leading-tight ${text} opacity-70`}>{label}</p>
                {sub && <p className={`text-[9px] font-semibold ${text} opacity-50`}>{sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 별빛 로그 — 완료량을 별 밝기로 */}
      {stats && (
        <div className="card-retro !p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-galmuri font-bold text-sm text-dark">별빛 로그 <span className="text-sub font-sans font-bold">· 완료 기록</span></p>
            <span className="text-[10px] font-bold text-sub">최근 28주</span>
          </div>
          <HeatmapGrid heatmap={heatmap} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {[
              ['없음', 0],
              ['1개 완료', 1],
              ['2개 완료', 2],
              ['3개 이상 완료', 3],
            ].map(([label, count]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm border ${heatmapColorClass(count)}`} />
                <span className="text-[9px] text-sub">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pie chart */}
      <div className="card-retro !p-4 space-y-3">
        <p className="font-galmuri font-bold text-sm text-dark">완료 태스크 카테고리 별 분포</p>
        {pieData.length === 0 ? (
          <p className="text-xs font-semibold text-sub py-4 text-center">
            태스크를 완료하면 여기서 카테고리 분포를 볼 수 있어요.
          </p>
        ) : (
          <PieChart data={pieData} />
        )}
      </div>

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <div className="card-retro !p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-dark">기한 초과 태스크</p>
            <span className="text-[10px] font-black rounded-full px-2 py-0.5 chip-retro text-secondary">
              완료 시 5코인
            </span>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => (
              <div key={task.taskId}
                className="flex items-center gap-3 rounded-lg border-2 tone-overdue p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-dark truncate">{task.title}</p>
                  <p className="text-[11px] font-semibold text-primary">마감 {formatDeadline(task.deadline)}</p>
                </div>
                <button
                  onClick={() => handleCompleteOverdue(task.taskId)}
                  disabled={completingTask === task.taskId}
                  className="btn-retro-primary text-xs py-1 px-3 flex-shrink-0"
                >
                  {completingTask === task.taskId ? '...' : '완료'}
                </button>
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="block text-center text-xs font-black text-sub hover:text-primary pt-1">
            대시보드에서 더 보기 →
          </Link>
        </div>
      )}

      {overdue.length === 0 && stats && (
        <div className="card-retro !p-6 text-center">
          <p className="font-black text-dark">기한 초과 태스크가 없어요</p>
          <p className="mt-1 text-xs font-semibold text-sub">훌륭해요! 모든 일정을 잘 지키고 있어요.</p>
        </div>
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setShowWithdrawModal(true)}
          className="text-[11px] font-bold text-sub underline underline-offset-2 hover:text-primary"
        >
          회원 탈퇴
        </button>
      </div>

      {showWithdrawModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center overlay-retro px-4" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
          <div
            className="card-retro w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 파괴적 액션 — 테마 카피 없이 조용하고 명확하게 (스펙 7.5) */}
            <h2 className="text-xl font-bold text-dark">회원 탈퇴</h2>
            <div className="mt-4 rounded-lg border-2 tone-danger px-4 py-3">
              <p className="text-sm font-black" style={{ color: 'var(--danger)' }}>탈퇴 전 확인해주세요.</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-sub">
                탈퇴하면 계정 개인정보는 비식별 처리되고, 작성한 할 일, 루틴, 아이디어, 브레인덤프 원문은 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                disabled={withdrawing}
                className="btn-retro flex-1 py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="btn-retro flex-1 py-2 text-sm text-on-accent"
                style={{ background: 'var(--danger)' }}
              >
                {withdrawing ? '처리 중...' : '탈퇴'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
