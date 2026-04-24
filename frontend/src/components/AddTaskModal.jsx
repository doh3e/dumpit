import { useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { CATEGORIES } from '../constants/categories'

export default function AddTaskModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        category: category || null,
      })
      onCreated()
    } catch {
      alert('태스크 생성에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative card-kitschy w-full max-w-md mx-4 space-y-4"
      >
        <h3 className="heading-kitschy text-xl">일정 추가</h3>

        <div>
          <label className="block text-xs font-bold text-dark/60 mb-1">할 일 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="어떤 일을 해야 하나요?"
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
            placeholder="추가 정보가 있다면..."
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
            카테고리 (비워두면 AI가 자동 분류)
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                category === ''
                  ? 'bg-dark text-white border-dark'
                  : 'bg-accent text-dark border-dark/20 hover:border-dark'
              }`}
            >
              AI 자동
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                  category === c.value
                    ? 'bg-primary text-white border-dark'
                    : 'bg-accent text-dark border-dark/20 hover:border-dark'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-dark/40 font-medium">
          AI가 자동으로 우선순위를 매기고, 나중에 직접 조정할 수 있어요.
        </p>

        <div className="flex gap-3 pt-2">
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
            className="btn-kitschy flex-1 bg-primary text-white text-sm py-2 disabled:opacity-50"
          >
            {saving ? 'AI 분석 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
