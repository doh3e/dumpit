// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyBoldText, applyContrast, getBoldTextPref, getContrastPref } from './a11y'

function mockPrefersContrast(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: q === '(prefers-contrast: more)' ? matches : false,
    media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }))
}

describe('대비 설정', () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.contrast })
  afterEach(() => { vi.restoreAllMocks() })

  it('기본은 system이고 OS가 고대비면 data-contrast=high', () => {
    mockPrefersContrast(true)
    expect(getContrastPref()).toBe('system')
    applyContrast('system')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(localStorage.getItem('dumpit-contrast')).toBeNull()
  })
  it('normal은 OS가 고대비여도 속성을 지운다', () => {
    mockPrefersContrast(true)
    applyContrast('normal')
    expect(document.documentElement.dataset.contrast).toBeUndefined()
    expect(localStorage.getItem('dumpit-contrast')).toBe('normal')
  })
  it('high는 OS와 무관하게 켠다', () => {
    mockPrefersContrast(false)
    applyContrast('high')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(getContrastPref()).toBe('high')
  })
})

describe('굵은 글자 설정', () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.boldText })
  it('켜면 data-bold-text=1과 키 저장, 끄면 둘 다 제거', () => {
    expect(getBoldTextPref()).toBe(false)
    applyBoldText(true)
    expect(document.documentElement.dataset.boldText).toBe('1')
    expect(localStorage.getItem('dumpit-bold-text')).toBe('1')
    applyBoldText(false)
    expect(document.documentElement.dataset.boldText).toBeUndefined()
    expect(localStorage.getItem('dumpit-bold-text')).toBeNull()
  })
})
