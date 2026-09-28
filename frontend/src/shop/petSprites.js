import gallery from '../assets/shop/pets/gallery.json'
import c1Idle from '../assets/shop/pets/cat-1-idle.png'
import c1Action from '../assets/shop/pets/cat-1-licking-1.png'
import c2Idle from '../assets/shop/pets/cat-2-idle.png'
import c2Action from '../assets/shop/pets/cat-2-licking-1.png'
import c3Idle from '../assets/shop/pets/cat-3-idle.png'
import c3Action from '../assets/shop/pets/cat-3-licking-1.png'
import c4Idle from '../assets/shop/pets/cat-4-idle.png'
import c4Action from '../assets/shop/pets/cat-4-licking-1.png'
import c5Idle from '../assets/shop/pets/cat-5-idle.png'
import c5Action from '../assets/shop/pets/cat-5-licking-1.png'
import c6Idle from '../assets/shop/pets/cat-6-idle.png'
import c6Action from '../assets/shop/pets/cat-6-licking-1.png'
import d1Idle from '../assets/shop/pets/golden-retriever-idle.png'
import d1Action from '../assets/shop/pets/golden-retriever-bark.png'
import d2Idle from '../assets/shop/pets/akita-idle.png'
import d2Action from '../assets/shop/pets/akita-bark.png'
import d3Idle from '../assets/shop/pets/great-dane-idle.png'
import d3Action from '../assets/shop/pets/great-dane-bark.png'
import d4Idle from '../assets/shop/pets/schnauzer-idle.png'
import d4Action from '../assets/shop/pets/schnauzer-bark.png'
import d5Idle from '../assets/shop/pets/saint-bernard-idle.png'
import d5Action from '../assets/shop/pets/saint-bernard-bark.png'
import d6Idle from '../assets/shop/pets/siberian-husky-idle.png'
import d6Action from '../assets/shop/pets/siberian-husky-bark.png'
import s1Idle from '../assets/shop/pets/bunny-idle.png'
import s1Action from '../assets/shop/pets/bunny-walk.png'
import s2Idle from '../assets/shop/pets/squirrel-idle.png'
import s2Action from '../assets/shop/pets/squirrel-run.png'

const images = {
  'cat-1-idle.png': c1Idle,
  'cat-1-licking-1.png': c1Action,
  'cat-2-idle.png': c2Idle,
  'cat-2-licking-1.png': c2Action,
  'cat-3-idle.png': c3Idle,
  'cat-3-licking-1.png': c3Action,
  'cat-4-idle.png': c4Idle,
  'cat-4-licking-1.png': c4Action,
  'cat-5-idle.png': c5Idle,
  'cat-5-licking-1.png': c5Action,
  'cat-6-idle.png': c6Idle,
  'cat-6-licking-1.png': c6Action,
  'golden-retriever-idle.png': d1Idle,
  'golden-retriever-bark.png': d1Action,
  'akita-idle.png': d2Idle,
  'akita-bark.png': d2Action,
  'great-dane-idle.png': d3Idle,
  'great-dane-bark.png': d3Action,
  'schnauzer-idle.png': d4Idle,
  'schnauzer-bark.png': d4Action,
  'saint-bernard-idle.png': d5Idle,
  'saint-bernard-bark.png': d5Action,
  'siberian-husky-idle.png': d6Idle,
  'siberian-husky-bark.png': d6Action,
  'bunny-idle.png': s1Idle,
  'bunny-walk.png': s1Action,
  'squirrel-idle.png': s2Idle,
  'squirrel-run.png': s2Action,
}

const stations = {
  'station.cat': {
    default: 'C1',
    variants: { ginger: 'C1', black: 'C2', gray: 'C3', brown: 'C4', white: 'C5', 'gray-tabby': 'C6' },
  },
  'station.dog': {
    default: 'D1',
    variants: {
      'golden-retriever': 'D1', akita: 'D2', 'great-dane': 'D3',
      schnauzer: 'D4', 'saint-bernard': 'D5', 'siberian-husky': 'D6',
    },
  },
  'station.hamster': { default: 'S1', variants: {} },
  'station.squirrel': { default: 'S2', variants: {} },
}
const pets = Object.fromEntries(gallery.map((pet) => [pet.id, pet]))

export function isPetStation(code) {
  return Object.hasOwn(stations, code)
}

export function petSpriteFor(code, variant, action = 'idle') {
  if (!isPetStation(code)) return undefined
  const station = stations[code]
  const id = Object.hasOwn(station.variants, variant) ? station.variants[variant] : station.default
  const pet = pets[id]
  const sprite = pet[action === 'action' ? 'action' : 'idle']
  return {
    img: images[sprite.file], frames: sprite.frames, fps: 5,
    cell: sprite.cell, box: sprite.box, name: pet.name,
  }
}
