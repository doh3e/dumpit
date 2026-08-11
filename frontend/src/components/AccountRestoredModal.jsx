import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 탈퇴 유예 기간에 다시 로그인하면 백엔드가 계정을 자동 복구하고
 * /dashboard?restored=1 로 보낸다. 그 사실을 한 번만 알린다.
 */
export default function AccountRestoredModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('restored') !== '1') return

    setOpen(true)
    // 새로고침하거나 뒤로 갔다 와도 다시 뜨지 않도록 주소에서 지운다
    params.delete('restored')
    const query = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''))
  }, [])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overlay-retro px-4"
      onClick={() => setOpen(false)}
    >
      <div className="card-retro w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-dark">다시 오셨네요!</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-sub">
          탈퇴 신청이 취소되었어요. 할 일과 아이디어, 루틴까지 예전 기록이 모두 그대로 돌아왔습니다.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-retro-primary mt-5 w-full py-2 text-sm"
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  )
}
