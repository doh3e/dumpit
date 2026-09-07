import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// 네이티브 <dialog>.showModal(): 포커스 트랩·배경 inert·Esc(cancel)·닫힘 후 포커스 복귀를 브라우저가 처리한다.
// 배경 클릭 판별은 이벤트 대상이 dialog 자신인지로 한다(::backdrop 클릭은 dialog가 target).
export default function Dialog({
  onClose, title, children, className = '', placement = 'center', closeOnBackdrop = true, initialFocusRef,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || el.open) return
    el.showModal()
    const target = initialFocusRef?.current ?? el.querySelector('[autofocus]')
    target?.focus()
    return () => { if (el.open) el.close() }
  }, [initialFocusRef])

  const handleCancel = (e) => { e.preventDefault(); onClose?.() }
  const handleClick = (e) => { if (closeOnBackdrop && e.target === ref.current) onClose?.() }

  return createPortal(
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={handleCancel}
      onClick={handleClick}
      className={`dialog-retro ${placement === 'bottom' ? 'dialog-retro-bottom' : ''}`}
    >
      <div className={`card-retro ${className}`}>{children}</div>
    </dialog>,
    document.body,
  )
}
