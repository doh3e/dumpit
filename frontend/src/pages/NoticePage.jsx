import { useEffect, useState } from 'react'
import api from '../services/api'

function formatDate(value) {
  if (!value) return ''
  const date = Array.isArray(value)
    ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function NoticePage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notices')
      .then((res) => setNotices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="heading-kitschy text-2xl">공지사항</h1>
        <p className="mt-2 text-sm font-semibold text-dark/60">업데이트와 운영 안내를 모아볼 수 있어요.</p>
      </div>

      {loading ? (
        <div className="card-kitschy py-12 text-center">
          <p className="font-bold text-dark/50">불러오는 중...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className="card-kitschy py-12 text-center">
          <p className="font-black text-dark">아직 공지가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <article key={notice.noticeId} className="card-kitschy !p-5">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-lg font-black leading-tight text-dark">{notice.title}</h2>
                <time className="text-xs font-bold text-dark/40">{formatDate(notice.publishAt)}</time>
              </div>
              <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-dark/70">
                {notice.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
