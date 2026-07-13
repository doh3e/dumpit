import { useEffect, useState } from 'react'
import api from '../services/api'
import MarkdownRenderer from '../components/MarkdownRenderer'

function parseDate(value) {
  if (!value) return null
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDay(value) {
  const date = parseDate(value)
  if (!date) return '-'
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

// updatedAt은 생성 시에도 자동 세팅되므로 1분 이상 차이날 때만 실제 수정으로 본다
function editedDate(notice) {
  const created = parseDate(notice.createdAt)
  const updated = parseDate(notice.updatedAt)
  if (!created || !updated) return null
  return updated.getTime() - created.getTime() >= 60_000 ? updated : null
}

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_4.75rem] sm:grid-cols-[minmax(0,1fr)_4.75rem_4.75rem]'
const PAGE_BTN =
  'h-9 min-w-[2.25rem] rounded-lg border-[1.5px] border-edge bg-card px-2 font-dungeon text-xs text-dark transition-colors hover:bg-chip disabled:opacity-40 disabled:hover:bg-card'
const PAGE_WINDOW = 5

function NoticeRow({ notice, isPinned, expanded, onToggle }) {
  const edited = editedDate(notice)
  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`grid w-full ${GRID_COLS} items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-chip ${isPinned ? 'bg-chip' : ''}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {isPinned && (
            <span aria-label="고정 공지" className="flex-shrink-0 text-xs">
              📌
            </span>
          )}
          <span className={`truncate text-sm text-dark ${expanded ? 'font-black' : 'font-bold'}`}>{notice.title}</span>
          <span
            aria-hidden
            className={`flex-shrink-0 text-[0.5625rem] text-sub transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </span>
        <time className="text-center text-xs font-bold text-sub">{formatDay(notice.publishAt)}</time>
        <span className="hidden text-center text-xs font-bold text-sub sm:block">{edited ? formatDay(edited) : '-'}</span>
      </button>
      {expanded && (
        <div className="border-t border-dashed border-line px-4 py-4">
          <MarkdownRenderer content={notice.content} />
          {edited && <p className="mt-3 text-right text-[0.625rem] font-bold text-sub">마지막 수정 {formatDay(edited)}</p>}
        </div>
      )}
    </div>
  )
}

export default function NoticePage() {
  const [pinned, setPinned] = useState([])
  const [notices, setNotices] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/notices', { params: { page } })
      .then((res) => {
        if (cancelled) return
        const data = res.data || {}
        setPinned(Array.isArray(data.pinned) ? data.pinned : [])
        setNotices(Array.isArray(data.notices) ? data.notices : [])
        setTotalPages(Number.isInteger(data.totalPages) ? data.totalPages : 0)
      })
      .catch(() => {
        if (cancelled) return
        setPinned([])
        setNotices([])
        setTotalPages(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  const goPage = (next) => {
    setPage(next)
    setExpandedId(null)
  }

  const toggleRow = (noticeId) => {
    setExpandedId((prev) => (prev === noticeId ? null : noticeId))
  }

  const windowStart = Math.max(0, Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW))
  const pageNumbers = Array.from({ length: Math.min(PAGE_WINDOW, totalPages) }, (_, i) => windowStart + i)
  const isEmpty = pinned.length === 0 && notices.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-dungeon text-dark text-2xl">공지사항</h1>
        <p className="mt-2 text-sm font-semibold text-sub">업데이트와 운영 안내를 모아볼 수 있어요.</p>
      </div>

      {loading ? (
        <div className="card-retro py-12 text-center">
          <p className="font-bold text-sub">불러오는 중...</p>
        </div>
      ) : isEmpty ? (
        <div className="card-retro py-12 text-center">
          <p className="font-black text-dark">아직 공지가 없어요.</p>
        </div>
      ) : (
        <>
          <div className="card-retro overflow-hidden !p-0">
            <div className={`grid ${GRID_COLS} gap-2 border-b-2 border-line bg-accent px-4 py-2.5`}>
              <span className="label-retro">제목</span>
              <span className="label-retro text-center">등록일</span>
              <span className="label-retro hidden text-center sm:block">수정일</span>
            </div>
            {pinned.map((notice) => (
              <NoticeRow
                key={notice.noticeId}
                notice={notice}
                isPinned
                expanded={expandedId === notice.noticeId}
                onToggle={() => toggleRow(notice.noticeId)}
              />
            ))}
            {notices.map((notice) => (
              <NoticeRow
                key={notice.noticeId}
                notice={notice}
                isPinned={false}
                expanded={expandedId === notice.noticeId}
                onToggle={() => toggleRow(notice.noticeId)}
              />
            ))}
            {notices.length === 0 && (
              <p className="border-t border-line px-4 py-6 text-center text-xs font-bold text-sub">
                이 페이지에는 공지가 없어요.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <nav aria-label="공지 페이지" className="flex items-center justify-center gap-1.5">
              <button type="button" onClick={() => goPage(page - 1)} disabled={page === 0} className={PAGE_BTN}>
                ◀
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => goPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`${PAGE_BTN} ${n === page ? '!bg-primary !text-on-accent' : ''}`}
                >
                  {n + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages - 1}
                className={PAGE_BTN}
              >
                ▶
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
