// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import PixelSprite from './PixelSprite'

let resize
let disconnect
beforeEach(() => {
  disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { resize = callback }
    observe() {}
    disconnect = disconnect
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 64, height: 64 })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const pet = { img: '/cat.png', frames: 10, fps: 5, cell: 50, box: [14, 18, 35, 32] }

describe('PixelSprite', () => {
  it('정적 이미지와 없는 스프라이트의 기존 경로를 유지한다', () => {
    const { container, rerender } = render(<PixelSprite sprite={{ img: '/planet.png' }} className="w-10" style={{ opacity: .5 }} />)
    expect(container.querySelector('img').getAttribute('src')).toBe('/planet.png')
    expect(container.querySelector('img').style.opacity).toBe('0.5')
    expect(container.querySelector('img').alt).toBe('')
    rerender(<PixelSprite />)
    expect(container.firstChild).toBeNull()
  })

  it.each([2, 3, 4, 5, 8, 10])('%i프레임을 한 셀씩 진행할 CSS 값으로 전달한다', (frames) => {
    const { container } = render(<PixelSprite sprite={{ ...pet, frames }} />)
    const strip = container.querySelector('.pixel-sprite-strip')
    expect(strip).not.toBeNull()
    expect(strip.style.getPropertyValue('--sprite-frames')).toBe(String(frames))
    expect(strip.style.getPropertyValue('--sprite-duration')).toBe(`${frames / 5}s`)
    expect(strip.style.getPropertyValue('--sprite-travel')).toBe(`${-50 * frames * 3}px`)
    expect(strip.style.width).toBe(`${50 * frames * 3}px`)
  })

  it('투명 여백을 제외하고 정수 배율로 정렬한다', () => {
    const { container } = render(<PixelSprite sprite={pet} className="w-16 h-16" />)
    const frame = container.querySelector('.pixel-sprite-frame')
    const strip = container.querySelector('.pixel-sprite-strip')
    expect(frame.style.width).toBe('63px')
    expect(frame.style.height).toBe('42px')
    expect(strip.style.left).toBe('-42px')
    expect(strip.style.top).toBe('-54px')
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
    expect(strip.alt).toBe('')
  })

  it('반응형 슬롯이 줄면 큰 동물의 귀와 꼬리도 모두 들어오도록 축소한다', () => {
    const dog = { img: '/dog.png', frames: 3, cell: 100, box: [31, 33, 77, 67] }
    const { container, unmount } = render(<PixelSprite sprite={dog} />)
    act(() => resize([{ contentRect: { width: 40, height: 40 } }]))
    const frame = container.querySelector('.pixel-sprite-frame')
    const strip = container.querySelector('.pixel-sprite-strip')
    expect(Number.parseFloat(frame.style.width)).toBeCloseTo(40)
    expect(Number.parseFloat(frame.style.height)).toBeLessThanOrEqual(40)
    expect(Number.parseFloat(strip.style.width) / 3).toBeCloseTo(100 * 40 / 46)
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it('셀 메타데이터 없는 기존 8프레임 행성은 슬롯 전체에 맞춘다', () => {
    const { container } = render(<PixelSprite sprite={{ img: '/whale.png', frames: 8, fps: 5 }} />)
    const frame = container.querySelector('.pixel-sprite-frame')
    const strip = container.querySelector('.pixel-sprite-strip')
    expect(frame.style.width).toBe('100%')
    expect(strip.style.width).toBe('800%')
    expect(strip.style.getPropertyValue('--sprite-travel')).toBe('-100%')
  })
})
