import { describe, expect, it } from 'vitest'
import { CELEBRATION_SPRITES, STICKER_SPRITES } from './registry'
import { BUILDERS, buildParticles } from './celebrationMotions'

// 카탈로그(백엔드)와 registry(프론트)의 짝 맞음 + 빌더 계약을 지키는지 검사
describe('registry 무결성', () => {
  it('완료축하 항목은 img와 유효한 motion을 가진다', () => {
    expect(Object.keys(CELEBRATION_SPRITES)).toHaveLength(10) // default + 기존 3 + 신규 6
    for (const [code, sprite] of Object.entries(CELEBRATION_SPRITES)) {
      expect(sprite.img, code).toBeTruthy()
      const motion = sprite.motion ?? 'launch'
      expect(BUILDERS[motion], `${code}: motion ${motion}`).toBeTypeOf('function')
    }
  })

  it('빌더는 파티클 30개 이하를 만들고 src·className이 전부 채워진다', () => {
    for (const [code, sprite] of Object.entries(CELEBRATION_SPRITES)) {
      const parts = buildParticles(sprite)
      expect(parts.length, code).toBeGreaterThan(0)
      expect(parts.length, code).toBeLessThanOrEqual(30)
      for (const p of parts) {
        expect(p.src, code).toBeTruthy()
        expect(p.className, code).toBeTruthy()
        expect(p.style, code).toBeTypeOf('object')
      }
    }
  })

  it('기본(launch) 빌더는 기존 celebration-sprite 클래스를 유지한다', () => {
    const parts = buildParticles(CELEBRATION_SPRITES.default)
    expect(parts).toHaveLength(6)
    parts.forEach((p) => expect(p.className).toBe('celebration-sprite'))
  })

  it('스티커는 8종이고 전부 img를 가진다', () => {
    expect(Object.keys(STICKER_SPRITES)).toHaveLength(8)
    for (const [code, sprite] of Object.entries(STICKER_SPRITES)) {
      expect(sprite.img, code).toBeTruthy()
    }
  })
})
