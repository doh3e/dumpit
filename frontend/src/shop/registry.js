import planetDefault from '../assets/shop/planet_default.png'
import planetCrimson from '../assets/shop/planet_crimson.png'
import planetIce from '../assets/shop/planet_ice.png'
import planetRinged from '../assets/shop/planet_ringed.png'
import celebrationDefault from '../assets/shop/celeb_rocket_default.png'
import celebrationShootingStar from '../assets/shop/celeb_shooting_star.png'
import celebrationUfo from '../assets/shop/celeb_ufo.png'
import celebrationGoldenRocket from '../assets/shop/celeb_golden_rocket.png'
import stationDefault from '../assets/shop/station_default.png'
import stationMint from '../assets/shop/station_mint.png'
import stationMoonbase from '../assets/shop/station_moonbase.png'
import stationMothership from '../assets/shop/station_mothership.png'
import stickerHeart from '../assets/shop/sticker_heart.png'
import stickerImportant from '../assets/shop/sticker_important.png'
import stickerStar from '../assets/shop/sticker_star.png'
import stickerFire from '../assets/shop/sticker_fire.png'

export const PLANET_SPRITES = {
  default: { name: '기본 행성', img: planetDefault },
  'planet.crimson': { name: '진홍 행성', img: planetCrimson },
  'planet.ice': { name: '얼음 행성', img: planetIce },
  'planet.ringed': { name: '고리 행성', img: planetRinged },
}

export const CELEBRATION_SPRITES = {
  default: { name: '기본 로켓', img: celebrationDefault },
  'celeb.shooting-star': { name: '별똥별', img: celebrationShootingStar },
  'celeb.ufo': { name: 'UFO', img: celebrationUfo },
  'celeb.golden-rocket': { name: '황금 로켓', img: celebrationGoldenRocket },
}

export const STATION_SPRITES = {
  default: { name: '기본 위성', img: stationDefault },
  'station.mint': { name: '민트 정거장', img: stationMint },
  'station.moonbase': { name: '달 기지', img: stationMoonbase },
  'station.mothership': { name: '모선', img: stationMothership },
}

export const STICKER_SPRITES = {
  'sticker.heart': { name: '하트', img: stickerHeart },
  'sticker.important': { name: '중요!', img: stickerImportant },
  'sticker.star': { name: '별', img: stickerStar },
  'sticker.fire': { name: '불꽃', img: stickerFire },
}

export function spriteFor(map, code) {
  return map[code] ?? map.default
}
