import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const DIRS = [[1, 0], [.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7], [0, -1], [.7, -.7]]

// 할 일 완료 순간의 픽셀 파티클 — 뷰포트 좌표(x, y)에서 8방향으로 튐
export default function PixelBurst({ x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 320)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <div aria-hidden="true" style={{ position: 'fixed', left: x, top: y, zIndex: 60, pointerEvents: 'none' }}>
      {DIRS.map(([dx, dy], i) => (
        <span
          key={i}
          className="pixel-spark"
          style={{ '--dx': `${dx * 22}px`, '--dy': `${dy * 22}px` }}
        />
      ))}
    </div>,
    document.body
  )
}
