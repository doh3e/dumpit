import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// 네이티브 <dialog>.showModal(): 포커스 트랩·배경 inert·Esc(cancel)·닫힘 후 포커스 복귀를 브라우저가 처리한다.
// 배경 클릭 판별은 이벤트 대상이 dialog 자신인지로 한다(::backdrop 클릭은 dialog가 target).
export default function Dialog({
  onClose, title, children, className = '', placement = 'center', closeOnBackdrop = true, initialFocusRef,
}) {
  const ref = useRef(null)
  const downOnBackdrop = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || el.open) return
    el.showModal()
    initialFocusRef?.current?.focus()
    return () => { if (el.open) el.close() }
    // initialFocusRef는 안정된 useRef를 기대한다 — 의존성에 넣으면 identity 변화마다 닫혔다 열린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCancel = (e) => { e.preventDefault(); onClose?.() }
  const handleMouseDown = (e) => { downOnBackdrop.current = e.target === ref.current }
  const handleClick = (e) => {
    if (closeOnBackdrop && downOnBackdrop.current && e.target === ref.current) onClose?.()
    downOnBackdrop.current = false
  }

  return createPortal(
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={['dialog-retro', placement === 'bottom' && 'dialog-retro-bottom'].filter(Boolean).join(' ')}
    >
      <div className={`card-retro ${className}`}>{children}</div>
    </dialog>,
    document.body,
  )
}
