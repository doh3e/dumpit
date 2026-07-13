// 도트 스프라이트 공용 렌더러 — registry 엔트리에 frames 메타가 있으면 시트 애니, 없으면 정지 img.
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
