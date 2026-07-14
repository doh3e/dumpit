// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applySkins, applySkinsTransient } from './applySkins'

const ds = () => document.documentElement.dataset

describe('applySkins', () => {
  beforeEach(() => {
    localStorage.clear()
    delete ds().skinBg
    delete ds().skinChrome
    delete ds().skinPomodoro
  })

  it('dataset과 localStorage 캐시를 모두 갱신한다', () => {
    applySkins({ BACKGROUND: 'bg.ocean', CHROME: 'chrome.rose' })
    expect(ds().skinBg).toBe('ocean')
    expect(ds().skinChrome).toBe('rose')
    expect(JSON.parse(localStorage.getItem('dumpit_equipments')))
      .toEqual({ BACKGROUND: 'bg.ocean', CHROME: 'chrome.rose' })
  })

  it('applySkinsTransient는 dataset만 바꾸고 캐시는 건드리지 않는다', () => {
    applySkins({ BACKGROUND: 'bg.ocean' })
    applySkinsTransient({ BACKGROUND: 'bg.sprout', POMODORO: 'pomo.galaxy' })
    expect(ds().skinBg).toBe('sprout')
    expect(ds().skinPomodoro).toBe('galaxy')
    // 캐시는 실제 장착 상태 그대로 — 미리보기 비영속의 핵심 불변식
    expect(JSON.parse(localStorage.getItem('dumpit_equipments')))
      .toEqual({ BACKGROUND: 'bg.ocean' })
  })

  it('transient에 코드 없는 슬롯은 dataset에서 제거된다 (해제 원복)', () => {
    applySkinsTransient({ BACKGROUND: 'bg.ocean' })
    applySkinsTransient({})
    expect(ds().skinBg).toBeUndefined()
  })
})
