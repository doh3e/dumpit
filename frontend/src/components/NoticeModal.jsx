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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-dark/40 px-4" onClick={onClose}>
      <div
        className="card-kitschy w-full max-w-lg max-h-[82vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-primary">Notice</p>
            <h2 className="heading-kitschy mt-1 text-xl leading-tight">{notice.title}</h2>
            <p className="mt-2 text-xs font-semibold text-dark/50">{formatDate(notice.publishAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0 rounded-lg border-2 border-dark text-sm font-black text-dark transition-colors hover:bg-primary hover:text-white"
          >
            X
          </button>
        </div>

        <div className="rounded-lg border-2 border-dark/10 bg-white p-4">
          <MarkdownRenderer content={notice.content} />
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            to="/notices"
            onClick={onClose}
            className="btn-kitschy flex-1 bg-accent py-2 text-center text-sm text-dark"
          >
            지난 공지
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-kitschy flex-1 bg-primary py-2 text-sm text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
