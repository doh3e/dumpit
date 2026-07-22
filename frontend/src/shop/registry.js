import planetDefault from '../assets/shop/planet_default.png'
import planetCrimson from '../assets/shop/planet_crimson.png'
import planetIce from '../assets/shop/planet_ice.png'
import planetRinged from '../assets/shop/planet_ringed.png'
import planetMoon from '../assets/shop/planet_moon.png'
import planetOcean from '../assets/shop/planet_ocean.png'
import planetSprout from '../assets/shop/planet_sprout.png'
import planetEarth from '../assets/shop/planet_earth.png'
import planetJupiter from '../assets/shop/planet_jupiter.png'
import planetBlossom from '../assets/shop/planet_blossom.png'
import planetCandy from '../assets/shop/planet_candy.png'
import planetGalaxy from '../assets/shop/planet_galaxy.png'
import planetWhale from '../assets/shop/planet_whale.png'
import planetSun from '../assets/shop/planet_sun.png'
import planetBlackhole from '../assets/shop/planet_blackhole.png'
import celebrationDefault from '../assets/shop/celeb_rocket_default.png'
import celebrationShootingStar from '../assets/shop/celeb_shooting_star.png'
import celebrationUfo from '../assets/shop/celeb_ufo.png'
import celebrationGoldenRocket from '../assets/shop/celeb_golden_rocket.png'
import celebFireworks from '../assets/shop/celeb_fireworks.png'
import celebFireworkSparkGold from '../assets/shop/celeb_firework_spark_gold.png'
import celebFireworkSparkCoral from '../assets/shop/celeb_firework_spark_coral.png'
import celebFireworkSparkTeal from '../assets/shop/celeb_firework_spark_teal.png'
import celebMeteor from '../assets/shop/celeb_meteor.png'
import celebMeteorBig from '../assets/shop/celeb_meteor_big.png'
import celebMeteorStar from '../assets/shop/celeb_meteor_star.png'
import celebFwBloomA from '../assets/shop/celeb_fw_bloom_a.png'
import celebFwBloomB from '../assets/shop/celeb_fw_bloom_b.png'
import celebPetal from '../assets/shop/celeb_petal.png'
import celebPetalLeaf from '../assets/shop/celeb_petal_leaf.png'
import celebSprout from '../assets/shop/celeb_sprout.png'
import celebSproutSparkle from '../assets/shop/celeb_sprout_sparkle.png'
import celebCandy from '../assets/shop/celeb_candy.png'
import celebCandyDrop from '../assets/shop/celeb_candy_drop.png'
import celebCandyConfetti from '../assets/shop/celeb_candy_confetti.png'
import celebBonfireA from '../assets/shop/celeb_bonfire_a.png'
import celebBonfireB from '../assets/shop/celeb_bonfire_b.png'
import celebEmber from '../assets/shop/celeb_ember.png'
import celebFireGlow from '../assets/shop/celeb_fire_glow.png'
import stationDefault from '../assets/shop/station_default.png'
import stationMint from '../assets/shop/station_mint.png'
import stationMoonbase from '../assets/shop/station_moonbase.png'
import stationMothership from '../assets/shop/station_mothership.png'
import stationSprout from '../assets/shop/station_sprout.png'
import stationGalaxy from '../assets/shop/station_galaxy.png'
import stationWood from '../assets/shop/station_wood.png'
import stationCandy from '../assets/shop/station_candy.png'
import stationDog from '../assets/shop/station_dog.png'
import stationCat from '../assets/shop/station_cat.png'
import stationHamster from '../assets/shop/station_hamster.png'
import stickerHeart from '../assets/shop/sticker_heart.png'
import stickerImportant from '../assets/shop/sticker_important.png'
import stickerStar from '../assets/shop/sticker_star.png'
import stickerFire from '../assets/shop/sticker_fire.png'
import stickerCheck from '../assets/shop/sticker_check.png'
import stickerCircle from '../assets/shop/sticker_circle.png'
import stickerCross from '../assets/shop/sticker_cross.png'
import stickerClover from '../assets/shop/sticker_clover.png'

