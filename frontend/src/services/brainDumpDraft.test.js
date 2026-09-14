// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearDraft,
  pruneExpiredDrafts,
  readDraft,
  writeDraft,
} from './brainDumpDraft'

const PREFIX = 'dumpit:brain-dump-draft:v1:'
const DAY_MS = 24 * 60 * 60 * 1000
const NOW = 2_000_000_000_000

describe('brainDumpDraft 저장소', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('email을 그대로 인코딩해 계정을 분리하고 원문 공백을 보존한다', () => {
    const accountA = ' Alice+draft@example.com '
    const accountB = 'alice+draft@example.com'

    expect(writeDraft(accountA, '  첫 줄\n둘째 줄  ', NOW)).toEqual({
      version: 1,
      rawText: '  첫 줄\n둘째 줄  ',
      updatedAt: NOW,
    })
    writeDraft(accountB, 'B 초안', NOW)

    expect(localStorage.getItem(`${PREFIX}%20Alice%2Bdraft%40example.com%20`)).toBe(
      JSON.stringify({ version: 1, rawText: '  첫 줄\n둘째 줄  ', updatedAt: NOW }),
    )
    expect(readDraft(accountA, NOW)).toEqual({
      version: 1,
      rawText: '  첫 줄\n둘째 줄  ',
      updatedAt: NOW,
    })
    expect(readDraft(accountB, NOW)?.rawText).toBe('B 초안')
  })

  it.each([undefined, null, '', '   ', '\n\t', 42])(
    '비로그인 또는 잘못된 accountKey %p를 거부한다',
    (accountKey) => {
      expect(() => readDraft(accountKey, NOW)).toThrow()
      expect(() => writeDraft(accountKey, '초안', NOW)).toThrow()
      expect(() => clearDraft(accountKey)).toThrow()
    },
  )

  it.each([NaN, Infinity, -1, '1', null])('잘못된 now %p를 거부한다', (now) => {
    expect(() => readDraft('a@example.com', now)).toThrow()
    expect(() => writeDraft('a@example.com', '초안', now)).toThrow()
    expect(() => pruneExpiredDrafts(now)).toThrow()
  })

  it('빈 문자열만 현재 계정 초안을 지우고 공백 원문은 저장한다', () => {
    writeDraft('a@example.com', 'A', NOW)
    writeDraft('b@example.com', 'B', NOW)

    expect(writeDraft('a@example.com', '', NOW)).toBeNull()
    expect(readDraft('a@example.com', NOW)).toBeNull()
    expect(readDraft('b@example.com', NOW)?.rawText).toBe('B')
    expect(writeDraft('a@example.com', ' \n ', NOW)?.rawText).toBe(' \n ')
  })

  it('3000자를 저장하고 초과 길이와 문자열이 아닌 원문은 거부한다', () => {
    expect(writeDraft('a@example.com', '가'.repeat(3000), NOW)?.rawText).toHaveLength(3000)
    expect(() => writeDraft('a@example.com', '가'.repeat(3001), NOW)).toThrow()
    expect(() => writeDraft('a@example.com', null, NOW)).toThrow()
  })

  it.each([
    ['깨진 JSON', '{깨짐'],
    ['구버전', JSON.stringify({ version: 0, rawText: '초안', updatedAt: NOW })],
    ['추가 필드', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW, dumpId: 'secret' })],
    ['초과 원문', JSON.stringify({ version: 1, rawText: '가'.repeat(3001), updatedAt: NOW })],
    ['잘못된 시각', JSON.stringify({ version: 1, rawText: '초안', updatedAt: -1 })],
    ['미래 시각', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW + 1 })],
    ['7일 만료', JSON.stringify({ version: 1, rawText: '초안', updatedAt: NOW - 7 * DAY_MS })],
  ])('%s 데이터는 해당 키만 정리하고 null을 반환한다', (_label, raw) => {
    const key = `${PREFIX}a%40example.com`
    localStorage.setItem(key, raw)
    localStorage.setItem('unrelated', 'preserve')

    expect(readDraft('a@example.com', NOW)).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('preserve')
  })

  it('만료 직전의 정확한 구조는 보존한다', () => {
    const draft = { version: 1, rawText: '유효', updatedAt: NOW - 7 * DAY_MS + 1 }
    localStorage.setItem(`${PREFIX}a%40example.com`, JSON.stringify(draft))

    expect(readDraft('a@example.com', NOW)).toEqual(draft)
  })

  it('시작 정리는 prefix의 손상·만료·잘못 인코딩된 키만 제거한다', () => {
    const validKey = `${PREFIX}valid%40example.com`
    const expiredKey = `${PREFIX}expired%40example.com`
    const malformedAccountKey = `${PREFIX}%E0%A4%A`
    const extraFieldKey = `${PREFIX}extra%40example.com`
    localStorage.setItem(validKey, JSON.stringify({ version: 1, rawText: '보존', updatedAt: NOW }))
    localStorage.setItem(expiredKey, JSON.stringify({ version: 1, rawText: '만료', updatedAt: NOW - 7 * DAY_MS }))
    localStorage.setItem(malformedAccountKey, JSON.stringify({ version: 1, rawText: '손상', updatedAt: NOW }))
    localStorage.setItem(extraFieldKey, JSON.stringify({ version: 1, rawText: '손상', updatedAt: NOW, result: [] }))
    localStorage.setItem('other:feature', '그대로')

    pruneExpiredDrafts(NOW)

    expect(localStorage.getItem(validKey)).not.toBeNull()
    expect(localStorage.getItem(expiredKey)).toBeNull()
    expect(localStorage.getItem(malformedAccountKey)).toBeNull()
    expect(localStorage.getItem(extraFieldKey)).toBeNull()
    expect(localStorage.getItem('other:feature')).toBe('그대로')
  })

  it('저장소 quota·권한 오류와 손상 데이터 삭제 실패를 숨기지 않는다', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => { throw new DOMException('quota', 'QuotaExceededError') })
    expect(() => writeDraft('a@example.com', '민감한 원문', NOW)).toThrow()
    setItem.mockRestore()

    const key = `${PREFIX}a%40example.com`
    localStorage.setItem(key, '{민감한 JSON')
    vi.spyOn(Storage.prototype, 'removeItem')
      .mockImplementationOnce(() => { throw new DOMException('denied', 'SecurityError') })

    expect(() => readDraft('a@example.com', NOW)).toThrow()
    expect(localStorage.getItem(key)).toBe('{민감한 JSON')
  })

  it('발생시킨 오류 메시지에 계정·원문·저장 JSON을 노출하지 않는다', () => {
    const account = 'private@example.com'
    const rawText = '비밀 원문'
    const storedJson = JSON.stringify({ version: 1, rawText, updatedAt: NOW })
    vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => { throw new Error(`denied ${account} ${rawText} ${storedJson}`) })

    let error
    try {
      writeDraft(account, rawText, NOW)
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect(error.message).not.toContain(account)
    expect(error.message).not.toContain(rawText)
    expect(error.message).not.toContain('rawText')
    expect(error.cause).toBeUndefined()
    expect(JSON.stringify(error)).not.toContain(account)
    expect(JSON.stringify(error)).not.toContain(rawText)
  })
})
