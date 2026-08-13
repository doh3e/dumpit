/**
 * 완료축하 파티클 빌더 — 웹 `frontend/src/shop/celebrationMotions.js` 이식.
 * 키프레임은 웹 index.css '보상 모션' 섹션(249~362행)의 근사 이식 — 1:1 재현이 아니다.
 *
 * 계약:
 *   - rand를 주입받는다(테스트에서 고정 시드). 웹은 Math.random()을 직접 부른다.
 *   - delay + duration ≤ TOTAL_MS(2300).
 *   - 노드 수는 웹보다 줄였다 — Animated.Image가 DOM보다 비싸다.
 */
import type { CelebrationSprite, MotionKind } from './registry';

export const TOTAL_MS = 2300;

export type ParticleKind =
  | 'rocketUp'
  | 'meteor' | 'meteorBig' | 'star'
  | 'petal'
  | 'sprout' | 'sparkle'
  | 'candy'
  | 'glow' | 'flame' | 'flameAlt' | 'ember'
  | 'fwRocket' | 'fwFlash' | 'fwBloom' | 'fwBloomLate' | 'fwSpark';

export type Particle = {
  key: string;
  src: number;
  kind: ParticleKind;
  /** 좌표는 dp. centered면 좌우/상하 중심 기준으로 렌더러가 보정한다 */
  left: number;
  top?: number;
  bottom?: number;
  size: number;
  delay: number;
  centered?: boolean;
  dx?: number;
  dy?: number;
  sway?: number;
  peak?: number;
  drift?: number;
};

export type Viewport = { width: number; height: number };
export type Rand = () => number;

function launch(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  return Array.from({ length: 6 }, (_, i) => ({
    key: `launch-${i}`,
    src: sprite.img,
    kind: 'rocketUp' as const,
    left: (0.08 + rand() * 0.84) * vp.width,
    bottom: -0.12 * vp.height,
    size: 36 + rand() * 44,
    delay: rand() * 700,
    centered: true,
  }));
}

function meteor(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  // 배경 층 — 작은 유성, 느리고 얕게
  const small = Array.from({ length: 8 }, (_, i) => ({
    key: `meteor-${i}`,
    src: sprite.img,
    kind: 'meteor' as const,
    left: (0.15 + rand() * 0.95) * vp.width,
    top: -0.1 * vp.height,
    size: 20 + rand() * 20,
    delay: rand() * 1150,
  }));
  // 전경 층 — 대형 유성이 빠르게 화면을 가른다
  const big = Array.from({ length: 4 }, (_, i) => ({
    key: `meteor-big-${i}`,
    src: sprite.parts?.big ?? sprite.img,
    kind: 'meteorBig' as const,
    left: (0.25 + i * 0.22 + rand() * 0.08) * vp.width,
    top: -0.16 * vp.height,
    size: 72 + rand() * 40,
    delay: 150 + i * 400 + rand() * 150,
  }));
  const stars = Array.from({ length: 4 }, (_, i) => ({
    key: `meteor-star-${i}`,
    src: sprite.parts?.star ?? sprite.img,
    kind: 'star' as const,
    left: (0.05 + rand() * 0.9) * vp.width,
    top: (0.05 + rand() * 0.55) * vp.height,
    size: 12 + rand() * 8,
    delay: rand() * 500,
  }));
  return [...small, ...big, ...stars];
}

function petal(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  return Array.from({ length: 12 }, (_, i) => {
    const isLeaf = i % 3 === 2;
    return {
      key: `petal-${i}`,
      src: isLeaf ? sprite.parts?.leaf ?? sprite.img : sprite.img,
      kind: 'petal' as const,
      left: -0.08 * vp.width,
      top: (0.05 + rand() * 0.7) * vp.height,
      size: isLeaf ? 14 : 18 + rand() * 10,
      delay: rand() * 400,
      sway: 24 + rand() * 40,
    };
  });
}

function sprout(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  const sprouts = Array.from({ length: 9 }, (_, i) => {
    const size = 28 + rand() * 16;
    // 마지막 새싹은 left가 화면 우측 끝에 가까워 스프라이트 폭만큼 잘린다 — 폭을 빼고 붙인다
    const left = Math.min((0.04 + i * 0.11 + rand() * 0.04) * vp.width, vp.width - size);
    return {
      key: `sprout-${i}`,
      src: sprite.img,
      kind: 'sprout' as const,
      left,
      bottom: 0,
      size,
      delay: i * 130 + rand() * 50,
    };
  });
  const sparkles = Array.from({ length: 3 }, (_, i) => ({
    key: `sparkle-${i}`,
    src: sprite.parts?.sparkle ?? sprite.img,
    kind: 'sparkle' as const,
    left: (0.05 + rand() * 0.9) * vp.width,
    top: (0.45 + rand() * 0.4) * vp.height,
    size: 10,
    delay: 500 + rand() * 800,
  }));
  return [...sprouts, ...sparkles];
}

