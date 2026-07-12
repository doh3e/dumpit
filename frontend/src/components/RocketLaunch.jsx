import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { CELEBRATION_SPRITES, spriteFor } from '../shop/registry'

const SPRITE_COUNT = 6
const TOTAL_DURATION_MS = 2300

function buildSprites() {
  return Array.from({ length: SPRITE_COUNT }, () => ({
    left: 8 + Math.random() * 84, // 8% ~ 92%
    width: 36 + Math.random() * 44, // 36px ~ 80px
    delay: Math.random() * 0.7, // 0s ~ 0.7s
  }))
}

// 하루 전체 완료 보상 — 픽셀 로켓 여러 발이 화면을 가로질러 발사되고, 완주 배너가 뜨는 원샷 연출
// prefers-reduced-motion: 비행 스프라이트 대신 배너 안에 정적 스프라이트 3개를 넣어 2.3초 표시.
// codeOverride: 상점 미리보기용 — 있으면 유저의 실제 장착 코드 대신 이 코드의 스프라이트를 재생한다.
export default function RocketLaunch({ onDone, codeOverride }) {
  const { user } = useAuth()
  const [sprites] = useState(buildSprites)
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const t = setTimeout(onDone, TOTAL_DURATION_MS)
    return () => clearTimeout(t)
  }, [onDone])

  const code = codeOverride ?? user?.equipments?.CELEBRATION
  const spriteSrc = spriteFor(CELEBRATION_SPRITES, code).img

  return createPortal(
    <div className="rocket-overlay">
      {!reducedMotion &&
        sprites.map((s, i) => (
          <img
            key={i}
            src={spriteSrc}
            alt=""
            aria-hidden="true"
            className="celebration-sprite"
            style={{
              left: `${s.left}%`,
              width: `${s.width}px`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      <div className="celebration-banner card-retro font-dungeon text-xl md:text-2xl" role="status">
        {reducedMotion && (
          <div className="flex justify-center gap-3 mb-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                src={spriteSrc}
                alt=""
                style={{ width: '40px', height: 'auto', imageRendering: 'pixelated' }}
              />
            ))}
          </div>
        )}
        오늘 할 일 완주!
      </div>
    </div>,
    document.body
  )
}
