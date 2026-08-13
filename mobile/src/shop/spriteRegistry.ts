/** 웹 frontend/src/shop/registry.js의 PLANET/STATION 이식 — 웹 registry.js와 동기화 필수.
 *  frames/fps 메타가 있으면 가로 프레임 시트 — PixelSprite가 스텝 재생. */
export type SpriteEntry = { name: string; img: number; frames?: number; fps?: number };

export const PLANET_SPRITES: Record<string, SpriteEntry> = {
  default: { name: '기본 행성', img: require('../../assets/shop/planet_default.png') },
  'planet.crimson': { name: '진홍 행성', img: require('../../assets/shop/planet_crimson.png') },
  'planet.ice': { name: '얼음 행성', img: require('../../assets/shop/planet_ice.png') },
  'planet.ringed': { name: '고리 행성', img: require('../../assets/shop/planet_ringed.png') },
  'planet.moon': { name: '달', img: require('../../assets/shop/planet_moon.png') },
  'planet.ocean': { name: '바다 행성', img: require('../../assets/shop/planet_ocean.png') },
  'planet.sprout': { name: '식물 행성', img: require('../../assets/shop/planet_sprout.png') },
  'planet.earth': { name: '지구', img: require('../../assets/shop/planet_earth.png') },
  'planet.jupiter': { name: '목성', img: require('../../assets/shop/planet_jupiter.png') },
  'planet.blossom': { name: '꽃 행성', img: require('../../assets/shop/planet_blossom.png') },
  'planet.candy': { name: '사탕 행성', img: require('../../assets/shop/planet_candy.png') },
  'planet.galaxy': { name: '나선 은하', img: require('../../assets/shop/planet_galaxy.png') },
  'planet.whale': { name: '우주 고래', img: require('../../assets/shop/planet_whale.png'), frames: 8, fps: 5 },
  'planet.sun': { name: '태양', img: require('../../assets/shop/planet_sun.png'), frames: 8, fps: 5 },
  'planet.blackhole': { name: '블랙홀', img: require('../../assets/shop/planet_blackhole.png'), frames: 8, fps: 5 },
};

export const STATION_SPRITES: Record<string, SpriteEntry> = {
  default: { name: '기본 위성', img: require('../../assets/shop/station_default.png') },
  'station.mint': { name: '민트 정거장', img: require('../../assets/shop/station_mint.png') },
  'station.moonbase': { name: '달 기지', img: require('../../assets/shop/station_moonbase.png') },
  'station.mothership': { name: '모선', img: require('../../assets/shop/station_mothership.png') },
  'station.sprout': { name: '새싹 온실', img: require('../../assets/shop/station_sprout.png') },
  'station.galaxy': { name: '은하수 전망대', img: require('../../assets/shop/station_galaxy.png') },
  'station.wood': { name: '원목 오두막', img: require('../../assets/shop/station_wood.png') },
  'station.candy': { name: '과자집', img: require('../../assets/shop/station_candy.png') },
  'station.dog': { name: '강아지', img: require('../../assets/shop/station_dog.png'), frames: 8, fps: 5 },
  'station.cat': { name: '고양이', img: require('../../assets/shop/station_cat.png'), frames: 8, fps: 5 },
  'station.hamster': { name: '햄스터', img: require('../../assets/shop/station_hamster.png'), frames: 8, fps: 5 },
};

export function spriteFor(registry: Record<string, SpriteEntry>, code: string | undefined | null): SpriteEntry {
  return (code && registry[code]) || registry.default;
}
