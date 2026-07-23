import { describe, expect, it } from 'vitest'
import { buildPriorityPatch } from './priorityPatch'

describe('buildPriorityPatch (mobile priorityPatch.ts 이식)', () => {
  it('슬라이더를 움직였으면 지정값 저장', () => {
    expect(buildPriorityPatch(true, false, 0.7)).toEqual({ userPriorityScore: 0.7 })
  })
  it('초기화 후 다시 움직였으면 새 지정값이 이긴다', () => {
    expect(buildPriorityPatch(true, true, 0.7)).toEqual({ userPriorityScore: 0.7 })
  })
  it('초기화만 했으면 지정 해제(null) 전송', () => {
    expect(buildPriorityPatch(false, true, 0.7)).toEqual({ userPriorityScore: null })
  })
  it('안 건드렸으면 빈 패치 — 자동 조정 유지', () => {
    expect(buildPriorityPatch(false, false, 0.7)).toEqual({})
  })
})
