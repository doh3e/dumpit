import { useEffect, useMemo, useState } from 'react'
import api, { getApiErrorMessage } from '../services/api'
import { parseDate } from '../utils/dates'

const WEEK_DAYS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 7, label: '일' },
]

const MONTHLY_ORDINALS = [
  { value: 1, label: '첫째' },
  { value: 2, label: '둘째' },
  { value: 3, label: '셋째' },
  { value: 4, label: '넷째' },
  { value: 5, label: '다섯째' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  enabled: true,
  repeatType: 'DAILY',
  daysOfWeek: [],
  daysOfMonth: [],
  monthlyWeekOrdinal: 1,
  monthlyWeekDay: 1,
  runOnLastDayIfMissing: false,
  hasStartTime: false,
  startTime: '06:00',
  hasEndTime: false,
  endTime: '07:00',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
}

function formatDate(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatDateTime(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
      ? `매월 ${[...routine.daysOfMonth].sort((a, b) => a - b).join(', ')}일`
      : '날짜 미설정'
  }
  if (routine.repeatType === 'MONTHLY_WEEKDAY') {
    const ordinal = MONTHLY_ORDINALS.find((item) => item.value === routine.monthlyWeekOrdinal)?.label
    const day = WEEK_DAYS.find((item) => item.value === routine.monthlyWeekDay)?.label
    return ordinal && day ? `매월 ${ordinal} ${day}요일` : '월간 요일 미설정'
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
      monthlyWeekOrdinal: routine.monthlyWeekOrdinal || 1,
      monthlyWeekDay: routine.monthlyWeekDay || 1,
      runOnLastDayIfMissing: Boolean(routine.runOnLastDayIfMissing),
      hasStartTime: Boolean(routine.routineStartTime || routine.createTime),
      startTime: (routine.routineStartTime || routine.createTime)?.slice(0, 5) || '06:00',
      hasEndTime: Boolean(routine.routineEndTime),
      endTime: routine.routineEndTime?.slice(0, 5) || '07:00',
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
    monthlyWeekOrdinal: form.repeatType === 'MONTHLY_WEEKDAY' ? form.monthlyWeekOrdinal : null,
    monthlyWeekDay: form.repeatType === 'MONTHLY_WEEKDAY' ? form.monthlyWeekDay : null,
    runOnLastDayIfMissing: form.repeatType === 'MONTHLY' ? form.runOnLastDayIfMissing : false,
    createTime: form.hasStartTime ? form.startTime : null,
    routineStartTime: form.hasStartTime ? form.startTime : null,
    routineEndTime: form.hasStartTime && form.hasEndTime ? form.endTime : null,
    startDate: form.startDate,
    endDate: form.endDate || null,
  })

  const saveRoutine = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || saving) return
    if (form.hasStartTime && form.hasEndTime && form.endTime <= form.startTime) {
      setError('종료 시간은 시작 시간 이후로 설정해주세요.')
      return
    }

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
          <h2 className="font-dungeon text-dark text-2xl">루틴</h2>
          <p className="mt-2 text-sm font-semibold text-sub">
            정해둔 날짜나 요일에 루틴명과 같은 태스크를 자동으로 만들어요.
          </p>
        </div>
        <div className="card-retro !py-3">
          <p className="text-xs font-bold text-sub">활성 루틴</p>
          <p className="text-xl font-black text-primary">
            {routines.filter((routine) => routine.enabled).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="card-retro !py-3 tone-overdue">
          <p className="text-sm font-bold text-primary">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.7fr)] gap-6">
        <section className="card-retro">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-galmuri font-bold text-base text-dark">루틴 목록</h3>
            <button type="button" onClick={resetForm} className="btn-retro text-xs py-1.5">
              새 루틴
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center font-bold text-sub">불러오는 중...</div>
          ) : sortedRoutines.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-extrabold text-dark">아직 루틴이 없어요</p>
              <p className="mt-2 text-xs font-semibold text-sub">반복되는 일을 하나 등록해보세요.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[34rem] overflow-y-auto pr-1">
              {sortedRoutines.map((routine) => (
                <div
                  key={routine.routineId}
                  className={`rounded-lg border-2 p-3 ${
                    routine.enabled ? 'border-line bg-card' : 'border-line bg-card opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => editRoutine(routine)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[0.625rem] font-black ${
                          routine.enabled ? 'bg-secondary text-on-accent border-secondary' : 'bg-accent text-dark border-line'
                        }`}>
                          {routine.enabled ? 'ON' : 'OFF'}
                        </span>
                        <span className="text-[0.625rem] font-black text-sub">{formatRule(routine)}</span>
                        <span className="text-[0.625rem] font-black text-sub">
                          {routine.routineStartTime || routine.createTime
                            ? `${(routine.routineStartTime || routine.createTime).slice(0, 5)}${routine.routineEndTime ? `-${routine.routineEndTime.slice(0, 5)}` : ''}`
                            : '하루 안'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-dark">{routine.name}</p>
                      <p className="mt-1 text-[0.625rem] font-semibold text-sub">
                        {formatDate(routine.startDate)} 시작
                        {routine.endDate && ` · ${formatDate(routine.endDate)} 종료`}
                        {routine.lastGeneratedDate && ` · 마지막 생성 ${formatDate(routine.lastGeneratedDate)}`}
                        {routine.nextRunAt && ` · 다음 ${formatDateTime(routine.nextRunAt)}`}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(routine)}
                        className="rounded border-2 border-line bg-accent px-2 py-1 text-xs font-black text-dark"
                      >
                        {routine.enabled ? '끄기' : '켜기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoutine(routine)}
                        className="rounded border-2 tone-overdue px-2 py-1 text-xs font-black text-primary"
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

        <form onSubmit={saveRoutine} className="card-retro space-y-4">
          <div>
            <p className="text-[0.625rem] font-bold text-sub">{editingId ? '편집 중' : '새 루틴'}</p>
            <h3 className="mt-1 font-galmuri font-bold text-base text-dark">루틴 설정</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-sub mb-1">루틴명 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={200}
              placeholder="예: 아침 스트레칭"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-bold outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-sub mb-1">메모</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['DAILY', 'WEEKLY', 'MONTHLY', 'MONTHLY_WEEKDAY'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, repeatType: type }))}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-black ${
                  form.repeatType === type ? 'border-edge bg-primary text-on-accent' : 'border-line bg-accent text-dark'
                }`}
              >
                {type === 'DAILY' ? '매일' : type === 'WEEKLY' ? '요일' : type === 'MONTHLY' ? '날짜' : '주차'}
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
                    form.daysOfWeek.includes(day.value) ? 'border-edge bg-secondary text-on-accent' : 'border-line bg-accent text-dark'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}

          {form.repeatType === 'MONTHLY' && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, daysOfMonth: toggleNumber(prev.daysOfMonth, day) }))}
                    className={`h-8 rounded border-2 text-xs font-black ${
                      form.daysOfMonth.includes(day) ? 'border-edge bg-secondary text-on-accent' : 'border-line bg-accent text-dark'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <label className="flex items-start gap-2 rounded-lg border-2 border-line bg-accent px-3 py-2 text-xs font-extrabold text-dark">
                <input
                  type="checkbox"
                  checked={form.runOnLastDayIfMissing}
                  onChange={(e) => setForm((prev) => ({ ...prev, runOnLastDayIfMissing: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>특정 달에 존재하지 않는 날짜는 해당 달의 마지막 일자에 실행하기</span>
              </label>
            </div>
          )}

          {form.repeatType === 'MONTHLY_WEEKDAY' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">몇째 주</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {MONTHLY_ORDINALS.map((ordinal) => (
                    <button
                      key={ordinal.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, monthlyWeekOrdinal: ordinal.value }))}
                      className={`h-9 rounded border-2 text-xs font-black ${
                        form.monthlyWeekOrdinal === ordinal.value ? 'border-edge bg-secondary text-on-accent' : 'border-line bg-accent text-dark'
                      }`}
                    >
                      {ordinal.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-sub mb-1">요일</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, monthlyWeekDay: day.value }))}
                      className={`h-9 w-9 rounded-full border-2 text-xs font-black ${
                        form.monthlyWeekDay === day.value ? 'border-edge bg-secondary text-on-accent' : 'border-line bg-accent text-dark'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[0.6875rem] font-semibold text-sub">
                선택한 주차의 요일이 없는 달에는 태스크를 만들지 않아요.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-sub mb-1">
                <input
                  type="checkbox"
                  checked={form.hasStartTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, hasStartTime: e.target.checked, hasEndTime: e.target.checked ? prev.hasEndTime : false }))}
                  className="h-4 w-4 accent-primary"
                />
                시작 시간 지정
              </label>
              {form.hasStartTime ? (
                <div className="space-y-2">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-bold outline-none"
                  />
                  <label className="flex items-center gap-2 text-xs font-bold text-sub">
                    <input
                      type="checkbox"
                      checked={form.hasEndTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, hasEndTime: e.target.checked }))}
                      className="h-4 w-4 accent-primary"
                    />
                    종료 시간도 지정
                  </label>
                  {form.hasEndTime ? (
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-bold outline-none"
                    />
                  ) : (
                    <div className="rounded-lg border-2 border-line bg-accent px-3 py-2 text-xs font-extrabold text-sub">
                      종료 시간 없음 · 일과 끝나는 시각 마감
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-line bg-accent px-3 py-2 text-xs font-extrabold text-sub">
                  오늘 안에 완료 · 일과 끝나는 시각 마감
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-sub mb-1">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sub mb-1">종료일</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-bold outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="btn-retro flex-1 bg-primary text-on-accent text-sm py-2 disabled:opacity-50"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '추가'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-retro text-sm py-2">
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
