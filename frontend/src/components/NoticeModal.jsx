import { Link } from 'react-router-dom'
import MarkdownRenderer from './MarkdownRenderer'
import Dialog from './Dialog'

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

  return (
    <Dialog onClose={onClose} title={notice.title} variant="refined" className="w-full max-w-lg p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.625rem] font-black uppercase text-primary">Notice</p>
          <h2 className="page-refined-heading mt-1 text-xl leading-tight">{notice.title}</h2>
          <p className="mt-2 text-xs font-semibold text-sub">{formatDate(notice.publishAt)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="btn-refined btn-refined-text !h-11 !w-11 flex-shrink-0 !p-0 text-sm text-dark"
        >
          X
        </button>
      </div>

      <div className="surface-refined border border-line p-4">
        <MarkdownRenderer content={notice.content} />
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/notices"
          onClick={onClose}
          className="btn-refined flex-1 text-center text-sm"
        >
          지난 공지
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="btn-refined btn-refined-primary flex-1 text-sm"
        >
          확인
        </button>
      </div>
    </Dialog>
  )
}
