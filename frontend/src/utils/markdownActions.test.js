import { describe, it, expect } from 'vitest'
import { applyMarkdownAction } from './markdownActions'

describe('applyMarkdownAction', () => {
  it('선택 영역을 굵게 감싼다', () => {
    expect(applyMarkdownAction('hello world', 6, 11, 'bold'))
      .toEqual({ text: 'hello **world**', selStart: 8, selEnd: 13 })
  })

  it('선택 없으면 마커만 넣고 커서를 가운데 둔다', () => {
    expect(applyMarkdownAction('abc', 3, 3, 'bold'))
      .toEqual({ text: 'abc****', selStart: 5, selEnd: 5 })
  })

  it('기울임·취소선·인라인 코드 마커', () => {
    expect(applyMarkdownAction('ab', 0, 2, 'italic').text).toBe('*ab*')
    expect(applyMarkdownAction('ab', 0, 2, 'strike').text).toBe('~~ab~~')
    expect(applyMarkdownAction('ab', 0, 2, 'code').text).toBe('`ab`')
  })

  it('제목은 현재 줄 앞에 #을 붙이고 기존 레벨을 교체한다', () => {
    expect(applyMarkdownAction('## old title', 5, 5, 'h1').text).toBe('# old title')
    expect(applyMarkdownAction('line1\ntitle', 8, 8, 'h3').text).toBe('line1\n### title')
  })

  it('목록은 선택된 각 줄 앞에 -를 붙인다(이미 있으면 유지)', () => {
    expect(applyMarkdownAction('a\nb', 0, 3, 'ul').text).toBe('- a\n- b')
    expect(applyMarkdownAction('- a\nb', 0, 5, 'ul').text).toBe('- a\n- b')
  })

  it('코드블록은 펜스 줄로 감싼다', () => {
    expect(applyMarkdownAction('code', 0, 4, 'codeblock'))
      .toEqual({ text: '```\ncode\n```', selStart: 4, selEnd: 8 })
  })

  it('결과가 maxLength를 넘으면 null(no-op)', () => {
    expect(applyMarkdownAction('12345678', 0, 8, 'bold', 10)).toBeNull()
  })

  it('모르는 액션은 null', () => {
    expect(applyMarkdownAction('ab', 0, 2, 'nope')).toBeNull()
  })
})
