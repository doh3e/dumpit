import { useState, useEffect } from 'react'
import api from '../services/api'

const STATUS_LABEL = {
  PENDING: { label: '대기 중', color: 'bg-yellow-100 text-yellow-700 border-yellow-400' },
  REPLIED: { label: '답변 완료', color: 'bg-green-100 text-green-700 border-green-400' },
  CLOSED: { label: '종료', color: 'bg-gray-100 text-gray-600 border-gray-400' },
}

function formatDate(v) {
  if (!v) return ''
  if (Array.isArray(v)) {
    const d = new Date(v[0], (v[1] || 1) - 1, v[2] || 1, v[3] || 0, v[4] || 0, v[5] || 0)
    return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
  }
  return new Date(v).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminPage() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const fetchInquiries = () => {
    setLoading(true)
    api.get('/admin/inquiries')
      .then((res) => setInquiries(res.data))
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchInquiries() }, [])

  const openInquiry = (inquiry) => {
    setSelected(inquiry)
    setReply(inquiry.adminReply || '')
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      await api.patch(`/admin/inquiries/${selected.inquiryId}/reply`, {
        reply: reply.trim(),
      })
      fetchInquiries()
      setSelected(null)
      setReply('')
    } catch {
      alert('답변 전송에 실패했어요.')
    } finally {
      setSending(false)
    }
  }

  const pendingCount = inquiries.filter((i) => i.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-kitschy text-2xl">문의 관리</h2>
        <p className="mt-2 text-sm font-semibold text-dark/60">
          접수된 문의 {inquiries.length}건 · 대기 중 {pendingCount}건
        </p>
      </div>

      {loading ? (
        <div className="card-kitschy text-center py-12">
          <p className="font-bold text-dark/50">불러오는 중...</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="card-kitschy text-center py-12">
          <p className="font-extrabold text-dark text-base">접수된 문의가 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">문의 목록</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {inquiries.map((inquiry) => {
                const status = STATUS_LABEL[inquiry.status] ?? STATUS_LABEL.PENDING
                const isSelected = selected?.inquiryId === inquiry.inquiryId
                return (
                  <button
                    key={inquiry.inquiryId}
                    onClick={() => openInquiry(inquiry)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-dark/10 hover:border-dark/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-dark/50 font-bold">
                        {formatDate(inquiry.createdAt)}
                      </span>
                    </div>
                    <p className="font-extrabold text-dark text-sm truncate">{inquiry.subject}</p>
                    <p className="text-xs text-dark/60 font-semibold truncate">{inquiry.userEmail}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card-kitschy">
            <h3 className="font-extrabold text-dark mb-4">상세 / 답변</h3>
            {!selected ? (
              <div className="text-center py-12">
                <p className="font-bold text-dark/50 text-sm">왼쪽에서 문의를 선택하세요</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-accent rounded-lg border border-dark/10 space-y-2">
                  <p className="text-xs">
                    <span className="font-bold text-dark/60">유저:</span>{' '}
                    <a href={`mailto:${selected.userEmail}`} className="text-primary underline">
                      {selected.userEmail}
                    </a>
                  </p>
                  <p className="text-xs">
                    <span className="font-bold text-dark/60">접수:</span>{' '}
                    {formatDate(selected.createdAt)}
                  </p>
                  <p className="text-xs">
                    <span className="font-bold text-dark/60">제목:</span>{' '}
                    <span className="font-extrabold text-dark">{selected.subject}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">문의 내용</label>
                  <pre className="whitespace-pre-wrap p-3 bg-white border-2 border-dark/10 rounded-lg text-sm text-dark font-medium">
                    {selected.message}
                  </pre>
                </div>

                {selected.status === 'REPLIED' && selected.adminReply && (
                  <div>
                    <label className="block text-xs font-bold text-dark/60 mb-1">
                      이전 답변 ({formatDate(selected.repliedAt)})
                    </label>
                    <pre className="whitespace-pre-wrap p-3 bg-green-50 border-2 border-green-200 rounded-lg text-sm text-dark font-medium">
                      {selected.adminReply}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-dark/60 mb-1">
                    {selected.status === 'REPLIED' ? '답변 다시 보내기' : '답변 작성'}
                  </label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={6}
                    maxLength={10000}
                    placeholder="답변 내용을 입력하세요"
                    className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
                  />
                  <p className="text-[10px] text-dark/40 font-bold mt-1 text-right">
                    {reply.length} / 10000
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="btn-kitschy flex-1 bg-accent text-dark text-sm py-2"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!reply.trim() || sending}
                    className="btn-kitschy flex-1 bg-secondary text-white text-sm py-2 disabled:opacity-50"
                  >
                    {sending ? '전송 중...' : '답변 전송 (메일 발송)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
