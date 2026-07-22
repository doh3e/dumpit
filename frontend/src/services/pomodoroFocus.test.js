import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPomodoroFocus,
  getPomodoroFocus,
  setPomodoroFocus,
  subscribePomodoroFocus,
} from './pomodoroFocus'

const OWNER_A = {}
const OWNER_B = {}

describe('pomodoroFocus store', () => {
  beforeEach(() => {
    clearPomodoroFocus(OWNER_A)
    clearPomodoroFocus(OWNER_B)
    setPomodoroFocus(OWNER_A, null)
    clearPomodoroFocus(OWNER_A)
  })

  it('set 하면 상태가 저장되고 구독자에 알린다', () => {
    const seen = vi.fn()
    const unsubscribe = subscribePomodoroFocus(seen)

    setPomodoroFocus(OWNER_A, { taskId: '1', title: '보고서' })

    expect(getPomodoroFocus()).toEqual({ taskId: '1', title: '보고서' })
    expect(seen).toHaveBeenCalledWith({ taskId: '1', title: '보고서' })
    unsubscribe()
  })

  it('소유자가 clear 하면 비워진다', () => {
    setPomodoroFocus(OWNER_A, { taskId: '1', title: '보고서' })
    clearPomodoroFocus(OWNER_A)
    expect(getPomodoroFocus()).toBeNull()
  })

  it('소유자가 아니면 clear 를 무시한다', () => {
    setPomodoroFocus(OWNER_A, { taskId: '1', title: '보고서' })
    clearPomodoroFocus(OWNER_B)
    expect(getPomodoroFocus()).toEqual({ taskId: '1', title: '보고서' })
  })

  it('나중에 set 한 인스턴스가 소유권을 가져간다', () => {
    setPomodoroFocus(OWNER_A, { taskId: '1', title: 'A' })
    setPomodoroFocus(OWNER_B, { taskId: '2', title: 'B' })
    clearPomodoroFocus(OWNER_A)
    expect(getPomodoroFocus()).toEqual({ taskId: '2', title: 'B' })
    clearPomodoroFocus(OWNER_B)
    expect(getPomodoroFocus()).toBeNull()
  })
})
