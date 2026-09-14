/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import TaskBoardModal from './TaskBoardModal'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

afterEach(cleanup)

const first = {
  taskId: 1,
  title: '중요한 일',
  category: 'WORK',
  status: 'TODO',
  effectivePriority: 0.9,
  deadline: '2026-09-13T18:00:00',
}

const second = {
  taskId: 2,
  title: '급한 일',
  category: 'WORK',
  status: 'TODO',
  effectivePriority: 0.3,
  deadline: '2026-09-13T12:00:00',
}

function renderBoard(sections, handlers = {}) {
  const onClose = handlers.onClose || vi.fn()
  const onEditTask = handlers.onEditTask || vi.fn()
  const onToggleTask = handlers.onToggleTask || vi.fn()
  render(
    <TaskBoardModal
      sections={sections}
      onClose={onClose}
      onEditTask={onEditTask}
      onToggleTask={onToggleTask}
    />,
  )
  return { onClose, onEditTask, onToggleTask }
}

function titlesMatching(pattern) {
  return screen.getAllByText(pattern).map((node) => node.textContent)
}

describe('TaskBoardModal', () => {
  it('실제 Dialog 안에서 중요도순과 마감순을 전환하고 선택 상태를 노출한다', () => {
    renderBoard({ today: [second, first] })

    expect(screen.getByRole('dialog', { name: '할 일 크게 보기' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '할 일 정렬' })).toBeInTheDocument()
    expect(titlesMatching(/^(중요한 일|급한 일)$/)).toEqual(['중요한 일', '급한 일'])

    fireEvent.click(screen.getByRole('button', { name: '마감순' }))

    expect(titlesMatching(/^(중요한 일|급한 일)$/)).toEqual(['급한 일', '중요한 일'])
    expect(screen.getByRole('button', { name: '마감순' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '중요도순' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '마감순' })).toHaveClass('btn-refined-underline')
    expect(screen.getByRole('button', { name: '마감순' })).not.toHaveClass('btn-refined-selected')
  })

  it('마감순에서 마감 없음은 뒤로 보내고 기한 초과는 항상 마감순이며 입력 배열을 바꾸지 않는다', () => {
    const noDeadline = { ...first, taskId: 3, title: '마감 없는 일', effectivePriority: 1, deadline: null }
    const overdueLater = { ...first, taskId: 4, title: '늦게 지난 일', deadline: '2026-09-12T18:00:00' }
    const overdueEarlier = { ...second, taskId: 5, title: '먼저 지난 일', deadline: '2026-09-12T09:00:00' }
    const today = [noDeadline, first, second]
    const overdue = [overdueLater, overdueEarlier]
    const todayOrder = today.map((task) => task.taskId)
    const overdueOrder = overdue.map((task) => task.taskId)

    renderBoard({ today, overdue })

    const overdueSection = screen.getByRole('heading', { name: '마감 지남' }).closest('section')
    expect(within(overdueSection).getAllByText(/^(먼저 지난 일|늦게 지난 일)$/).map((node) => node.textContent))
      .toEqual(['먼저 지난 일', '늦게 지난 일'])

    fireEvent.click(screen.getByRole('button', { name: '마감순' }))

    expect(titlesMatching(/^(급한 일|중요한 일|마감 없는 일)$/))
      .toEqual(['급한 일', '중요한 일', '마감 없는 일'])
    expect(today.map((task) => task.taskId)).toEqual(todayOrder)
    expect(overdue.map((task) => task.taskId)).toEqual(overdueOrder)
  })

  it('닫기·편집·완료 조작을 기존 콜백 계약으로 전달한다', () => {
    const handlers = renderBoard({ today: [first] })

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    fireEvent.click(screen.getByText('중요한 일').closest('button'))
    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    expect(handlers.onClose).toHaveBeenCalledTimes(1)
    expect(handlers.onEditTask).toHaveBeenCalledWith(first)
    expect(handlers.onToggleTask).toHaveBeenCalledWith(first)
  })
})
