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

const filterSections = {
  overdue: [{ ...task, taskId: 10, title: '기한 지난 일', deadline: '2026-09-12T09:00:00' }],
  today: [{ ...task, taskId: 11, title: '오늘 할 일', deadline: '2026-09-13T18:00:00' }],
  tomorrow: [{ ...task, taskId: 12, title: '내일 할 일', deadline: '2026-09-14T12:00:00' }],
  next7Days: [{ ...task, taskId: 13, title: '주중 할 일', deadline: '2026-09-16T12:00:00' }],
  later: [{ ...task, taskId: 14, title: '나중 할 일', deadline: '2026-09-30T12:00:00' }],
  someday: [{ ...task, taskId: 15, title: '언젠가 할 일' }],
  recentDone: [],
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
    expect(screen.getByRole('group', { name: '할 일 날짜 필터' })).toBeInTheDocument()
    expect(today).toHaveClass('btn-refined', 'btn-refined-underline')
    expect(today).not.toHaveClass('btn-refined-selected')
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

  it('다섯 날짜 필터가 기존 구간 합산과 기한 초과 상시 표시 규칙을 유지한다', () => {
    render(
      <MemoryRouter>
        <TaskListCard sections={filterSections} onToggle={vi.fn()} onEdit={vi.fn()} onStickerChange={vi.fn()} />
      </MemoryRouter>,
    )

    const expectVisibleTasks = (visible) => {
      for (const title of ['기한 지난 일', '오늘 할 일', '내일 할 일', '주중 할 일', '나중 할 일', '언젠가 할 일']) {
        expect(screen.queryByText(title) !== null).toBe(visible.includes(title))
      }
    }

    expectVisibleTasks(['기한 지난 일', '오늘 할 일'])

    fireEvent.click(screen.getByRole('button', { name: '내일', exact: true }))
    expectVisibleTasks(['기한 지난 일', '내일 할 일'])

    fireEvent.click(screen.getByRole('button', { name: '일주일', exact: true }))
    expectVisibleTasks(['기한 지난 일', '오늘 할 일', '내일 할 일', '주중 할 일'])

    fireEvent.click(screen.getByRole('button', { name: '언젠가', exact: true }))
    expectVisibleTasks(['기한 지난 일', '언젠가 할 일'])

    fireEvent.click(screen.getByRole('button', { name: '전부', exact: true }))
    expectVisibleTasks(['기한 지난 일', '오늘 할 일', '내일 할 일', '주중 할 일', '나중 할 일', '언젠가 할 일'])
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
