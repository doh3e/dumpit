import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { CELEBRATION_SPRITES, spriteFor } from '../shop/registry'

// 하루 전체 완료 보상 — 픽셀 로켓이 화면을 가로질러 발사되는 1.5초 원샷
// codeOverride: 상점 미리보기용 — 있으면 유저의 실제 장착 코드 대신 이 코드의 스프라이트를 재생한다.
export default function RocketLaunch({ onDone, codeOverride }) {
  const { user } = useAuth()
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  const code = codeOverride ?? user?.equipments?.CELEBRATION

  return createPortal(
    <div className="rocket-overlay" aria-hidden="true">
      <img
        src={spriteFor(CELEBRATION_SPRITES, code).img}
        alt=""
        className="celebration-sprite"
      />
    </div>,
    document.body
  )
}
