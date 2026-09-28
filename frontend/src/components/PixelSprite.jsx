import { useLayoutEffect, useRef, useState } from 'react'

function AnimatedSprite({ sprite, className, style }) {
  const slotRef = useRef(null)
  const [size, setSize] = useState(null)
  const cropped = Boolean(sprite.cell && sprite.box)

  useLayoutEffect(() => {
    if (!cropped) return undefined
    const slot = slotRef.current
    const updateSize = ({ width, height }) => {
      setSize((previous) => previous?.width === width && previous?.height === height
        ? previous : { width, height })
    }
    updateSize(slot.getBoundingClientRect())
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => updateSize(entry.contentRect))
    observer.observe(slot)
    return () => observer.disconnect()
  }, [cropped])

  let frameStyle = { width: '100%', height: '100%' }
  let stripStyle = { width: `${sprite.frames * 100}%`, height: '100%', left: 0, top: 0 }
  let travel = '-100%'
  if (cropped) {
    const [left, top, right, bottom] = sprite.box
    const width = right - left
    const height = bottom - top
    const fit = Math.min((size?.width ?? width) / width, (size?.height ?? height) / height)
    // 확대는 정수 배율로 도트를 보존하고, 슬롯보다 큰 본체만 축소한다.
    const scale = fit >= 1 ? Math.floor(fit) : fit
    frameStyle = { width: width * scale, height: height * scale }
    stripStyle = {
      width: sprite.cell * sprite.frames * scale,
      height: sprite.cell * scale,
      left: -left * scale,
      top: -top * scale,
    }
    travel = `${-sprite.cell * sprite.frames * scale}px`
  }

  return (
    <div ref={slotRef} aria-hidden="true" className={`pixel-sprite ${className}`} style={style}>
      <div className="pixel-sprite-frame" style={frameStyle}>
        <img
          key={sprite.img}
          src={sprite.img}
          alt=""
          draggable="false"
          className="pixel-sprite-strip pixel-sprite-anim"
          style={{
            ...stripStyle,
            '--sprite-frames': sprite.frames,
            '--sprite-duration': `${sprite.frames / (sprite.fps ?? 5)}s`,
            '--sprite-travel': travel,
          }}
        />
      </div>
    </div>
  )
}

export default function PixelSprite({ sprite, className = '', style }) {
  if (!sprite) return null
  if (!sprite.frames) {
    return (
      <img
        src={sprite.img}
        alt=""
        className={className}
        style={{ imageRendering: 'pixelated', ...style }}
      />
    )
  }
  return <AnimatedSprite sprite={sprite} className={className} style={style} />
}
