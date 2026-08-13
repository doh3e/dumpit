import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { CELEBRATION_SPRITES, spriteFor } from '../shop/registry'
import { buildParticles } from '../shop/celebrationMotions'

const TOTAL_DURATION_MS = 2300

// codeOverride: 상점 미리보기용 — 있으면 유저의 실제 장착 코드 대신 이 코드의 연출을 재생한다.
export default function RocketLaunch({ onDone, codeOverride }) {
  const { user } = useAuth()
  const code = codeOverride ?? user?.equipments?.CELEBRATION
  const sprite = spriteFor(CELEBRATION_SPRITES, code)
  const [particles] = useState(() => buildParticles(sprite))
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const t = setTimeout(onDone, TOTAL_DURATION_MS)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div className="rocket-overlay">
      {!reducedMotion &&
        particles.map((p, i) => (
          <img key={i} src={p.src} alt="" aria-hidden="true" className={p.className} style={p.style} />
        ))}
      <div className="celebration-banner card-retro font-dungeon text-xl md:text-2xl" role="status">
        {reducedMotion && (
          <div className="flex justify-center gap-3 mb-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                src={sprite.img}
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
