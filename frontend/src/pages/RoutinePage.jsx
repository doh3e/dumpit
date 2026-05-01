import { useEffect, useMemo, useState } from 'react'
import api, { getApiErrorMessage } from '../services/api'

const WEEK_DAYS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 7, label: '일' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  enabled: true,
  repeatType: 'DAILY',
  daysOfWeek: [],
  daysOfMonth: [],
  createTime: '06:00',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
}

function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) return new Date(value[0], (value[1] || 1) - 1, value[2] || 1)
  return new Date(value)
}

function formatDate(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatRule(routine) {
  if (routine.repeatType === 'DAILY') return '매일'
  if (routine.repeatType === 'WEEKLY') {
    const labels = WEEK_DAYS
      .filter((day) => routine.daysOfWeek?.includes(day.value))
      .map((day) => day.label)
    return labels.length > 0 ? `매주 ${labels.join(', ')}` : '요일 미설정'
  }
  if (routine.repeatType === 'MONTHLY') {
    return routine.daysOfMonth?.length > 0
      ? `매월 ${routine.daysOfMonth.sort((a, b) => a - b).join(', ')}일`
      : '날짜 미설정'
  }
  return '-'
}

function toggleNumber(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function RoutinePage() {
  const [routines, setRoutines] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const sortedRoutines = useMemo(
    () => [...routines].sort((a, b) => Number(b.enabled) - Number(a.enabled)),
    [routines]
  )

  const fetchRoutines = () => {
    api.get('/routines')
      .then((res) => setRoutines(res.data))
      .catch(() => setRoutines([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRoutines() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  const editRoutine = (routine) => {
    setEditingId(routine.routineId)
    setForm({
      name: routine.name || '',
      description: routine.description || '',
      enabled: Boolean(routine.enabled),
      repeatType: routine.repeatType || 'DAILY',
      daysOfWeek: routine.daysOfWeek || [],
      daysOfMonth: routine.daysOfMonth || [],
      createTime: routine.createTime?.slice(0, 5) || '06:00',
      startDate: routine.startDate || new Date().toISOString().slice(0, 10),
      endDate: routine.endDate || '',
    })
    setError(null)
  }

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim() || null,
    enabled: form.enabled,
    repeatType: form.repeatType,
    daysOfWeek: form.repeatType === 'WEEKLY' ? form.daysOfWeek : [],
    daysOfMonth: form.repeatType === 'MONTHLY' ? form.daysOfMonth : [],
    createTime: form.createTime,
    startDate: form.startDate,
    endDate: form.endDate || null,
  })

  const saveRoutine = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || saving) return

    setSaving(true)
    setError(null)

    try {
      if (editingId) await api.patch(`/routines/${editingId}`, buildPayload())
      else await api.post('/routines', buildPayload())
      resetForm()
      fetchRoutines()
    } catch (err) {
      setError(getApiErrorMessage(err, '루틴을 저장하지 못했어요.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (routine) => {
    try {
      await api.patch(`/routines/${routine.routineId}/enabled`, { enabled: !routine.enabled })
      fetchRoutines()
    } catch (err) {
      setError(getApiErrorMessage(err, '루틴 상태를 바꾸지 못했어요.'))
    }
  }

  const deleteRoutine = async (routine) => {
    if (!window.confirm('이 루틴을 삭제할까요? 이미 생성된 태스크는 남아 있어요.')) return
    try {
      await api.delete(`/routines/${routine.routineId}`)
      if (editingId === routine.routineId) resetForm()
      fetchRoutines()
    } catch (err) {
      setError(getApiErrorMessage(err, '루틴을 삭제하지 못했어요.'))
    }
  }

  const monthDays = Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="heading-kitschy text-2xl">루틴</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            정해둔 날짜나 요일에 루틴명과 같은 태스크를 자동으로 만들어요.
          </p>
        </div>
        <div className="card-kitschy !py-3">
          <p className="text-xs font-bold text-dark/50">활성 루틴</p>
          <p className="text-xl font-black text-primary">
            {routines.filter((routine) => routine.enabled).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="card-kitschy !py-3 bg-primary/10 border-primary">
          <p className="text-sm font-bold text-primary">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.7fr)] gap-6">
        <section className="card-kitschy">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-black text-dark">루틴 목록</h3>
            <button type="button" onClick={resetForm} className="btn-kitschy bg-accent text-dark text-xs py-1.5">
              새 루틴
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center font-bold text-dark/50">불러오는 중...</div>
          ) : sortedRoutines.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-extrabold text-dark">아직 루틴이 없어요</p>
              <p className="mt-2 text-xs font-semibold text-dark/50">반복되는 일을 하나 등록해보세요.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[34rem] overflow-y-auto pr-1">
              {sortedRoutines.map((routine) => (
                <div
                  key={routine.routineId}
                  className={`rounded-lg border-2 p-3 ${
                    routine.enabled ? 'border-dark/20 bg-white' : 'border-dark/10 bg-white/60 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => editRoutine(routine)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          routine.enabled ? 'bg-secondary text-white border-secondary' : 'bg-accent text-dark border-dark/20'
                        }`}>
                          {routine.enabled ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-[10px] font-black text-dark/40">{formatRule(routine)}</span>
                        <span className="text-[10px] font-black text-dark/40">{routine.createTime?.slice(0, 5)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-dark">{routine.name}</p>
                      <p className="mt-1 text-[10px] font-semibold text-dark/45">
                        {formatDate(routine.startDate)} 시작
                        {routine.endDate && ` · ${formatDate(routine.endDate)} 종료`}
                        {routine.lastGeneratedDate && ` · 마지막 생성 ${formatDate(routine.lastGeneratedDate)}`}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(routine)}
                        className="rounded border-2 border-dark/20 bg-accent px-2 py-1 text-xs font-black text-dark"
                      >
                        {routine.enabled ? '끄기' : '켜기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoutine(routine)}
                        className="rounded border-2 border-primary/30 bg-primary/10 px-2 py-1 text-xs font-black text-primary"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={saveRoutine} className="card-kitschy space-y-4">
          <div>
            <p className="text-[10px] font-bold text-dark/40">{editingId ? '편집 중' : '새 루틴'}</p>
            <h3 className="mt-1 text-base font-black text-dark">루틴 설정</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark/60 mb-1">루틴명 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={200}
              placeholder="예: 아침 스트레칭"
              className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark/60 mb-1">메모</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-extrabold text-dark">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            루틴 켜기
          </label>

          <div className="grid grid-cols-3 gap-2">
            {['DAILY', 'WEEKLY', 'MONTHLY'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, repeatType: type }))}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-black ${
                  form.repeatType === type ? 'border-dark bg-primary text-white' : 'border-dark/20 bg-accent text-dark'
                }`}
              >
                {type === 'DAILY' ? '매일' : type === 'WEEKLY' ? '요일' : '날짜'}
              </button>
            ))}
          </div>

          {form.repeatType === 'WEEKLY' && (
            <div className="flex flex-wrap gap-1.5">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, daysOfWeek: toggleNumber(prev.daysOfWeek, day.value) }))}
                  className={`h-9 w-9 rounded-full border-2 text-xs font-black ${
                    form.daysOfWeek.includes(day.value) ? 'border-dark bg-secondary text-white' : 'border-dark/20 bg-accent text-dark'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}

          {form.repeatType === 'MONTHLY' && (
            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, daysOfMonth: toggleNumber(prev.daysOfMonth, day) }))}
                  className={`h-8 rounded border-2 text-xs font-black ${
                    form.daysOfMonth.includes(day) ? 'border-dark bg-secondary text-white' : 'border-dark/20 bg-accent text-dark'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-dark/60 mb-1">루틴 실행 시간</label>
              <input
                type="time"
                value={form.createTime}
                onChange={(e) => setForm((prev) => ({ ...prev, createTime: e.target.value }))}
                className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark/60 mb-1">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark/60 mb-1">종료일</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="btn-kitschy flex-1 bg-primary text-white text-sm py-2 disabled:opacity-50"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '추가'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-kitschy bg-accent text-dark text-sm py-2">
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
