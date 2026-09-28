import { describe, expect, it } from 'vitest'
import { CELEBRATION_SPRITES, STICKER_SPRITES } from './registry'
import { buildParticles } from './celebrationMotions'

describe('하트 축하', () => {
  it('기존 구매 코드로 하트 14개를 문구 좌우 높이에서 만든다', () => {
    const sprite = CELEBRATION_SPRITES['celeb.shooting-star']
    expect(sprite.name).toBe('하트 축하')
    expect(sprite.img).toBe(STICKER_SPRITES['sticker.heart'].img)
    const particles = buildParticles(sprite)
    expect(particles).toHaveLength(14)
    for (const particle of particles) {
      expect(particle.className).toContain('celeb-heart')
      expect(parseFloat(particle.style.top)).toBeGreaterThanOrEqual(39)
      expect(parseFloat(particle.style.top)).toBeLessThanOrEqual(69)
      expect(parseFloat(particle.style.animationDelay) + parseFloat(particle.style.animationDuration)).toBeLessThanOrEqual(2.3)
      expect(particle.style['--drift']).toMatch(/^-?18px$/)
    }
    expect(particles.some(p => parseFloat(p.style.left) < 35)).toBe(true)
    expect(particles.some(p => parseFloat(p.style.left) > 65)).toBe(true)
  })

  it('유성우와 기존 로켓의 모션을 유지한다', () => {
    expect(buildParticles(CELEBRATION_SPRITES['celeb.meteor-shower'])).toHaveLength(24)
    expect(buildParticles(CELEBRATION_SPRITES.default).every(p => p.className === 'celebration-sprite')).toBe(true)
  })
})
