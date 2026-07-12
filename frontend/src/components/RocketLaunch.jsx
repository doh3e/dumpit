import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { CELEBRATION_SPRITES, spriteFor } from '../shop/registry'

// 하루 전체 완료 보상 — 픽셀 로켓이 화면을 가로질러 발사되는 1.5초 원샷
export default function RocketLaunch({ onDone }) {
  const { user } = useAuth()
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div className="rocket-overlay" aria-hidden="true">
      <img
        src={spriteFor(CELEBRATION_SPRITES, user?.equipments?.CELEBRATION).img}
        alt=""
        className="celebration-sprite"
      />
    </div>,
    document.body
  )
}
