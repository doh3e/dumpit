/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MarkdownEditor from './MarkdownEditor'

function ControlledEditor({ initialValue = '**굵게** 본문', maxLength = 20 }) {
  const [value, setValue] = useState(initialValue)
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      maxLength={maxLength}
      rows={4}
      placeholder="아이디어 내용"
      ariaLabel="아이디어 본문"
    />
  )
}

describe('MarkdownEditor', () => {
  let animationFrames

  beforeEach(() => {
    animationFrames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('refined 조작과 입력 표현으로 쓰기와 실제 마크다운 미리보기를 전환한다', () => {
    const { container } = render(<ControlledEditor />)

    const writeButton = screen.getByRole('button', { name: '쓰기' })
    const previewButton = screen.getByRole('button', { name: '미리보기' })
    const textarea = screen.getByRole('textbox', { name: '아이디어 본문' })
    expect(container.firstChild).toHaveClass('surface-refined')
    expect(container.firstChild).not.toHaveClass('overflow-hidden')
    expect(writeButton).toHaveClass('btn-refined', 'btn-refined-selected')
    expect(previewButton).toHaveClass('btn-refined')
    expect(writeButton).toHaveAttribute('aria-pressed', 'true')
    expect(previewButton).toHaveAttribute('aria-pressed', 'false')
    expect(textarea).toHaveClass('input-refined')
    expect(textarea).toHaveAttribute('maxlength', '20')
    expect(textarea).toHaveAttribute('rows', '4')
    expect(textarea).toHaveAttribute('placeholder', '아이디어 내용')

    fireEvent.click(previewButton)

    expect(screen.queryByRole('textbox', { name: '아이디어 본문' })).not.toBeInTheDocument()
    expect(screen.getByText('굵게').tagName).toBe('STRONG')
    expect(previewButton).toHaveClass('btn-refined-selected')
    expect(writeButton).toHaveAttribute('aria-pressed', 'false')
    expect(previewButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(writeButton)
    expect(screen.getByRole('textbox', { name: '아이디어 본문' })).toHaveValue('**굵게** 본문')
  })

  it('선택한 문자열에 굵게 서식을 적용한 뒤 선택과 포커스를 복원한다', () => {
    render(<ControlledEditor initialValue="굵게 할 문장" />)
    const textarea = screen.getByRole('textbox', { name: '아이디어 본문' })
    textarea.focus()
    textarea.setSelectionRange(0, 2)

    const boldButton = screen.getByRole('button', { name: '굵게' })
    fireEvent.mouseDown(boldButton)
    fireEvent.click(boldButton)
    expect(textarea).toHaveValue('**굵게** 할 문장')

    act(() => animationFrames.shift()())

    expect(textarea).toHaveFocus()
    expect(textarea.selectionStart).toBe(2)
    expect(textarea.selectionEnd).toBe(4)
  })

  it('서식 적용 결과가 maxLength를 넘으면 값과 선택을 바꾸지 않는다', () => {
    render(<ControlledEditor initialValue="1234" maxLength={6} />)
    const textarea = screen.getByRole('textbox', { name: '아이디어 본문' })
    textarea.focus()
    textarea.setSelectionRange(0, 4)

    const boldButton = screen.getByRole('button', { name: '굵게' })
    fireEvent.mouseDown(boldButton)
    fireEvent.click(boldButton)

    expect(textarea).toHaveValue('1234')
    expect(textarea).toHaveFocus()
    expect(textarea.selectionStart).toBe(0)
    expect(textarea.selectionEnd).toBe(4)
    expect(animationFrames).toHaveLength(0)
  })
})
