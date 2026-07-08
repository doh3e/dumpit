import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// 하루 전체 완료 보상 — 픽셀 로켓이 화면을 가로질러 발사되는 1.5초 원샷
export default function RocketLaunch({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div className="rocket-overlay" aria-hidden="true">
      <div className="rocket-body" />
      <div className="rocket-trail" />
    </div>,
    document.body
  )
}
