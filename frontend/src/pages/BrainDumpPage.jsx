import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

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

export default function BrainDumpPage() {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await api.post('/brain-dump', { rawText: text.trim() })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'AI 분석에 실패했어요. 다시 시도해주세요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

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
          maxLength={5000}
          className="w-full resize-none bg-transparent font-semibold text-dark placeholder:text-dark/30 outline-none text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dark/10">
          <span className="text-xs text-dark/40 font-medium">{text.length}자 입력됨</span>
          <div className="flex gap-3">
            <button
              onClick={() => { setText(''); setResult(null); setError(null) }}
              className="btn-kitschy bg-accent text-dark text-sm py-2"
            >
              지우기
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || isAnalyzing}
              className="btn-kitschy bg-primary text-white text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '분석 중...' : 'AI 분석하기'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card-kitschy bg-primary/10 border-primary">
          <p className="font-bold text-primary text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <h3 className="heading-kitschy text-lg">AI 분석 결과</h3>
          {result.tasks.map((item, i) => {
            const priorityLabel = getPriorityLabel(item.aiPriorityScore ?? 0.5)
            return (
              <div key={item.taskId || i} className="card-kitschy flex items-start gap-4">
                <span className="text-xl font-black text-primary font-display">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <p className="font-extrabold text-dark">{item.title}</p>
                  <p className="text-xs text-dark/50 font-medium mt-0.5">
                    {item.deadline && `마감: ${new Date(item.deadline).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · `}
                    {item.estimatedMinutes && `예상 ${item.estimatedMinutes}분`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 flex-shrink-0 ${PRIORITY_COLOR[priorityLabel]}`}>
                  {priorityLabel}
                </span>
              </div>
            )
          })}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setText(''); setResult(null) }}
              className="btn-kitschy flex-1 bg-accent text-dark font-extrabold"
            >
              새로 작성
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-kitschy flex-1 bg-dark text-white font-extrabold"
            >
              대시보드로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
