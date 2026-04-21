import { useState } from 'react'
import api from '../services/api'

export default function EditTaskModal({ task, onClose, onUpdated }) {
  const [title, setTitle] = useState(task.title || '')
  const [description, setDescription] = useState(task.description || '')
  const [deadline, setDeadline] = useState(
    task.deadline ? task.deadline.slice(0, 16) : ''
  )
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimatedMinutes ?? ''
  )
  const [priorityScore, setPriorityScore] = useState(
    task.userPriorityScore ?? task.aiPriorityScore ?? 0.5
  )
  const isUserOverridden = task.userPriorityScore != null
  const [saving, setSaving] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      await api.patch(`/tasks/${task.taskId}`, {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        userPriorityScore: priorityScore,
      })
      onUpdated()
    } catch {
      alert('수정에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제할까요?')) return
    try {
      await api.delete(`/tasks/${task.taskId}`)
      onUpdated()
    } catch {
      alert('삭제에 실패했어요.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative card-kitschy w-full max-w-md mx-4 space-y-4"
      >
        <h3 className="heading-kitschy text-xl">일정 수정</h3>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">할 일 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">메모 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={2000}
            className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-dark/60 mb-1">마감일시 (선택)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark/60 mb-1">예상 시간 (분)</label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="60"
              min="1"
              className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">
            중요도 ({Math.round(priorityScore * 100)}점)
            {isUserOverridden && (
              <button
                type="button"
                onClick={() => setPriorityScore(task.aiPriorityScore ?? 0.5)}
                className="ml-2 text-[10px] text-primary underline"
              >
                AI 점수로 초기화
              </button>
            )}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorityScore}
            onChange={(e) => setPriorityScore(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-dark/40 font-bold mt-1">
            <span>낮음</span>
            <span>보통</span>
            <span>높음</span>
          </div>
          <button
            type="button"
            disabled={reanalyzing}
            onClick={async () => {
              setReanalyzing(true)
              try {
                const res = await api.post(`/tasks/${task.taskId}/reanalyze`)
                setPriorityScore(res.data.aiPriorityScore ?? 0.5)
              } catch {
                alert('AI 재분석에 실패했어요.')
              } finally {
                setReanalyzing(false)
              }
            }}
            className="mt-2 w-full text-xs font-bold text-primary border-2 border-primary rounded-lg py-1.5 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {reanalyzing ? 'AI 분석 중...' : 'AI 우선순위 재분석'}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="btn-kitschy bg-primary text-white text-sm py-2"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-kitschy flex-1 bg-accent text-dark text-sm py-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="btn-kitschy flex-1 bg-secondary text-white text-sm py-2 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
