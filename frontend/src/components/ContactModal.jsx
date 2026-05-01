import { useState } from 'react'
import { createPortal } from 'react-dom'
import api, { getApiErrorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function ContactModal({ onClose }) {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await api.post('/inquiries', {
        subject: subject.trim(),
        message: message.trim(),
      })
      setSubmitted(true)
    } catch (err) {
      setError(getApiErrorMessage(err, '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />

      <div className="relative card-kitschy w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-kitschy text-xl">문의하기</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-dark font-black text-dark text-sm hover:bg-primary hover:text-white transition-colors"
          >
            X
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <p className="font-extrabold text-dark text-base">문의가 접수되었습니다!</p>
            <p className="text-sm text-dark/70">
              {user?.email}로 접수 안내 메일을 발송했어요.
              <br />
              영업일 기준 1~3일 내에 답변드리겠습니다.
            </p>
            <button type="button" onClick={onClose} className="btn-kitschy bg-secondary text-white text-sm py-2 px-6 mt-2">
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-xs text-dark/60 font-semibold p-3 bg-accent rounded-lg border border-dark/10">
              {user ? (
                <>답변은 <span className="font-bold text-dark">{user.email}</span>로 발송됩니다.</>
              ) : (
                '로그인 후 이용해주세요.'
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-dark/60 mb-1">제목 *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="간단한 제목을 입력해주세요"
                className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary"
                disabled={!user}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark/60 mb-1">내용 *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder="문의 내용을 자세히 적어주세요"
                className="w-full px-3 py-2 border-2 border-dark rounded-lg text-sm font-semibold bg-accent outline-none focus:border-primary resize-none"
                disabled={!user}
                required
              />
              <p className="text-[10px] text-dark/40 font-bold mt-1 text-right">
                {message.length} / 5000
              </p>
            </div>

            {error && <p className="text-xs font-bold text-primary">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-kitschy flex-1 bg-accent text-dark text-sm py-2">
                취소
              </button>
              <button
                type="submit"
                disabled={!user || !subject.trim() || !message.trim() || submitting}
                className="btn-kitschy flex-1 bg-secondary text-white text-sm py-2 disabled:opacity-50"
              >
                {submitting ? '전송 중...' : '문의 보내기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
