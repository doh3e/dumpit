// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import useDocumentTitle, { titleFor } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  it('경로별 제목을 "이름 | 덤핏"으로 만든다', () => {
    expect(titleFor('/dashboard')).toBe('대시보드 | 덤핏')
    expect(titleFor('/unknown')).toBe('덤핏(Dumpit!)')
  })
  it('document.title을 설정한다', () => {
    renderHook(() => useDocumentTitle('마이페이지 | 덤핏'))
    expect(document.title).toBe('마이페이지 | 덤핏')
  })
})
