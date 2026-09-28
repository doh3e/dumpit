import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import gallery from '../assets/shop/pets/gallery.json'
import { isPetStation, petSpriteFor } from './petSprites'
import { STATION_SPRITES, stationSpriteFor } from './registry'

const cats = ['ginger', 'black', 'gray', 'brown', 'white', 'gray-tabby']
const dogs = ['golden-retriever', 'akita', 'great-dane', 'schnauzer', 'saint-bernard', 'siberian-husky']

describe('동물 정거장 원본과 외형', () => {
  it('고양이와 강아지의 여섯 외형이 각각 다른 원본을 사용한다', () => {
    for (const [code, variants] of [['station.cat', cats], ['station.dog', dogs]]) {
      expect(isPetStation(code)).toBe(true)
      expect(new Set(variants.map((variant) => petSpriteFor(code, variant).img)).size).toBe(6)
      variants.forEach((variant) => {
        expect(petSpriteFor(code, variant).frames).toBe(10)
        expect(petSpriteFor(code, variant, 'action').img).not.toBe(petSpriteFor(code, variant).img)
      })
    }
  })

  it('기존 구매·알 수 없는 선택값은 기본 외형을 표시하고 비동물은 유지한다', () => {
    for (const variant of [undefined, null, '', 'unknown', 'toString']) {
      expect(petSpriteFor('station.cat', variant)).toEqual(petSpriteFor('station.cat', 'ginger'))
      expect(stationSpriteFor('station.dog', variant)).toEqual(petSpriteFor('station.dog', 'golden-retriever'))
    }
    for (const code of [undefined, 'unknown', 'toString', 'station.moonbase']) {
      expect(isPetStation(code)).toBe(false)
      expect(petSpriteFor(code)).toBeUndefined()
    }
    expect(stationSpriteFor('station.moonbase')).toBe(STATION_SPRITES['station.moonbase'])
    expect(stationSpriteFor(undefined)).toBe(STATION_SPRITES.default)
    expect(stationSpriteFor('unknown')).toBe(STATION_SPRITES.default)
  })

  it('햄스터 상품 코드는 토끼로 이어지고 다람쥐는 별도 정거장이다', () => {
    expect(stationSpriteFor('station.hamster')).toMatchObject({ name: '회색 토끼', frames: 2, cell: 64 })
    expect(stationSpriteFor('station.hamster', null, 'action').frames).toBe(4)
    expect(stationSpriteFor('station.squirrel')).toMatchObject({ name: '다람쥐', frames: 2, cell: 64 })
    expect(stationSpriteFor('station.squirrel', null, 'action').frames).toBe(3)
    expect(petSpriteFor('station.cat', null, 'action').frames).toBe(5)
    expect(petSpriteFor('station.dog', null, 'action').frames).toBe(3)
  })

  it('14종 28개의 원본 PNG와 프레임 크기·해시를 보존한다', () => {
    expect(gallery).toHaveLength(14)
    const files = new Set()
    gallery.forEach((pet) => {
      expect(pet.license).toBe('CC0')
      for (const action of ['idle', 'action']) {
        const sprite = pet[action]
        files.add(sprite.file)
        const bytes = readFileSync(new URL(`../assets/shop/pets/${sprite.file}`, import.meta.url))
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(sprite.sha256)
        expect(bytes.readUInt32BE(16)).toBe(sprite.cell * sprite.frames)
        expect(bytes.readUInt32BE(20)).toBe(sprite.cell)
        const [left, top, right, bottom] = sprite.box
        expect(left).toBeGreaterThanOrEqual(0)
        expect(top).toBeGreaterThanOrEqual(0)
        expect(right).toBeGreaterThan(left)
        expect(bottom).toBeGreaterThan(top)
        expect(right).toBeLessThanOrEqual(sprite.cell)
        expect(bottom).toBeLessThanOrEqual(sprite.cell)
      }
    })
    expect(files.size).toBe(28)
  })
})
