// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { announce, ANNOUNCER_ID } from './announce'

describe('announce', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="${ANNOUNCER_ID}" role="status" aria-live="polite"></div>`
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(); return 1 })
  })
  it('라이브 리전 텍스트를 비웠다가 다시 채운다', () => {
    announce('분석이 끝났어요')
    expect(document.getElementById(ANNOUNCER_ID).textContent).toBe('분석이 끝났어요')
  })
  it('리전이 없으면 조용히 무시한다', () => {
    document.body.innerHTML = ''
    expect(() => announce('x')).not.toThrow()
  })
})
