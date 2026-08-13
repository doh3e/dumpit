// 애니는 가로 8프레임 시트 전제 (keyframes pixel-sprite-8, index.css). 모션 감소 설정 시 첫 프레임 고정.
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
  return (
    <div
      aria-hidden="true"
      className={`pixel-sprite-anim ${className}`}
      style={{
        backgroundImage: `url(${sprite.img})`,
        backgroundSize: `${sprite.frames * 100}% 100%`,
        imageRendering: 'pixelated',
        animationDuration: `${sprite.frames / (sprite.fps ?? 5)}s`,
        ...style,
      }}
    />
  )
}
