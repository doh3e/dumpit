import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE_URL } from '../services/api'

/**
 * 탈퇴 유예 중인 계정으로 로그인하면 백엔드가 복구 대신 /?error=withdrawal_pending 으로
 * 돌려보낸다. 여기서 복구 의사를 물어, 동의할 때만 ?restore=1 로 다시 로그인해 복구한다.
 * 거절하면 주소에서 지워 로그아웃 상태 그대로 남는다.
 */
export default function WithdrawalPendingModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOpen(params.get('error') === 'withdrawal_pending')
  }, [])

  const dismiss = () => {
    setOpen(false)
    const params = new URLSearchParams(window.location.search)
    params.delete('error')
    const query = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''))
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overlay-retro px-4"
      onClick={dismiss}
    >
      <div className="card-retro w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-dark">탈퇴처리가 진행중인 계정입니다</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-sub">
          복구하시겠습니까?
          <br />
          복구하면 탈퇴 신청이 취소되고 예전 기록이 모두 그대로 돌아옵니다.
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={dismiss} className="btn-retro-outline flex-1 py-2 text-sm">
            아니요
          </button>
          <a
            href={`${API_BASE_URL}/oauth2/authorization/google?restore=1`}
            className="btn-retro-primary flex-1 py-2 text-sm"
          >
            복구하기
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}
