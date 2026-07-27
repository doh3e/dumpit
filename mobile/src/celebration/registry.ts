/** 웹 frontend/src/shop/registry.js의 CELEBRATION_SPRITES 이식 — 웹 registry.js와 동기화 필수.
 *  motion 생략 = 'launch'(기본 발사 연출). motion·parts는 motions.ts의 빌더가 소비.
 *  img는 대표 스프라이트 — 상점 카드·reduceMotion 폴백에 쓴다. */

export type MotionKind = 'launch' | 'meteor' | 'petal' | 'sprout' | 'burst' | 'bonfire' | 'fireworks';

export type CelebrationParts = {
  sparks?: number[];
  flash?: number;
  blooms?: number[];
  star?: number;
  big?: number;
  leaf?: number;
  sparkle?: number;
  drop?: number;
  confetti?: number;
  flameAlt?: number;
  ember?: number;
  glow?: number;
};

export type CelebrationSprite = {
  name: string;
  img: number;
  motion?: MotionKind;
  parts?: CelebrationParts;
};

export const CELEBRATION_SPRITES: Record<string, CelebrationSprite> = {
  default: { name: '기본 로켓', img: require('../../assets/shop/celeb_rocket_default.png') },
  'celeb.shooting-star': { name: '별똥별', img: require('../../assets/shop/celeb_shooting_star.png') },
  'celeb.ufo': { name: 'UFO', img: require('../../assets/shop/celeb_ufo.png') },
  'celeb.golden-rocket': { name: '황금 로켓', img: require('../../assets/shop/celeb_golden_rocket.png') },
  'celeb.fireworks': {
    name: '불꽃놀이',
    img: require('../../assets/shop/celeb_fireworks.png'),
    motion: 'fireworks',
    parts: {
      sparks: [
        require('../../assets/shop/celeb_firework_spark_gold.png'),
        require('../../assets/shop/celeb_firework_spark_coral.png'),
        require('../../assets/shop/celeb_firework_spark_teal.png'),
      ],
      // 폭발 순간 플래시 — 잔별 스프라이트를 크게 키워 재사용 (웹 동일)
      flash: require('../../assets/shop/celeb_meteor_star.png'),
      // 파열 밀도 담당 — 점 링 2단 크로스페이드
      blooms: [
        require('../../assets/shop/celeb_fw_bloom_a.png'),
        require('../../assets/shop/celeb_fw_bloom_b.png'),
      ],
    },
  },
  'celeb.meteor-shower': {
    name: '유성우',
    img: require('../../assets/shop/celeb_meteor.png'),
    motion: 'meteor',
    parts: {
      star: require('../../assets/shop/celeb_meteor_star.png'),
      big: require('../../assets/shop/celeb_meteor_big.png'),
    },
  },
  'celeb.petal-wind': {
    name: '꽃잎 바람',
    img: require('../../assets/shop/celeb_petal.png'),
    motion: 'petal',
    parts: { leaf: require('../../assets/shop/celeb_petal_leaf.png') },
  },
  'celeb.sprout-bloom': {
    name: '새싹 움트기',
    img: require('../../assets/shop/celeb_sprout.png'),
    motion: 'sprout',
    parts: { sparkle: require('../../assets/shop/celeb_sprout_sparkle.png') },
  },
  'celeb.candy-pop': {
    name: '캔디 폭죽',
    img: require('../../assets/shop/celeb_candy.png'),
    motion: 'burst',
    parts: {
      drop: require('../../assets/shop/celeb_candy_drop.png'),
      confetti: require('../../assets/shop/celeb_candy_confetti.png'),
    },
  },
  'celeb.bonfire': {
    name: '모닥불',
    img: require('../../assets/shop/celeb_bonfire_a.png'),
    motion: 'bonfire',
    parts: {
      flameAlt: require('../../assets/shop/celeb_bonfire_b.png'),
      ember: require('../../assets/shop/celeb_ember.png'),
      glow: require('../../assets/shop/celeb_fire_glow.png'),
    },
  },
};

export function celebrationFor(code: string | null | undefined): CelebrationSprite {
  return (code ? CELEBRATION_SPRITES[code] : undefined) ?? CELEBRATION_SPRITES.default;
}
