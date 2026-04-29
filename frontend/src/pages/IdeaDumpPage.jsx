import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { CATEGORIES, getCategory } from '../constants/categories'

const EMPTY_QUICK = { rawText: '', category: 'OTHER', parentIdeaId: '' }
const EMPTY_DETAIL = { title: '', content: '', category: 'OTHER', pinned: false, parentIdeaId: '' }

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
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function buildTreeRows(ideas, query, expandedIds) {
  const keyword = query.trim().toLowerCase()
  const byParent = new Map()
  const byId = new Map()

  ideas.forEach((idea) => {
    byId.set(idea.ideaId, idea)
    const key = idea.parentIdeaId || 'root'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(idea)
  })

  const matches = (idea) => {
    if (!keyword) return true
    return idea.title?.toLowerCase().includes(keyword) || idea.content?.toLowerCase().includes(keyword)
  }

  const hasMatchingDescendant = (idea) => {
    if (matches(idea)) return true
    return (byParent.get(idea.ideaId) || []).some(hasMatchingDescendant)
  }

  const rows = []
  const visit = (idea, depth) => {
    if (!hasMatchingDescendant(idea)) return
    const children = byParent.get(idea.ideaId) || []
    const isExpanded = Boolean(keyword) || expandedIds.has(idea.ideaId)
    rows.push({
      idea,
      depth,
      childCount: children.length,
      isExpanded,
    })
    if (isExpanded) children.forEach((child) => visit(child, depth + 1))
  }

  ;(byParent.get('root') || []).forEach((idea) => visit(idea, 0))
  ideas
    .filter((idea) => idea.parentIdeaId && !byId.has(idea.parentIdeaId))
    .forEach((idea) => visit(idea, 0))

  return rows
}

