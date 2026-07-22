// 완료축하 모션별 파티클 빌더 — RocketLaunch가 마운트 시 1회 호출.
// 계약: 각 파티클 { src, className, style }. 노드 30개 이하, delay+duration ≤ 2.3s,
// 애니메이션은 transform·opacity만(클래스는 index.css의 '보상 모션' 섹션 참조).
const BASE = 'celeb-part'

function launch(sprite) {
  return Array.from({ length: 6 }, () => ({
    src: sprite.img,
    className: 'celebration-sprite', // 기존 클래스 유지 (reduced-motion 안전망 포함)
    style: {
      left: `${8 + Math.random() * 84}%`,
      width: `${36 + Math.random() * 44}px`,
      animationDelay: `${Math.random() * 0.7}s`,
    },
  }))
}

function meteor(sprite) {
  const meteors = Array.from({ length: 10 }, () => ({
    src: sprite.img,
    className: `${BASE} celeb-meteor`,
    style: {
      left: `${20 + Math.random() * 90}%`, // 좌하로 흐르므로 오른쪽까지 넓게
      width: `${24 + Math.random() * 24}px`,
      animationDelay: `${Math.random() * 1.1}s`,
    },
  }))
  const stars = Array.from({ length: 7 }, () => ({
    src: sprite.parts.star,
    className: `${BASE} celeb-star`,
    style: {
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 60}%`,
      width: '14px',
      animationDelay: `${Math.random() * 0.5}s`,
    },
  }))
  return [...meteors, ...stars]
}

function petal(sprite) {
  return Array.from({ length: 12 }, (_, i) => {
    const isLeaf = i % 3 === 2
    return {
      src: isLeaf ? sprite.parts.leaf : sprite.img,
      className: `${BASE} celeb-petal`,
      style: {
        top: `${5 + Math.random() * 70}%`,
        width: `${isLeaf ? 14 : 18 + Math.random() * 10}px`,
        animationDelay: `${Math.random() * 0.4}s`,
        '--sway': `${24 + Math.random() * 40}px`,
      },
    }
  })
}

function sprout(sprite) {
  const sprouts = Array.from({ length: 9 }, (_, i) => ({
    src: sprite.img,
    className: `${BASE} celeb-sprout`,
    style: {
      left: `${4 + i * 11 + Math.random() * 4}%`,
      width: `${28 + Math.random() * 16}px`,
      animationDelay: `${i * 0.13 + Math.random() * 0.05}s`,
    },
  }))
  const sparkles = Array.from({ length: 6 }, () => ({
    src: sprite.parts.sparkle,
    className: `${BASE} celeb-sparkle`,
    style: {
      left: `${5 + Math.random() * 90}%`,
      top: `${45 + Math.random() * 40}%`,
      width: '10px',
      animationDelay: `${0.5 + Math.random() * 0.8}s`,
    },
  }))
  return [...sprouts, ...sparkles]
}

function burst(sprite) {
  const srcs = [sprite.img, sprite.parts.drop, sprite.parts.confetti]
  return Array.from({ length: 18 }, (_, i) => ({
    src: srcs[i % 3],
    className: `${BASE} celeb-candy`,
    style: {
      left: `${46 + Math.random() * 8}%`,
      width: `${i % 3 === 0 ? 20 + Math.random() * 8 : 12}px`,
      animationDelay: `${Math.random() * 0.5}s`,
      '--dx': `${(Math.random() * 2 - 1) * 35}vw`,
      '--peak': `-${30 + Math.random() * 35}vh`,
    },
  }))
}

function bonfire(sprite) {
  // 글로우를 배열 앞에 둬서 DOM 순서상 화염 뒤(아래)에 깔린다
  const glow = {
    src: sprite.parts.glow,
    className: `${BASE} celeb-fire-glow`,
    style: { left: 'calc(50% - 150px)', width: '300px' },
  }
  const flames = [
    {
      src: sprite.img,
      className: `${BASE} celeb-bonfire`,
      style: { left: 'calc(50% - 52px)', width: '104px' },
    },
    {
      src: sprite.parts.flameAlt,
      className: `${BASE} celeb-bonfire-alt`,
      style: { left: 'calc(50% - 52px)', width: '104px' },
    },
  ]
  const embers = Array.from({ length: 12 }, () => ({
    src: sprite.parts.ember,
    className: `${BASE} celeb-ember`,
    style: {
      left: `${42 + Math.random() * 16}%`,
      bottom: `${70 + Math.random() * 40}px`,
      width: `${8 + Math.random() * 6}px`,
      animationDelay: `${Math.random() * 0.7}s`,
      '--drift': `${(Math.random() * 2 - 1) * 20}px`,
    },
  }))
  return [glow, ...flames, ...embers]
}

function fireworks(sprite) {
  const bursts = [
    { x: 24, y: 30, delay: 0 },
    { x: 50, y: 18, delay: 0.3 },
    { x: 76, y: 26, delay: 0.6 },
  ]
  const rockets = bursts.map((b) => ({
    src: sprite.img,
    className: `${BASE} celeb-fw-rocket`,
    style: { left: `${b.x}%`, width: '28px', animationDelay: `${b.delay}s` },
  }))
  // 폭발 순간의 번쩍 — 잔별 스프라이트가 3배로 확 퍼지며 사라진다
  const flashes = bursts.map((b) => ({
    src: sprite.parts.flash,
    className: `${BASE} celeb-fw-flash`,
    style: { left: `${b.x}%`, top: `${b.y}%`, width: '36px', animationDelay: `${b.delay + 0.5}s` },
  }))
  const sparks = bursts.flatMap((b, bi) =>
    Array.from({ length: 8 }, (_, i) => {
      // 파열마다 각도를 반 칸씩 어긋내 겹치는 방사선을 피한다
      const angle = ((i + (bi % 2) * 0.5) / 8) * Math.PI * 2 + Math.random() * 0.3
      const dist = 90 + Math.random() * 110
      return {
        src: sprite.parts.sparks[(bi + i) % 3],
        className: `${BASE} celeb-fw-spark`,
        style: {
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${10 + Math.random() * 8}px`,
          animationDelay: `${b.delay + 0.52 + Math.random() * 0.12}s`,
          '--dx': `${Math.cos(angle) * dist}px`,
          '--dy': `${Math.sin(angle) * dist}px`,
        },
      }
    })
  )
  return [...rockets, ...flashes, ...sparks]
}

export const BUILDERS = { launch, meteor, petal, sprout, burst, bonfire, fireworks }

export function buildParticles(sprite) {
  const builder = BUILDERS[sprite.motion ?? 'launch'] ?? BUILDERS.launch
  return builder(sprite)
}
