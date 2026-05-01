import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getApiErrorMessage } from '../services/api'
import AiUsageBadge from '../components/AiUsageBadge'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'

const PLACEHOLDER = `예) 내일까지 기획서 초안 써야 하고, 이번 주 금요일 팀 발표 준비도 해야 해. 오늘 점심 약속 있고 오후엔 헬스장도 가야 함. 아, 이메일 답장도 밀려있어...`

const PRIORITY_COLOR = {
  높음: 'bg-primary text-white border-dark',
  중간: 'bg-secondary text-white border-dark',
  낮음: 'bg-accent text-dark border-dark',
}

function getPriorityLabel(score) {
  if (score >= 0.7) return '높음'
  if (score >= 0.4) return '중간'
  return '낮음'
}

function formatDeadline(value) {
  if (!value) return null
  const d = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BrainDumpPage() {
  const aiUsage = useAiUsage()
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await api.post('/brain-dump', { rawText: text.trim() })
      setResult(res.data)
      setSelected(res.data.tasks.map(() => true))
      dispatchAiUsed()
    } catch (err) {
      setError(getApiErrorMessage(err, 'AI 분석에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleAll = (value) => setSelected(result.tasks.map(() => value))

  const handleConfirm = async (all) => {
    const tasks = result.tasks
      .filter((_, i) => all || selected[i])
      .map((t) => ({
        title: t.title,
        description: t.description || null,
        priorityScore: t.aiPriorityScore ?? 0.5,
        category: t.category || 'OTHER',
        deadline: t.deadline || null,
        estimatedMinutes: t.estimatedMinutes || null,
      }))

    if (tasks.length === 0) {
      alert('등록할 태스크를 하나 이상 선택해주세요.')
      return
    }

    setIsSaving(true)
    try {
      await api.post(`/brain-dump/${result.dumpId}/confirm`, { tasks })
      navigate('/dashboard')
    } catch (err) {
      alert(getApiErrorMessage(err, '태스크 등록에 실패했어요.'))
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = selected.filter(Boolean).length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="heading-kitschy text-2xl">브레인 덤프</h2>
        <p className="mt-2 text-sm font-semibold text-dark/60">
          머릿속에 있는 할 일을 그냥 쏟아내세요. 형식 없이 자유롭게 써도 OK!
        </p>
      </div>

      <div className="card-kitschy">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          maxLength={3000}
          className="w-full resize-none bg-transparent font-semibold text-dark placeholder:text-dark/30 outline-none text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dark/10">
          <span className="text-xs text-dark/40 font-medium">{text.length} / 3000자 입력됨</span>
          <div className="flex gap-3">
            <button
              onClick={() => { setText(''); setResult(null); setError(null); setSelected([]) }}
              className="btn-kitschy bg-accent text-dark text-sm py-2"
            >
              지우기
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || isAnalyzing || !aiUsage.hasEnough(5)}
              className="btn-kitschy bg-primary text-white text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '분석 중...' : 'AI 분석하기'}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <AiUsageBadge usage={aiUsage.usage} cost={5} />
        </div>
      </div>

      {error && (
        <div className="card-kitschy bg-primary/10 border-primary">
          <p className="font-bold text-primary text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="heading-kitschy text-lg">AI 분석 결과</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleAll(true)} className="text-xs font-black text-dark/50 hover:text-primary">
                전체 선택
              </button>
              <span className="text-dark/20">|</span>
              <button onClick={() => toggleAll(false)} className="text-xs font-black text-dark/50 hover:text-primary">
                전체 해제
              </button>
            </div>
          </div>

          {result.tasks.map((item, i) => {
            const priorityLabel = getPriorityLabel(item.aiPriorityScore ?? 0.5)
            const deadlineStr = formatDeadline(item.deadline)
            const isChecked = selected[i] ?? true

            return (
              <label
                key={i}
                className={`flex items-start gap-3 card-kitschy cursor-pointer transition-opacity ${isChecked ? '' : 'opacity-40'}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setSelected((prev) => prev.map((v, idx) => idx === i ? e.target.checked : v))}
                  className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
                />
                <span className="text-xl font-black text-primary font-display leading-none mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-dark">{item.title}</p>
                  {(deadlineStr || item.estimatedMinutes) && (
                    <p className="text-xs text-dark/50 font-medium mt-0.5">
                      {deadlineStr && `마감: ${deadlineStr}`}
                      {deadlineStr && item.estimatedMinutes && ' · '}
                      {item.estimatedMinutes && `예상 ${item.estimatedMinutes}분`}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 flex-shrink-0 ${PRIORITY_COLOR[priorityLabel]}`}>
                  {priorityLabel}
                </span>
              </label>
            )
          })}

          <div className="flex gap-3 mt-4">
            <button onClick={() => { setText(''); setResult(null); setSelected([]) }} className="btn-kitschy bg-accent text-dark font-extrabold text-sm">
              새로 작성
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={isSaving || selectedCount === 0}
              className="btn-kitschy flex-1 bg-secondary text-white font-extrabold text-sm disabled:opacity-50"
            >
              {isSaving ? '등록 중...' : `선택한 ${selectedCount}개 등록`}
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={isSaving}
              className="btn-kitschy flex-1 bg-primary text-white font-extrabold text-sm disabled:opacity-50"
            >
              {isSaving ? '등록 중...' : '모두 등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
