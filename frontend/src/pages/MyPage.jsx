import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const CATEGORY_LABEL = {
  WORK: '업무', STUDY: '학습', APPOINTMENT: '약속',
  CHORE: '집안일', ROUTINE: '루틴', HEALTH: '건강',
  HOBBY: '취미', OTHER: '기타',
}

const CATEGORY_COLOR = {
  WORK: 'bg-blue-400', STUDY: 'bg-purple-400', APPOINTMENT: 'bg-orange-400',
  CHORE: 'bg-yellow-400', ROUTINE: 'bg-green-400', HEALTH: 'bg-red-400',
  HOBBY: 'bg-pink-400', OTHER: 'bg-gray-400',
}

function formatDeadline(value) {
  if (!value) return ''
  const d = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card-kitschy !p-4 flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-black text-dark/50 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black text-dark leading-none">{value}</p>
      {sub && <p className="text-xs font-semibold text-dark/50">{sub}</p>}
    </div>
  )
}

export default function MyPage() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [completingTask, setCompletingTask] = useState(null)
  const bioRef = useRef(null)

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
    } catch {
      alert('저장에 실패했어요.')
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
    } catch {
      alert('완료 처리에 실패했어요.')
    } finally {
      setCompletingTask(null)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-bold text-dark/50">불러오는 중...</p>
      </div>
    )
  }

  const categoryEntries = stats
    ? Object.entries(stats.categoryBreakdown || {}).sort((a, b) => b[1] - a[1])
    : []
  const maxCat = categoryEntries.length ? categoryEntries[0][1] : 1

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile card */}
      <div className="card-kitschy !p-5 flex items-start gap-4">
        {profile?.picture ? (
          <img
            src={profile.picture}
            alt="프로필"
            className="w-16 h-16 rounded-full border-2 border-dark flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full border-2 border-dark bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-dark">
              {(profile?.nickname || '?')[0]}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-black text-dark text-lg leading-tight truncate">
            {profile?.nickname || '이름 없음'}
          </p>
          <p className="text-xs font-semibold text-dark/50 truncate">{profile?.email}</p>

          {editingBio ? (
            <div className="mt-2 space-y-2">
              <textarea
                ref={bioRef}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="자기소개를 입력하세요"
                className="w-full px-2 py-1 border-2 border-dark rounded text-sm font-semibold bg-white outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveBio}
                  disabled={savingBio}
                  className="btn-kitschy bg-primary text-white text-xs py-1 px-3 disabled:opacity-50"
                >
                  {savingBio ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => { setEditingBio(false); setBioInput(profile?.bio || '') }}
                  className="btn-kitschy bg-accent text-dark text-xs py-1 px-3"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2">
              <p className="text-sm font-semibold text-dark/70 flex-1 min-w-0 break-words">
                {profile?.bio || <span className="text-dark/30">자기소개가 없어요</span>}
              </p>
              <button
                onClick={() => setEditingBio(true)}
                className="text-[10px] font-black text-dark/40 hover:text-primary flex-shrink-0"
              >
                수정
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="완료한 태스크" value={stats.totalDone} />
          <StatCard label="연속 완료" value={`${stats.streak}일`} sub="오늘 기준" />
          <StatCard label="보유 코인" value={stats.coinBalance} sub="coin" />
          <StatCard label="브레인 덤프" value={stats.brainDumpCount} />
          <StatCard label="저장한 아이디어" value={stats.ideaCount} />
        </div>
      )}

      {/* Category breakdown */}
      {categoryEntries.length > 0 && (
        <div className="card-kitschy !p-4 space-y-3">
          <p className="text-sm font-black text-dark">카테고리별 완료</p>
          <div className="space-y-2">
            {categoryEntries.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs font-bold text-dark/70 w-14 flex-shrink-0">
                  {CATEGORY_LABEL[cat] || cat}
                </span>
                <div className="flex-1 bg-dark/10 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${CATEGORY_COLOR[cat] || 'bg-gray-400'}`}
                    style={{ width: `${(count / maxCat) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black text-dark w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <div className="card-kitschy !p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-dark">기한 초과 태스크</p>
            <span className="text-[10px] font-black text-red-500 bg-red-50 border border-red-300 rounded-full px-2 py-0.5">
              완료 시 5코인
            </span>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => (
              <div
                key={task.taskId}
                className="flex items-center gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-dark truncate">{task.title}</p>
                  <p className="text-[11px] font-semibold text-red-500">
                    마감 {formatDeadline(task.deadline)}
                  </p>
                </div>
                <button
                  onClick={() => handleCompleteOverdue(task.taskId)}
                  disabled={completingTask === task.taskId}
                  className="btn-kitschy bg-red-500 text-white text-xs py-1 px-3 flex-shrink-0 disabled:opacity-50"
                >
                  {completingTask === task.taskId ? '...' : '완료'}
                </button>
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="block text-center text-xs font-black text-dark/40 hover:text-primary pt-1">
            대시보드에서 더 보기 →
          </Link>
        </div>
      )}

      {overdue.length === 0 && stats && (
        <div className="card-kitschy !p-6 text-center">
          <p className="font-black text-dark">기한 초과 태스크가 없어요</p>
          <p className="mt-1 text-xs font-semibold text-dark/50">훌륭해요! 모든 일정을 잘 지키고 있어요.</p>
        </div>
      )}
    </div>
  )
}
