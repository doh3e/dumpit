/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TaskListCard from './TaskListCard'

afterEach(cleanup)

const task = {
  taskId: 1,
  title: '보고서 쓰기',
  category: 'WORK',
  status: 'TODO',
  deadline: null,
  stickerCode: null,
}

const sections = {
  overdue: [],
  today: [task],
  tomorrow: [],
  next7Days: [],
  later: [],
  someday: [],
  recentDone: [{ ...task, taskId: 2, title: '완료한 보고서', status: 'DONE', completedAt: new Date().toISOString() }],
}

describe('TaskListCard', () => {
  it('선택 탭과 완료 영역의 상태를 접근 가능하게 노출한다', () => {
    render(
      <MemoryRouter>
        <TaskListCard sections={sections} onToggle={vi.fn()} onEdit={vi.fn()} onStickerChange={vi.fn()} />
      </MemoryRouter>,
    )

    const today = screen.getByRole('button', { name: '오늘', exact: true })
    const tomorrow = screen.getByRole('button', { name: '내일', exact: true })
    expect(today).toHaveClass('btn-refined', 'btn-refined-selected')
    expect(today).toHaveAttribute('aria-pressed', 'true')
    expect(tomorrow).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(tomorrow)
    expect(today).toHaveAttribute('aria-pressed', 'false')
    expect(tomorrow).toHaveAttribute('aria-pressed', 'true')

    const completed = screen.getByRole('button', { name: /오늘 완료한 일/ })
    expect(completed).toHaveClass('btn-refined')
    expect(completed).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(completed)
    expect(completed).toHaveAttribute('aria-expanded', 'true')
    const cancelComplete = screen.getByRole('button', { name: '완료 취소' })
    expect(cancelComplete).toHaveAttribute('aria-pressed', 'true')
    expect(cancelComplete.firstElementChild).toHaveClass('h-5', 'w-5', 'bg-primary', 'text-on-accent')
  })

  it('할 일 완료·편집과 스티커 트리거를 44px 이상 조작 영역으로 유지한다', () => {
    const onToggle = vi.fn()
    const onEdit = vi.fn()
    render(
      <MemoryRouter>
        <TaskListCard sections={sections} onToggle={onToggle} onEdit={onEdit} onStickerChange={vi.fn()} />
      </MemoryRouter>,
    )

    const complete = screen.getByRole('button', { name: '완료 처리' })
    expect(complete).toHaveClass('btn-refined')
    fireEvent.click(complete)
    expect(onToggle.mock.calls[0][0]).toBe(task)

    const edit = screen.getByRole('button', { name: '수정' })
    expect(edit).toHaveClass('btn-refined')
    fireEvent.click(edit)
    expect(onEdit).toHaveBeenCalledWith(task)

    expect(screen.getByRole('button', { name: '스티커 붙이기' })).toHaveClass('btn-refined')
    expect(screen.getByText('해야 할 일 (1)').closest('.surface-refined')).toHaveClass('p-5')
  })
})
