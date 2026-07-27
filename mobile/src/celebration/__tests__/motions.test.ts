import { buildParticles, TOTAL_MS } from '../motions';
import { CELEBRATION_SPRITES, celebrationFor } from '../registry';

const VP = { width: 400, height: 800 };

/** 결정적 테스트용 의사난수 — 시드 고정 LCG */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// 모션별 지속시간(ms) — CelebrationOverlay의 키프레임과 맞춰야 한다
const DURATIONS: Record<string, number> = {
  rocketUp: 1400, meteor: 1150, meteorBig: 650, star: 1800, sparkle: 900,
  petal: 1900, sprout: 500, candy: 1500, ember: 1600,
  glow: 0, flame: 0, flameAlt: 0,
  fwRocket: 500, fwFlash: 320, fwBloom: 500, fwBloomLate: 650, fwSpark: 1050,
};

describe('celebrationFor', () => {
  it('미장착·미지 코드는 기본 로켓', () => {
    expect(celebrationFor(null)).toBe(CELEBRATION_SPRITES.default);
    expect(celebrationFor('celeb.deleted')).toBe(CELEBRATION_SPRITES.default);
  });

  it('장착 코드의 스프라이트를 준다', () => {
    expect(celebrationFor('celeb.bonfire').name).toBe('모닥불');
  });

  it('모션이 있는 아이템은 필요한 파츠를 갖춘다', () => {
    expect(CELEBRATION_SPRITES['celeb.fireworks'].parts?.sparks).toHaveLength(3);
    expect(CELEBRATION_SPRITES['celeb.fireworks'].parts?.blooms).toHaveLength(2);
    expect(CELEBRATION_SPRITES['celeb.meteor-shower'].parts?.big).toBeTruthy();
    expect(CELEBRATION_SPRITES['celeb.bonfire'].parts?.glow).toBeTruthy();
  });
});

describe('buildParticles', () => {
  const cases: [string, number][] = [
    ['default', 6],              // launch
    ['celeb.meteor-shower', 16],
    ['celeb.petal-wind', 12],
    ['celeb.sprout-bloom', 12],
    ['celeb.candy-pop', 14],
    ['celeb.bonfire', 15],
    ['celeb.fireworks', 21],
  ];

  it.each(cases)('%s는 파티클 %i개 (계획 B 노드 예산)', (code, count) => {
    expect(buildParticles(celebrationFor(code), VP, seeded())).toHaveLength(count);
  });

  it.each(cases)('%s의 모든 파티클이 예산(2.3초) 안에 끝난다', (code) => {
    buildParticles(celebrationFor(code), VP, seeded()).forEach((p) => {
      expect(p.delay + DURATIONS[p.kind]).toBeLessThanOrEqual(TOTAL_MS);
    });
  });

  it.each(cases)('%s의 파티클 키는 서로 겹치지 않는다', (code) => {
    const parts = buildParticles(celebrationFor(code), VP, seeded());
    expect(new Set(parts.map((p) => p.key)).size).toBe(parts.length);
  });

  it('같은 시드면 결과가 같다', () => {
    const a = buildParticles(celebrationFor('celeb.fireworks'), VP, seeded(42));
    const b = buildParticles(celebrationFor('celeb.fireworks'), VP, seeded(42));
    expect(a).toEqual(b);
  });

  it('모션 미지정은 launch로 떨어진다', () => {
    const parts = buildParticles(celebrationFor('celeb.ufo'), VP, seeded());
    expect(parts.every((p) => p.kind === 'rocketUp')).toBe(true);
  });

  it('좌표가 뷰포트에 비례한다', () => {
    const wide = buildParticles(celebrationFor('celeb.fireworks'), { width: 800, height: 800 }, seeded(7));
    const narrow = buildParticles(celebrationFor('celeb.fireworks'), { width: 400, height: 800 }, seeded(7));
    const wideRocket = wide.find((p) => p.key === 'fw-rocket-0')!;
    const narrowRocket = narrow.find((p) => p.key === 'fw-rocket-0')!;
    expect(wideRocket.left).toBeCloseTo(narrowRocket.left * 2);
  });

  it('크기·지연이 음수가 아니다', () => {
    cases.forEach(([code]) => {
      buildParticles(celebrationFor(code), VP, seeded(3)).forEach((p) => {
        expect(p.size).toBeGreaterThan(0);
        expect(p.delay).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('모닥불은 글로우가 화염보다 먼저 와서 뒤에 깔린다', () => {
    const parts = buildParticles(celebrationFor('celeb.bonfire'), VP, seeded());
    expect(parts[0].kind).toBe('glow');
    expect(parts[1].kind).toBe('flame');
  });
});
