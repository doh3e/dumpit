import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import api, { getApiErrorMessage } from '../services/api'
import { CATEGORIES, getCategory } from '../constants/categories'
import AiUsageBadge from '../components/AiUsageBadge'
import useAiUsage, { dispatchAiUsed } from '../hooks/useAiUsage'

const EMPTY_DETAIL = { title: '', content: '', category: 'OTHER', pinned: false, parentIdeaId: '' }
const SCRATCH_KEY = 'dumpit:idea-scratch'
const MAX_SCRATCH = 2000

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
    rows.push({ idea, depth, childCount: children.length, isExpanded })
    if (isExpanded) children.forEach((child) => visit(child, depth + 1))
  }

  ;(byParent.get('root') || []).forEach((idea) => visit(idea, 0))
  ideas
    .filter((idea) => idea.parentIdeaId && !byId.has(idea.parentIdeaId))
    .forEach((idea) => visit(idea, 0))

  return rows
}

function ExtractPreviewNode({ node, depth }) {
  const category = getCategory(node.category)
  return (
    <div style={{ paddingLeft: `${depth * 16}px` }} className="mt-1.5">
      <div className="rounded-lg border-2 border-dark/10 bg-white px-3 py-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${category.color}`}>
          {category.label}
        </span>
        <p className="mt-1 text-sm font-black text-dark">{node.title}</p>
        {node.content && <p className="mt-0.5 text-xs font-semibold text-dark/60">{node.content}</p>}
      </div>
      {node.children?.map((child, i) => (
        <ExtractPreviewNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function CategoryPills({ value, onChange, compact = false, iconOnly = false }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((category) => {
        const isSelected = value === category.value
        return (
          <div key={category.value} className={iconOnly ? 'relative group' : ''}>
            <button
              type="button"
              onClick={() => onChange(category.value)}
              className={`rounded-full border-2 font-bold transition-all ${
                iconOnly ? 'w-7 h-7 text-sm flex items-center justify-center' :
                compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
              } ${
                isSelected
                  ? 'border-dark bg-primary text-white shadow-[2px_2px_0_#2D2A32]'
                  : 'border-dark/15 bg-accent text-dark hover:border-dark/40'
              }`}
            >
              {iconOnly ? category.emoji : <><span aria-hidden="true">{category.emoji}</span> {category.label}</>}
            </button>
            {iconOnly && (
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-dark px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {category.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function IdeaDumpPage() {
  const [ideas, setIdeas] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [quickTitle, setQuickTitle] = useState('')
  const [detailForm, setDetailForm] = useState(EMPTY_DETAIL)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [scratchText, setScratchText] = useState(() => localStorage.getItem(SCRATCH_KEY) || '')
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState(null)
  const [inputMode, setInputMode] = useState('dump')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('OTHER')
  const [newParentId, setNewParentId] = useState('')
  const aiUsage = useAiUsage()

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

  const isDirty = useMemo(() => {
    if (!selectedIdea) return false
    return (
      detailForm.title !== (selectedIdea.title || '') ||
      detailForm.content !== (selectedIdea.content || '') ||
      detailForm.category !== (selectedIdea.category || 'OTHER') ||
      detailForm.pinned !== Boolean(selectedIdea.pinned) ||
      (detailForm.parentIdeaId || '') !== (selectedIdea.parentIdeaId || '')
    )
  }, [detailForm, selectedIdea])

  const blocker = useBlocker(isDirty)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 변경사항이 있어요. 페이지를 이동할까요?')) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSelectIdea = (ideaId) => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있어요. 다른 아이디어로 이동할까요?')) return
    setSelectedId(ideaId)
  }

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

  const handleNewIdeaKeyDown = async (e) => {
    if (e.key !== 'Enter' || !newTitle.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.post('/ideas', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        parentIdeaId: newParentId || null,
      })
      setNewTitle('')
      setNewContent('')
      setNewCategory('OTHER')
      setNewParentId('')
      setSelectedId(res.data.ideaId)
      fetchIdeas()
    } catch (err) {
      setError(getApiErrorMessage(err, '아이디어를 저장하지 못했어요.'))
    } finally {
      setSaving(false)
    }
  }

  const handleScratchChange = (value) => {
    if (value.length > MAX_SCRATCH) return
    setScratchText(value)
    localStorage.setItem(SCRATCH_KEY, value)
  }

  const scratchTokenCost = Math.max(1, Math.ceil(scratchText.length / 200))

  const handleExtract = async () => {
    if (!scratchText.trim() || extracting) return
    setExtracting(true)
    setError(null)
    setExtractResult(null)
    try {
      const res = await api.post('/ideas/ai-extract', { rawText: scratchText })
      setExtractResult(res.data.ideas || [])
      dispatchAiUsed()
    } catch (err) {
      setError(getApiErrorMessage(err, 'AI 분석에 실패했어요.'))
    } finally {
      setExtracting(false)
    }
  }

  const handleConfirmExtract = async () => {
    if (!extractResult || saving) return
    setSaving(true)
    setError(null)
    try {
      await api.post('/ideas/ai-extract/confirm', { ideas: extractResult })
      setScratchText('')
      localStorage.removeItem(SCRATCH_KEY)
      setExtractResult(null)
      fetchIdeas()
    } catch (err) {
      setError(getApiErrorMessage(err, '아이디어 저장에 실패했어요.'))
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
      setError(getApiErrorMessage(err, '아이디어를 수정하지 못했어요.'))
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
      setError(getApiErrorMessage(err, '하위 아이디어를 만들지 못했어요.'))
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
      dispatchAiUsed()
      fetchIdeas()
    } catch (err) {
      setError(getApiErrorMessage(err, '태스크로 전환하지 못했어요.'))
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
      setError(getApiErrorMessage(err, '아이디어를 삭제하지 못했어요.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="heading-kitschy text-2xl">아이디어 덤프</h2>
          <p className="mt-2 text-sm font-semibold text-dark/60">
            생각을 자유롭게 쏟아내고, AI가 맥락을 잡아 정리해줘요.
          </p>
        </div>
        <div className="card-kitschy !py-3">
          <p className="text-xs font-bold text-dark/50">저장한 아이디어</p>
          <p className="text-xl font-black text-primary">{ideas.length}</p>
        </div>
      </div>

      <div className="card-kitschy space-y-4">
        <div className="flex gap-2">
          {[{ key: 'dump', label: '덤프' }, { key: 'new', label: '새 아이디어' }].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setInputMode(key)}
              className={`rounded-full border-2 px-3 py-1 text-xs font-black transition-all ${
                inputMode === key
                  ? 'border-dark bg-dark text-white'
                  : 'border-dark/20 text-dark/50 hover:border-dark/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {inputMode === 'dump' ? (
          <>
            <textarea
              value={scratchText}
              onChange={(e) => handleScratchChange(e.target.value)}
              rows={7}
              placeholder={'생각나는 대로 자유롭게 적어보세요.\nAI가 맥락을 파악해 아이디어로 정리해줄 거예요.\n\n※ 분석 후 원본 텍스트는 보존되지 않아요.'}
              className="w-full resize-none bg-transparent text-sm font-semibold leading-relaxed text-dark outline-none placeholder:text-dark/30"
            />
            <div className="border-t-2 border-dark/10 pt-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-bold text-dark/50">
                {scratchText.length} / {MAX_SCRATCH}자
                {scratchText.trim() && (
                  <span className="ml-2 text-dark/40">· AI 토큰 <span className="text-primary">{scratchTokenCost}</span>개 소모</span>
                )}
              </p>
              <button
                type="button"
                onClick={handleExtract}
                disabled={!scratchText.trim() || extracting || !aiUsage.hasEnough(scratchTokenCost)}
                className="btn-kitschy bg-dark text-white text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? 'AI 분석 중...' : 'AI로 아이디어 추출'}
              </button>
            </div>
            <AiUsageBadge usage={aiUsage.usage} cost={scratchTokenCost} />
            {extractResult && (
              <div className="border-t-2 border-dark/10 pt-4 space-y-3">
                <p className="text-xs font-black text-dark/60">분석 결과 — 확인 후 저장하세요</p>
                <div>
                  {extractResult.map((node, i) => (
                    <ExtractPreviewNode key={i} node={node} depth={0} />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmExtract}
                    disabled={saving}
                    className="btn-kitschy bg-primary text-white text-sm py-2 disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractResult(null)}
                    className="btn-kitschy bg-accent text-dark text-sm py-2"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleNewIdeaKeyDown}
              placeholder="제목"
              maxLength={200}
              className="w-full bg-transparent text-sm font-black text-dark outline-none placeholder:text-dark/30"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="내용 (선택)"
              className="w-full resize-none rounded-lg border-2 border-dark/10 bg-accent/30 px-3 py-2 text-sm font-semibold leading-relaxed text-dark outline-none focus:border-dark/30 placeholder:text-dark/30"
            />
            <div className="border-t-2 border-dark/10 pt-3 flex flex-wrap items-center gap-2">
              <CategoryPills value={newCategory} onChange={setNewCategory} iconOnly />
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="rounded-lg border-2 border-dark bg-white px-2 py-1.5 text-xs font-extrabold outline-none max-w-[180px]"
              >
                <option value="">상위 아이디어 없음</option>
                {ideas.map((idea) => (
                  <option key={idea.ideaId} value={idea.ideaId}>{idea.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleNewIdeaKeyDown({ key: 'Enter' })}
                disabled={!newTitle.trim() || saving}
                className="btn-kitschy bg-primary text-white text-sm py-1.5 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>

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
              placeholder="검색"
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
                      className="mt-0.5 h-6 w-6 shrink-0 text-[10px] font-black leading-none text-dark/50 hover:text-dark disabled:invisible"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectIdea(idea.ideaId)}
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
                <p className="mt-2 text-xs font-semibold text-dark/50">목록에서 아이디어를 클릭하면 세부 내용을 편집할 수 있어요.</p>
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

              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-black text-dark/50">카테고리</p>
                  <CategoryPills
                    value={detailForm.category}
                    onChange={(category) => setDetailForm((prev) => ({ ...prev, category }))}
                    compact
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black text-dark/50">상위 아이디어</label>
                  <select
                    value={detailForm.parentIdeaId}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, parentIdeaId: e.target.value }))}
                    className="w-full rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-extrabold outline-none"
                  >
                    <option value="">상위 아이디어 없음</option>
                    {selectableParents.map((idea) => (
                      <option key={idea.ideaId} value={idea.ideaId}>{idea.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                value={detailForm.content}
                onChange={(e) => setDetailForm((prev) => ({ ...prev, content: e.target.value }))}
                maxLength={3000}
                rows={12}
                placeholder="이 아이디어의 세부 메모를 적어두세요."
                className="w-full resize-none rounded-lg border-2 border-dark bg-white px-3 py-2 text-sm font-semibold leading-relaxed outline-none focus:border-primary"
              />

              <div className="rounded-lg border-2 border-dark/20 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-black text-dark">하위 아이디어</h4>
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
                          onClick={() => handleSelectIdea(child.ideaId)}
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