export default function IdeaDumpPage() {
  const [ideas, setIdeas] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [quickForm, setQuickForm] = useState(EMPTY_QUICK)
  const [detailForm, setDetailForm] = useState(EMPTY_DETAIL)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.ideaId === selectedId) || null,
    [ideas, selectedId]
  )

  const rows = useMemo(() => buildTreeRows(ideas, query, expandedIds), [ideas, query, expandedIds])
  const childCounts = useMemo(() => {
    const counts = new Map()
    ideas.forEach((idea) => {
      if (!idea.parentIdeaId) return
      counts.set(idea.parentIdeaId, (counts.get(idea.parentIdeaId) || 0) + 1)
    })
    return counts
  }, [ideas])

  const selectedChildren = useMemo(
    () => ideas.filter((idea) => idea.parentIdeaId === selectedId),
    [ideas, selectedId]
  )

  const selectableParents = useMemo(
    () => ideas.filter((idea) => idea.ideaId !== selectedId),
    [ideas, selectedId]
  )

  const toggleExpanded = (ideaId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(ideaId)) next.delete(ideaId)
      else next.add(ideaId)
      return next
    })
  }

  const fetchIdeas = () => {
    api.get('/ideas')
      .then((res) => {
        setIdeas(res.data)
        if (!selectedId && res.data.length > 0) setSelectedId(res.data[0].ideaId)
      })
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchIdeas() }, [])

  useEffect(() => {
    if (!selectedIdea) {
      setDetailForm(EMPTY_DETAIL)
      return
    }

    setDetailForm({
      title: selectedIdea.title || '',
      content: selectedIdea.content || '',
      category: selectedIdea.category || 'OTHER',
      pinned: Boolean(selectedIdea.pinned),
      parentIdeaId: selectedIdea.parentIdeaId || '',
    })
  }, [selectedIdea])

  const splitLines = (rawText) => rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  const handleQuickSubmit = async (event) => {
    event.preventDefault()
    const lines = splitLines(quickForm.rawText)
    if (lines.length === 0 || saving) return

    setSaving(true)
    setError(null)

    try {
      if (lines.length === 1) {
        const res = await api.post('/ideas', {
          title: lines[0],
          content: '',
          category: quickForm.category,
          parentIdeaId: quickForm.parentIdeaId || null,
        })
        setSelectedId(res.data.ideaId)
      } else {
        const res = await api.post('/ideas/bulk', {
          rawText: quickForm.rawText,
          category: quickForm.category,
          parentIdeaId: quickForm.parentIdeaId || null,
        })
        if (res.data[0]) setSelectedId(res.data[0].ideaId)
      }
      setQuickForm(EMPTY_QUICK)
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '아이디어를 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const saveDetail = async () => {
    if (!selectedIdea || !detailForm.title.trim() || saving) return

    setSaving(true)
    setError(null)

    try {
      const res = await api.patch(`/ideas/${selectedIdea.ideaId}`, {
        title: detailForm.title.trim(),
        content: detailForm.content.trim(),
        category: detailForm.category,
        pinned: detailForm.pinned,
        parentIdeaId: detailForm.parentIdeaId || null,
      })
      setSelectedId(res.data.ideaId)
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '아이디어를 수정하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const addChildIdea = async () => {
    if (!selectedIdea || saving) return

    setSaving(true)
    setError(null)

    try {
      const res = await api.post('/ideas', {
        title: '새 하위 아이디어',
        content: '',
        category: selectedIdea.category || 'OTHER',
        parentIdeaId: selectedIdea.ideaId,
      })
      setExpandedIds((prev) => new Set(prev).add(selectedIdea.ideaId))
      setSelectedId(res.data.ideaId)
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '하위 아이디어를 만들지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const convertToTask = async () => {
    if (!selectedIdea || selectedIdea.convertedTaskId || saving) return

    setSaving(true)
    setError(null)

    try {
      await api.post(`/ideas/${selectedIdea.ideaId}/convert-to-task`)
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '태스크로 전환하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const deleteSelected = async () => {
    if (!selectedIdea || !window.confirm('이 아이디어를 삭제할까요?')) return

    try {
      await api.delete(`/ideas/${selectedIdea.ideaId}`)
      setSelectedId(null)
      fetchIdeas()
    } catch (err) {
      setError(err.response?.data?.error || '아이디어를 삭제하지 못했어요.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="heading-kitschy text-2xl">아이디어 덤프</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            할 일로 만들기 전의 생각을 모으고, 묶고, 필요할 때 태스크로 바꿔요.
          </p>
        </div>
        <div className="card-kitschy !py-3">
          <p className="text-xs font-bold text-dark/50">저장한 아이디어</p>
          <p className="text-xl font-black text-primary">{ideas.length}</p>
        </div>
      </div>

      <form onSubmit={handleQuickSubmit} className="card-kitschy space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_160px_200px] gap-3">
          <textarea
            value={quickForm.rawText}
            onChange={(e) => setQuickForm((prev) => ({ ...prev, rawText: e.target.value }))}
            rows={3}
            maxLength={5000}
            placeholder={'아이디어를 한 줄에 하나씩 적어보세요.\n여러 줄이면 각각 따로 저장됩니다.'}
            className="w-full resize-none rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
          />
          <select
            value={quickForm.category}
            onChange={(e) => setQuickForm((prev) => ({ ...prev, category: e.target.value }))}
            className="rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-extrabold outline-none"
          >
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          <select
            value={quickForm.parentIdeaId}
            onChange={(e) => setQuickForm((prev) => ({ ...prev, parentIdeaId: e.target.value }))}
            className="rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-extrabold outline-none"
          >
            <option value="">상위 없음</option>
            {ideas.map((idea) => (
              <option key={idea.ideaId} value={idea.ideaId}>{idea.title}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!quickForm.rawText.trim() || saving}
          className="btn-kitschy bg-primary text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          줄 단위로 저장
        </button>
      </form>

      {error && (
        <div className="card-kitschy !py-3 bg-primary/10 border-primary">
          <p className="text-sm font-bold text-primary">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)] gap-6">
        <section className="space-y-3">
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
          ) : rows.length === 0 ? (
            <div className="card-kitschy text-center py-12">
              <p className="font-extrabold text-dark">아이디어가 아직 없어요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(({ idea, depth, childCount, isExpanded }) => {
                const category = getCategory(idea.category)
                const isSelected = selectedId === idea.ideaId
                return (
                  <div
                    key={idea.ideaId}
                    className={`flex items-start gap-2 rounded-lg border-2 bg-white p-3 transition-colors ${
                      isSelected ? 'border-dark bg-white shadow-kitschy' : 'border-dark/10 bg-white hover:border-dark/30'
                    }`}
                    style={{ paddingLeft: `${12 + depth * 18}px` }}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleExpanded(idea.ideaId)
                      }}
                      disabled={childCount === 0}
                      aria-label={isExpanded ? '하위 아이디어 접기' : '하위 아이디어 펼치기'}
                      className="mt-0.5 h-6 w-6 shrink-0 rounded border-2 border-dark/20 bg-accent text-xs font-black text-dark disabled:invisible"
                    >
                      {isExpanded ? '⌄' : '›'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(idea.ideaId)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${category.color}`}>
                          {category.label}
                        </span>
                        {idea.pinned && <span className="text-[10px] font-black text-yellow-600">고정</span>}
                        {idea.convertedTaskId && <span className="text-[10px] font-black text-secondary">태스크 전환됨</span>}
                        {childCount > 0 && <span className="text-[10px] font-black text-dark/40">하위 {childCount}</span>}
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-dark">{idea.title}</p>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card-kitschy min-h-[28rem]">
          {!selectedIdea ? (
            <div className="h-full min-h-[20rem] flex items-center justify-center text-center">
              <div>
                <p className="font-extrabold text-dark">아이디어를 선택하세요</p>
                <p className="mt-2 text-xs font-semibold text-dark/50">목록 제목을 누르면 세부 메모를 편집할 수 있어요.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-dark/40">수정 {formatDate(selectedIdea.updatedAt)}</p>
                  <h3 className="mt-1 text-lg font-black text-dark">아이디어 상세</h3>
                </div>
                <label className="flex items-center gap-2 text-sm font-extrabold text-dark">
                  <input
                    type="checkbox"
                    checked={detailForm.pinned}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, pinned: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  고정
                </label>
              </div>

              <input
                value={detailForm.title}
                onChange={(e) => setDetailForm((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={200}
                className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-base font-black outline-none focus:border-primary"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={detailForm.category}
                  onChange={(e) => setDetailForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-extrabold outline-none"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
                <select
                  value={detailForm.parentIdeaId}
                  onChange={(e) => setDetailForm((prev) => ({ ...prev, parentIdeaId: e.target.value }))}
                  className="rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-extrabold outline-none"
                >
                  <option value="">상위 없음</option>
                  {selectableParents.map((idea) => (
                    <option key={idea.ideaId} value={idea.ideaId}>{idea.title}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={detailForm.content}
                onChange={(e) => setDetailForm((prev) => ({ ...prev, content: e.target.value }))}
                maxLength={5000}
                rows={12}
                placeholder="이 아이디어의 세부 메모를 적어두세요."
                className="w-full resize-none rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-semibold leading-relaxed outline-none focus:border-primary"
              />

              <div className="rounded-lg border-2 border-dark/20 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-black text-dark">자녀 아이디어</h4>
                  <span className="text-[10px] font-black text-dark/40">{selectedChildren.length}개</span>
                </div>
                {selectedChildren.length === 0 ? (
                  <p className="mt-3 text-xs font-semibold text-dark/40">아직 연결된 하위 아이디어가 없어요.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedChildren.map((child) => {
                      const category = getCategory(child.category)
                      return (
                        <button
                          key={child.ideaId}
                          type="button"
                          onClick={() => setSelectedId(child.ideaId)}
                          className="w-full rounded-lg border-2 border-dark/10 bg-accent/40 px-3 py-2 text-left hover:border-dark/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${category.color}`}>
                              {category.label}
                            </span>
                            {child.convertedTaskId && <span className="text-[10px] font-black text-secondary">태스크 전환됨</span>}
                          </div>
                          <p className="mt-1 truncate text-sm font-black text-dark">{child.title}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveDetail}
                  disabled={!detailForm.title.trim() || saving}
                  className="btn-kitschy bg-primary text-white text-sm py-2 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={addChildIdea}
                  disabled={saving}
                  className="btn-kitschy bg-secondary text-white text-sm py-2 disabled:opacity-50"
                >
                  하위 아이디어
                </button>
                <button
                  type="button"
                  onClick={convertToTask}
                  disabled={saving || Boolean(selectedIdea.convertedTaskId)}
                  className="btn-kitschy bg-dark text-white text-sm py-2 disabled:opacity-50"
                >
                  {selectedIdea.convertedTaskId ? '태스크 전환됨' : '태스크로 전환'}
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={saving || childCounts.get(selectedIdea.ideaId) > 0}
                  className="btn-kitschy bg-accent text-primary text-sm py-2 disabled:opacity-40"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
