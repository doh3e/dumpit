import { describe, it, expect } from 'vitest'
import { nextAfterFocus, autoStartNextFocus } from './pomodoroCycle'

describe('nextAfterFocus', () => {
  it('세트 1(기존 동작)은 항상 짧은 휴식 - DONE 없음', () => {
    expect(nextAfterFocus({ completedSets: 1, setsTarget: 1, longBreakEvery: 4 }))
      .toEqual({ type: 'BREAK', long: false })
  })

  it('유한 세트 마지막 집중 후에는 휴식 없이 종료', () => {
    expect(nextAfterFocus({ completedSets: 4, setsTarget: 4, longBreakEvery: 4 }))
      .toEqual({ type: 'DONE' })
    expect(nextAfterFocus({ completedSets: 2, setsTarget: 2, longBreakEvery: 4 }))
      .toEqual({ type: 'DONE' })
  })

  it('중간 세트는 짧은 휴식', () => {
    expect(nextAfterFocus({ completedSets: 1, setsTarget: 4, longBreakEvery: 4 }))
      .toEqual({ type: 'BREAK', long: false })
    expect(nextAfterFocus({ completedSets: 3, setsTarget: 4, longBreakEvery: 4 }))
      .toEqual({ type: 'BREAK', long: false })
  })

  it('긴 휴식 주기에 해당하면 긴 휴식', () => {
    expect(nextAfterFocus({ completedSets: 4, setsTarget: 6, longBreakEvery: 4 }))
      .toEqual({ type: 'BREAK', long: true })
    expect(nextAfterFocus({ completedSets: 8, setsTarget: 0, longBreakEvery: 4 }))
      .toEqual({ type: 'BREAK', long: true })
  })

  it('무한(0)은 DONE 없이 계속', () => {
    expect(nextAfterFocus({ completedSets: 99, setsTarget: 0, longBreakEvery: 4 }).type)
      .toBe('BREAK')
  })
})

describe('autoStartNextFocus', () => {
  it('세트 1만 수동(기존 동작), 나머지는 자동 계속', () => {
    expect(autoStartNextFocus(1)).toBe(false)
    expect(autoStartNextFocus(2)).toBe(true)
    expect(autoStartNextFocus(0)).toBe(true)
  })
})