// frames/fps 메타가 있으면 가로 프레임 시트 — PixelSprite가 CSS steps 애니로 재생
export const PLANET_SPRITES = {
  default: { name: '기본 행성', img: planetDefault },
  'planet.crimson': { name: '진홍 행성', img: planetCrimson },
  'planet.ice': { name: '얼음 행성', img: planetIce },
  'planet.ringed': { name: '고리 행성', img: planetRinged },
  'planet.moon': { name: '달', img: planetMoon },
  'planet.ocean': { name: '바다 행성', img: planetOcean },
  'planet.sprout': { name: '식물 행성', img: planetSprout },
  'planet.earth': { name: '지구', img: planetEarth },
  'planet.jupiter': { name: '목성', img: planetJupiter },
  'planet.blossom': { name: '꽃 행성', img: planetBlossom },
  'planet.candy': { name: '사탕 행성', img: planetCandy },
  'planet.galaxy': { name: '나선 은하', img: planetGalaxy },
  'planet.whale': { name: '우주 고래', img: planetWhale, frames: 8, fps: 5 },
  'planet.sun': { name: '태양', img: planetSun, frames: 8, fps: 5 },
  'planet.blackhole': { name: '블랙홀', img: planetBlackhole, frames: 8, fps: 5 },
}

// motion 생략 = 'launch'(기존 발사 연출). motion·parts는 celebrationMotions.js의 빌더가 소비.
// img는 대표 스프라이트 — 상점 카드·reduced-motion 폴백에 사용.
export const CELEBRATION_SPRITES = {
  default: { name: '기본 로켓', img: celebrationDefault },
  'celeb.shooting-star': { name: '별똥별', img: celebrationShootingStar },
  'celeb.ufo': { name: 'UFO', img: celebrationUfo },
  'celeb.golden-rocket': { name: '황금 로켓', img: celebrationGoldenRocket },
  'celeb.fireworks': {
    name: '불꽃놀이', img: celebFireworks, motion: 'fireworks',
    parts: {
      sparks: [celebFireworkSparkGold, celebFireworkSparkCoral, celebFireworkSparkTeal],
      flash: celebMeteorStar, // 폭발 순간 플래시 — 잔별 스프라이트를 크게 스케일해 재사용
      blooms: [celebFwBloomA, celebFwBloomB], // 파열 밀도 담당 — 점 링 2단 크로스페이드
    },
  },
  'celeb.meteor-shower': {
    name: '유성우', img: celebMeteor, motion: 'meteor',
    parts: { star: celebMeteorStar, big: celebMeteorBig },
  },
  'celeb.petal-wind': {
    name: '꽃잎 바람', img: celebPetal, motion: 'petal',
    parts: { leaf: celebPetalLeaf },
  },
  'celeb.sprout-bloom': {
    name: '새싹 움트기', img: celebSprout, motion: 'sprout',
    parts: { sparkle: celebSproutSparkle },
  },
  'celeb.candy-pop': {
    name: '캔디 폭죽', img: celebCandy, motion: 'burst',
    parts: { drop: celebCandyDrop, confetti: celebCandyConfetti },
  },
  'celeb.bonfire': {
    name: '모닥불', img: celebBonfireA, motion: 'bonfire',
    parts: { flameAlt: celebBonfireB, ember: celebEmber, glow: celebFireGlow },
  },
}

export const STATION_SPRITES = {
  default: { name: '기본 위성', img: stationDefault },
  'station.mint': { name: '민트 정거장', img: stationMint },
  'station.moonbase': { name: '달 기지', img: stationMoonbase },
  'station.mothership': { name: '모선', img: stationMothership },
  'station.sprout': { name: '새싹 온실', img: stationSprout },
  'station.galaxy': { name: '은하수 전망대', img: stationGalaxy },
  'station.wood': { name: '원목 오두막', img: stationWood },
  'station.candy': { name: '과자집', img: stationCandy },
  'station.dog': { name: '강아지', img: stationDog, frames: 8, fps: 5 },
  'station.cat': { name: '고양이', img: stationCat, frames: 8, fps: 5 },
  'station.hamster': { name: '햄스터', img: stationHamster, frames: 8, fps: 5 },
}

export const STICKER_SPRITES = {
  'sticker.heart': { name: '하트', img: stickerHeart },
  'sticker.important': { name: '중요!', img: stickerImportant },
  'sticker.star': { name: '별', img: stickerStar },
  'sticker.fire': { name: '불꽃', img: stickerFire },
  'sticker.check': { name: '체크', img: stickerCheck },
  'sticker.circle': { name: '동그라미', img: stickerCircle },
  'sticker.cross': { name: '엑스', img: stickerCross },
  'sticker.clover': { name: '네잎클로버', img: stickerClover },
}

export function spriteFor(map, code) {
  return map[code] ?? map.default
}
