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

  // 중첩 dialog: React는 포털을 건너 cancel을 전파시킨다 — 안쪽 Esc가 바깥까지 닫지 않게 대상을 가른다
  const handleCancel = (e) => {
    if (e.target !== ref.current) return
    e.preventDefault()
    onClose?.()
  }
  const handleMouseDown = (e) => { downOnBackdrop.current = e.target === ref.current }
  const handleClick = (e) => {
    if (closeOnBackdrop && downOnBackdrop.current && e.target === ref.current) onClose?.()
    downOnBackdrop.current = false
  }

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 배경 클릭은 포인터 전용, 키보드 동등 경로는 Esc(native cancel → handleCancel)
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
