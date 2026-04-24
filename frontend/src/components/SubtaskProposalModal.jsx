import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'

export default function SubtaskProposalModal({ task, onClose, onCreated }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [subtasks, setSubtasks] = useState([])

  useEffect(() => {
    api.post(`/tasks/${task.taskId}/split/propose`)
      .then((res) => {
        const proposed = (res.data.subtasks || []).map((s) => ({
          title: s.title || '',
          description: s.description || '',
          estimatedMinutes: s.estimatedMinutes ?? '',
          include: true,
        }))
        setSubtasks(proposed)
      })
      .catch(() => setError('AI 분할 제안에 실패했어요. 다시 시도해주세요.'))
      .finally(() => setLoading(false))
  }, [task.taskId])

  const updateField = (idx, key, value) => {
    setSubtasks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
    )
  }

  const handleSubmit = async () => {
    const selected = subtasks
      .filter((s) => s.include && s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        description: s.description.trim() || null,
        estimatedMinutes: s.estimatedMinutes ? parseInt(s.estimatedMinutes) : null,
      }))

    if (selected.length === 0) {
      alert('최소 1개 이상의 서브태스크를 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      await api.post(`/tasks/${task.taskId}/split`, { subtasks: selected })
      onCreated()
    } catch {
      alert('서브태스크 저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <div className="relative card-kitschy w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h3 className="heading-kitschy text-xl">태스크 쪼개기</h3>
          <p className="mt-1 text-xs font-semibold text-dark/60 truncate">
            원본: {task.title}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <p className="font-bold text-dark/50 text-sm">AI가 쪼개는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="font-bold text-primary text-sm">{error}</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-dark/50">
              저장하면 각 항목이 '{task.title}'의 하위 태스크로 만들어져요. 체크 해제하면 제외돼요.
            </p>

            <div className="space-y-3">
              {subtasks.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    s.include ? 'border-dark bg-accent' : 'border-dark/20 bg-white opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={s.include}
                      onChange={(e) => updateField(idx, 'include', e.target.checked)}
                      className="mt-1.5 w-4 h-4 accent-primary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={s.title}
                        onChange={(e) => updateField(idx, 'title', e.target.value)}
                        placeholder="서브태스크 제목"
                        className="w-full px-2 py-1 border-2 border-dark rounded text-sm font-bold bg-white outline-none focus:border-primary"
                        disabled={!s.include}
                      />
                      <textarea
                        value={s.description}
                        onChange={(e) => updateField(idx, 'description', e.target.value)}
                        rows={1}
                        placeholder="메모 (선택)"
                        className="w-full px-2 py-1 border-2 border-dark/30 rounded text-xs font-semibold bg-white outline-none focus:border-primary resize-none"
                        disabled={!s.include}
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-dark/60">예상 시간</label>
                        <input
                          type="number"
                          value={s.estimatedMinutes}
                          onChange={(e) => updateField(idx, 'estimatedMinutes', e.target.value)}
                          min="1"
                          placeholder="30"
                          className="w-20 px-2 py-1 border-2 border-dark/30 rounded text-xs font-bold bg-white outline-none focus:border-primary"
                          disabled={!s.include}
                        />
                        <span className="text-[10px] font-bold text-dark/60">분</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-kitschy flex-1 bg-accent text-dark text-sm py-2"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || error || saving}
            className="btn-kitschy flex-1 bg-secondary text-white text-sm py-2 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '선택한 항목 저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
