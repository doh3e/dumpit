import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const EMPTY_FORM = { title: '', content: '', pinned: false }

function parseDate(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    return new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
  }
  return new Date(value)
}

function formatDate(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IdeaDumpPage() {
  const [ideas, setIdeas] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchIdeas = () => {
    api.get('/ideas')
      .then((res) => setIdeas(res.data))
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchIdeas() }, [])

  const filteredIdeas = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return ideas

    return ideas.filter((idea) => (
      idea.title?.toLowerCase().includes(keyword)
      || idea.content?.toLowerCase().includes(keyword)
    ))
  }, [ideas, query])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || saving) return

    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        await api.patch(`/ideas/${editingId}`, {
          title: form.title.trim(),
          content: form.content.trim(),
          pinned: form.pinned,
        })
      } else {
        await api.post('/ideas', {
          title: form.title.trim(),
          content: form.content.trim(),
          pinned: form.pinned,
        })
      }
      resetForm()
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '아이디어를 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (idea) => {
    setEditingId(idea.ideaId)
    setForm({
      title: idea.title || '',
      content: idea.content || '',
      pinned: Boolean(idea.pinned),
    })
    setError(null)
  }

  const togglePin = async (idea) => {
    try {
      await api.patch(`/ideas/${idea.ideaId}`, { pinned: !idea.pinned })
      fetchIdeas()
    } catch {
      setError('핀 상태를 바꾸지 못했어요.')
    }
  }

  const deleteIdea = async (idea) => {
    if (!window.confirm('이 아이디어를 삭제할까요?')) return

    try {
      await api.delete(`/ideas/${idea.ideaId}`)
      if (editingId === idea.ideaId) resetForm()
      fetchIdeas()
    } catch {
      setError('아이디어를 삭제하지 못했어요.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="heading-kitschy text-2xl">아이디어 덤프</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            당장 할 일은 아니지만 놓치기 아까운 생각을 모아두세요.
          </p>
        </div>
        <div className="card-kitschy !py-3">
          <p className="text-xs font-bold text-dark/50">저장한 아이디어</p>
          <p className="text-xl font-black text-primary">{ideas.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <form onSubmit={handleSubmit} className="card-kitschy space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-dark">
              {editingId ? '아이디어 수정' : '빠른 저장'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-extrabold text-dark/50 hover:text-primary"
              >
                취소
              </button>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-black text-dark/50">제목</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={200}
              placeholder="언젠가 해보고 싶은 것"
              className="mt-2 w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-dark/50">메모</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              maxLength={5000}
              rows={8}
              placeholder="아직 태스크로 만들 필요 없는 생각을 편하게 적어두세요."
              className="mt-2 w-full resize-none rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-semibold leading-relaxed outline-none focus:border-primary"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-extrabold text-dark">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((prev) => ({ ...prev, pinned: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            위에 고정
          </label>

          {error && (
            <p className="rounded-lg border-2 border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!form.title.trim() || saving}
            className="btn-kitschy w-full bg-primary text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : editingId ? '수정 완료' : '아이디어 저장'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="card-kitschy !p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="아이디어 검색"
              className="w-full bg-transparent px-1 py-1 text-sm font-bold outline-none placeholder:text-dark/30"
            />
          </div>

          {loading ? (
            <div className="card-kitschy text-center py-12">
              <p className="font-bold text-dark/50">불러오는 중...</p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div className="card-kitschy text-center py-12">
              <p className="font-extrabold text-dark">
                {ideas.length === 0 ? '아직 저장한 아이디어가 없어요' : '검색 결과가 없어요'}
              </p>
              <p className="mt-2 text-xs font-semibold text-dark/50">
                떠오른 생각을 왼쪽에 던져두면 됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIdeas.map((idea) => (
                <article
                  key={idea.ideaId}
                  className={`card-kitschy !p-4 ${idea.pinned ? 'bg-yellow-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {idea.pinned && (
                          <span className="rounded-full border border-yellow-500 bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-dark">
                            고정
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-dark/40">
                          {formatDate(idea.updatedAt || idea.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-base font-black text-dark">
                        {idea.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePin(idea)}
                      className={`shrink-0 rounded-lg border-2 border-dark px-2 py-1 text-xs font-black ${
                        idea.pinned ? 'bg-yellow-300 text-dark' : 'bg-accent text-dark'
                      }`}
                    >
                      {idea.pinned ? '해제' : '고정'}
                    </button>
                  </div>

                  {idea.content && (
                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-dark/70">
                      {idea.content}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(idea)}
                      className="rounded-lg border-2 border-dark bg-white px-3 py-2 text-xs font-black text-dark hover:bg-accent"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteIdea(idea)}
                      className="rounded-lg border-2 border-primary bg-white px-3 py-2 text-xs font-black text-primary hover:bg-primary hover:text-white"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