function burst(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  const srcs = [sprite.img, sprite.parts?.drop ?? sprite.img, sprite.parts?.confetti ?? sprite.img];
  return Array.from({ length: 14 }, (_, i) => ({
    key: `candy-${i}`,
    src: srcs[i % 3],
    kind: 'candy' as const,
    left: (0.46 + rand() * 0.08) * vp.width,
    bottom: -0.06 * vp.height,
    size: i % 3 === 0 ? 20 + rand() * 8 : 12,
    delay: rand() * 500,
    dx: (rand() * 2 - 1) * 0.35 * vp.width,
    peak: -(0.3 + rand() * 0.35) * vp.height,
  }));
}

function bonfire(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  // 글로우를 앞에 둬서 화염 뒤(아래)에 깔린다
  const glow: Particle = {
    key: 'glow',
    src: sprite.parts?.glow ?? sprite.img,
    kind: 'glow',
    left: vp.width / 2,
    bottom: -80,
    size: 300,
    delay: 0,
    centered: true,
  };
  const flames: Particle[] = [
    {
      key: 'flame',
      src: sprite.img,
      kind: 'flame',
      left: vp.width / 2,
      bottom: 18,
      size: 104,
      delay: 0,
      centered: true,
    },
    {
      key: 'flame-alt',
      src: sprite.parts?.flameAlt ?? sprite.img,
      kind: 'flameAlt',
      left: vp.width / 2,
      bottom: 18,
      size: 104,
      delay: 0,
      centered: true,
    },
  ];
  const embers = Array.from({ length: 12 }, (_, i) => ({
    key: `ember-${i}`,
    src: sprite.parts?.ember ?? sprite.img,
    kind: 'ember' as const,
    left: (0.42 + rand() * 0.16) * vp.width,
    bottom: 70 + rand() * 40,
    size: 8 + rand() * 6,
    delay: rand() * 700,
    drift: (rand() * 2 - 1) * 20,
  }));
  return [glow, ...flames, ...embers];
}

function fireworks(sprite: CelebrationSprite, vp: Viewport, rand: Rand): Particle[] {
  const bursts = [
    { x: 0.24, y: 0.3, delay: 0 },
    { x: 0.5, y: 0.18, delay: 300 },
    { x: 0.76, y: 0.26, delay: 600 },
  ];
  const sparks = sprite.parts?.sparks ?? [sprite.img];
  const blooms = sprite.parts?.blooms ?? [sprite.img, sprite.img];

  return bursts.flatMap((b, bi) => {
    const bx = b.x * vp.width;
    const by = b.y * vp.height;
    const rocket: Particle = {
      key: `fw-rocket-${bi}`,
      src: sprite.img,
      kind: 'fwRocket',
      left: bx,
      bottom: -0.08 * vp.height,
      size: 28,
      delay: b.delay,
      centered: true,
    };
    const flash: Particle = {
      key: `fw-flash-${bi}`,
      src: sprite.parts?.flash ?? sprite.img,
      kind: 'fwFlash',
      left: bx,
      top: by,
      size: 36,
      delay: b.delay + 500,
      centered: true,
    };
    const bloom: Particle = {
      key: `fw-bloom-${bi}`,
      src: blooms[0],
      kind: 'fwBloom',
      left: bx,
      top: by,
      size: 190,
      delay: b.delay + 500,
      centered: true,
    };
    const bloomLate: Particle = {
      key: `fw-bloom-late-${bi}`,
      src: blooms[1] ?? blooms[0],
      kind: 'fwBloomLate',
      left: bx,
      top: by,
      size: 210,
      delay: b.delay + 720,
      centered: true,
    };
    const flying = Array.from({ length: 3 }, (_, i) => {
      // 파열마다 각도를 반 칸씩 어긋내 겹치는 방사선을 피한다
      const angle = ((i + (bi % 2) * 0.5) / 3) * Math.PI * 2 + rand() * 0.3;
      const dist = 100 + rand() * 110;
      return {
        key: `fw-spark-${bi}-${i}`,
        src: sparks[(bi + i) % sparks.length],
        kind: 'fwSpark' as const,
        left: bx,
        top: by,
        size: 10 + rand() * 8,
        delay: b.delay + 520 + rand() * 120,
        centered: true,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
      };
    });
    return [rocket, flash, bloom, bloomLate, ...flying];
  });
}

const BUILDERS: Record<MotionKind, (s: CelebrationSprite, vp: Viewport, r: Rand) => Particle[]> = {
  launch, meteor, petal, sprout, burst, bonfire, fireworks,
};

export function buildParticles(
  sprite: CelebrationSprite,
  viewport: Viewport,
  rand: Rand = Math.random,
): Particle[] {
  const builder = BUILDERS[sprite.motion ?? 'launch'] ?? BUILDERS.launch;
  return builder(sprite, viewport, rand);
}
