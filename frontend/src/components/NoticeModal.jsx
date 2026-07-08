import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import MarkdownRenderer from './MarkdownRenderer'

function formatDate(value) {
  if (!value) return ''
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function NoticeModal({ notice, onClose }) {
  if (!notice) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overlay-retro px-4" onClick={onClose}>
      <div
        className="card-retro w-full max-w-lg max-h-[82vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-primary">Notice</p>
            <h2 className="font-dungeon text-dark mt-1 text-xl leading-tight">{notice.title}</h2>
            <p className="mt-2 text-xs font-semibold text-sub">{formatDate(notice.publishAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0 rounded-lg border border-line text-sm font-black text-sub transition-colors hover:bg-chip hover:text-dark"
          >
            X
          </button>
        </div>

        <div className="rounded-lg border-2 border-line bg-card p-4">
          <MarkdownRenderer content={notice.content} />
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            to="/notices"
            onClick={onClose}
            className="btn-retro flex-1 bg-accent py-2 text-center text-sm text-dark"
          >
            지난 공지
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-retro-primary flex-1 py-2 text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
