/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrainDumpTaskEditor from './BrainDumpTaskEditor'

const task = {
  title: '  발표 초안  ',
  deadline: '2030-01-02T03:04:00',
  estimatedMinutes: 90,
}

function offsetDeadlineFixture() {
  return new Date(2030, 0, 2).getTimezoneOffset() === 0
    ? '2030-01-02T03:04:00.000+09:00'
    : '2030-01-02T03:04:00.000Z'
}

function expectedLocalInput(value) {
  const date = new Date(value)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-13T00:00:00.000Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('BrainDumpTaskEditor', () => {
  it('로컬 일시를 UTC 변환 없이 표시하고 trim한 제목·지운 마감·빈 예상 시간을 적용한다', () => {
    const onApply = vi.fn()
    render(<BrainDumpTaskEditor task={task} onApply={onApply} onCancel={vi.fn()} />)

    const title = screen.getByRole('textbox', { name: '할 일 제목' })
    const deadline = screen.getByLabelText('마감 일시 (선택)')
    const minutes = screen.getByLabelText('예상 시간 (선택)')
    expect(title).toHaveAttribute('maxlength', '200')
    expect(deadline).toHaveValue('2030-01-02T03:04')

    fireEvent.change(title, { target: { value: '  수정한 발표  ' } })
    fireEvent.click(screen.getByRole('button', { name: '✕ 지우기' }))
    fireEvent.change(minutes, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))

    expect(onApply).toHaveBeenCalledWith({
      title: '수정한 발표',
      deadline: null,
      estimatedMinutes: null,
    })
  })

  it('offset ISO 마감은 목록과 같은 로컬 wall-clock 값으로 편집한다', () => {
    const deadline = offsetDeadlineFixture()
    render(
      <BrainDumpTaskEditor
        task={{ ...task, deadline }}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('마감 일시 (선택)')).toHaveValue(expectedLocalInput(deadline))
  })

  it('유효한 미래 로컬 마감과 양의 정수를 그대로 적용한다', () => {
    const onApply = vi.fn()
    render(<BrainDumpTaskEditor task={task} onApply={onApply} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '적용' }))

    expect(onApply).toHaveBeenCalledWith({
      title: '발표 초안',
      deadline: '2030-01-02T03:04',
      estimatedMinutes: 90,
    })
  })

  it('제목·마감·예상 시간 오류를 각 입력에 연결하고 첫 오류로 포커스를 옮긴다', () => {
    const onApply = vi.fn()
    render(<BrainDumpTaskEditor task={{ ...task, deadline: null }} onApply={onApply} onCancel={vi.fn()} />)

    const title = screen.getByRole('textbox', { name: '할 일 제목' })
    fireEvent.change(title, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAttribute('aria-describedby')
    expect(screen.getByText('제목을 입력해주세요.')).toHaveAttribute('role', 'alert')
    expect(title).toHaveFocus()
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.change(title, { target: { value: '유효한 제목' } })
    const deadline = screen.getByLabelText('마감 일시 (선택)')
    fireEvent.change(deadline, { target: { value: '2000-01-01T00:00' } })
    expect(deadline).toHaveValue('2000-01-01T00:00')
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    const invalidDeadline = screen.getByLabelText('마감 일시 (선택)')
    expect(invalidDeadline).toHaveAttribute('aria-invalid', 'true')
    expect(invalidDeadline).toHaveAttribute('aria-describedby')
    expect(screen.getByText('마감 일시는 현재 시간 이후여야 해요.')).toHaveAttribute('role', 'alert')
    expect(invalidDeadline).toHaveFocus()

    fireEvent.change(deadline, { target: { value: '' } })
    const minutes = screen.getByLabelText('예상 시간 (선택)')
    fireEvent.change(minutes, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    const invalidMinutes = screen.getByLabelText('예상 시간 (선택)')
    expect(invalidMinutes).toHaveAttribute('aria-invalid', 'true')
    expect(invalidMinutes).toHaveAttribute('aria-describedby')
    expect(screen.getByText('예상 시간은 1분 이상의 정수로 입력해주세요.')).toHaveAttribute('role', 'alert')
    expect(invalidMinutes).toHaveFocus()

    fireEvent.change(invalidMinutes, { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(screen.getByText('예상 시간은 1분 이상의 정수로 입력해주세요.')).toHaveAttribute('role', 'alert')

    fireEvent.change(invalidMinutes, { target: { value: '2147483648' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(screen.getByText('예상 시간이 너무 커요. 더 짧게 입력해주세요.')).toHaveAttribute('role', 'alert')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('취소하면 로컬 변경을 적용하지 않는다', () => {
    const onApply = vi.fn()
    const onCancel = vi.fn()
    render(<BrainDumpTaskEditor task={task} onApply={onApply} onCancel={onCancel} />)

    fireEvent.change(screen.getByRole('textbox', { name: '할 일 제목' }), {
      target: { value: '버릴 변경' },
    })
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onApply).not.toHaveBeenCalled()
  })
})
